package com.studio.pro.data.repository

import com.studio.pro.data.local.database.WatchProgressDao
import com.studio.pro.data.remote.api.OttApiService
import com.studio.pro.domain.model.*
import com.studio.pro.domain.repository.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StreamRepositoryImpl @Inject constructor(
    private val api:             OttApiService,
    private val watchProgressDao: WatchProgressDao,
) : StreamRepository {

    override suspend fun getStreamUrl(contentId: String, episodeId: String?): Resource<String> = try {
        val response = if (episodeId != null) api.getEpisodeStream(episodeId)
                       else api.getMovieStream(contentId)
        if (response.isSuccessful && response.body() != null) {
            Resource.Success(response.body()!!)
        } else {
            Resource.Error("Failed to get stream URL", response.code())
        }
    } catch (e: Exception) {
        Resource.Error(e.message ?: "Network error")
    }

    override suspend fun getStreamSession(contentId: String, episodeId: String?): Resource<StreamSession> {
        return try {
            // Get stream info (subtitles, audio, renditions)
            val infoResponse = if (episodeId != null) api.getEpisodeStreamInfo(episodeId)
                               else api.getStreamInfo(contentId)

            if (!infoResponse.isSuccessful || infoResponse.body()?.data == null) {
                return Resource.Error("Failed to get stream info", infoResponse.code())
            }

            val info = infoResponse.body()!!.data!!

            // Get local resume position
            val progressId = episodeId ?: contentId
            val localProgress = watchProgressDao.getById(progressId)
            val resumeAt = if (localProgress != null && !localProgress.completed)
                localProgress.watchedSeconds.toLong() else 0L

            // Get content title
            val contentResponse = if (episodeId != null) api.getEpisode(episodeId)
                                  else api.getMovie(contentId)
            val title = when {
                episodeId != null -> contentResponse.body()?.data?.let {
                    (it as? com.studio.pro.data.remote.dto.EpisodeDto)?.title
                } ?: "Episode"
                else -> (contentResponse.body()?.data as? com.studio.pro.data.remote.dto.ContentDto)?.title ?: "Movie"
            }

            val realContentId = if (episodeId != null) {
                (contentResponse.body()?.data as? com.studio.pro.data.remote.dto.EpisodeDto)?.contentId ?: contentId
            } else {
                contentId
            }

            // Build stream session
            val session = StreamSession(
                contentId   = realContentId,
                episodeId   = episodeId,
                title       = title,
                masterUrl   = "${com.studio.pro.BuildConfig.API_BASE_URL}/${
                    if (episodeId != null) "stream/episodes/$episodeId/master.m3u8"
                    else "stream/content/$realContentId/master.m3u8"
                }",
                subtitles   = info.subtitles.map { Subtitle(it.id, it.languageCode, it.languageName, it.vttUrl, it.isDefault) },
                audioTracks = info.audioTracks.map { AudioTrack(it.id, it.languageCode, it.languageName, it.isDefault) },
                resumeAt    = resumeAt,
                introStart  = null,
                introEnd    = null,
                nextEpisode = null,    // Would require fetching next episode
            )

            Resource.Success(session)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Stream session error")
        }
    }
}
