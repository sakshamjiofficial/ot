package com.studio.pro.data.repository

import com.studio.pro.data.local.TokenStorage
import com.studio.pro.data.local.database.WatchProgressDao
import com.studio.pro.data.local.database.WatchProgressEntity
import com.studio.pro.data.remote.api.OttApiService
import com.studio.pro.data.remote.dto.WatchProgressRequest
import com.studio.pro.domain.model.*
import com.studio.pro.domain.repository.*
import kotlinx.coroutines.flow.*
import timber.log.Timber
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchRepositoryImpl @Inject constructor(
    private val api:              OttApiService,
    private val watchProgressDao: WatchProgressDao,
    private val tokenStorage:     TokenStorage,
) : WatchRepository {

    override suspend fun updateProgress(
        contentId: String, watchedSeconds: Int, totalSeconds: Int?, episodeId: String?,
    ): Resource<Unit> {
        val id = episodeId ?: contentId
        val completed = totalSeconds != null && watchedSeconds >= totalSeconds * 0.9

        watchProgressDao.upsert(WatchProgressEntity(
            id = id, contentId = contentId, episodeId = episodeId,
            watchedSeconds = watchedSeconds, totalSeconds = totalSeconds,
            completed = completed, syncedAt = null,
        ))

        return try {
            api.updateProgress(contentId, WatchProgressRequest(watchedSeconds, totalSeconds, episodeId, null))
            watchProgressDao.markSynced(id)
            Resource.Success(Unit)
        } catch (e: Exception) {
            Timber.w(e, "Progress sync deferred")
            Resource.Success(Unit)  // Saved locally — will sync later
        }
    }

    override fun getContinueWatching(): Flow<List<WatchProgress>> =
        watchProgressDao.getContinueWatching().map { entities ->
            entities.map { entity ->
                WatchProgress(
                    contentId = entity.contentId, episodeId = entity.episodeId,
                    watchedSeconds = entity.watchedSeconds, totalSeconds = entity.totalSeconds,
                    completed = entity.completed, content = null, episode = null,
                )
            }
        }

    override fun getWatchHistory(page: Int): Flow<Resource<List<WatchProgress>>> = flow {
        emit(Resource.Loading)
        try {
            val response = api.getWatchHistory(page)
            if (response.isSuccessful) {
                val items = response.body()?.data?.map { dto ->
                    WatchProgress(
                        contentId = dto.contentId, episodeId = dto.episodeId,
                        watchedSeconds = dto.watchedSeconds, totalSeconds = dto.totalSeconds,
                        completed = dto.completed, content = dto.content?.toDomain(), episode = dto.episode?.toDomain(),
                    )
                } ?: emptyList()
                emit(Resource.Success(items))
            } else {
                emit(Resource.Error("Failed to load history", response.code()))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Network error"))
        }
    }

    override suspend fun getLocalProgress(id: String): WatchProgress? =
        watchProgressDao.getById(id)?.let { entity ->
            WatchProgress(entity.contentId, entity.episodeId, entity.watchedSeconds, entity.totalSeconds, entity.completed, null, null)
        }

    override suspend fun syncPendingProgress() {
        val pending = watchProgressDao.getUnsynced()
        pending.forEach { entity ->
            try {
                entity.contentId?.let { cid ->
                    api.updateProgress(cid, WatchProgressRequest(entity.watchedSeconds, entity.totalSeconds, entity.episodeId, null))
                    watchProgressDao.markSynced(entity.id)
                }
            } catch (e: Exception) {
                Timber.w(e, "Sync failed for ${entity.id}")
            }
        }
    }

    override suspend fun addToWatchlist(contentId: String): Resource<Unit> = try {
        api.addToWatchlist(contentId)
        Resource.Success(Unit)
    } catch (e: Exception) { Resource.Error(e.message ?: "Network error") }

    override suspend fun removeFromWatchlist(contentId: String): Resource<Unit> = try {
        api.removeFromWatchlist(contentId)
        Resource.Success(Unit)
    } catch (e: Exception) { Resource.Error(e.message ?: "Network error") }

    override fun getWatchlist(page: Int): Flow<Resource<List<Content>>> = flow {
        emit(Resource.Loading)
        try {
            val response = api.getWatchlist(page)
            if (response.isSuccessful) {
                emit(Resource.Success(response.body()?.data?.map { it.toDomain() } ?: emptyList()))
            } else {
                emit(Resource.Error("Failed to load watchlist", response.code()))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Network error"))
        }
    }
}
