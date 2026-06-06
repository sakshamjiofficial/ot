package com.ott.app.data.repository

import com.ott.app.BuildConfig
import com.ott.app.data.local.database.*
import com.ott.app.data.remote.api.OttApiService
import com.ott.app.data.remote.dto.*
import com.ott.app.domain.model.*
import com.ott.app.domain.repository.*
import kotlinx.coroutines.flow.*
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContentRepositoryImpl @Inject constructor(
    private val api:        OttApiService,
    private val contentDao: ContentDao,
) : ContentRepository {

    // ─── Movies ───────────────────────────────────────────────

    override fun getMovies(page: Int, search: String?, genreId: Int?): Flow<Resource<List<Content>>> =
        networkBoundFlow(
            localQuery  = { contentDao.getByType("movie") },
            remoteFetch = { api.getMovies(page, 20, search, genreId) },
            saveToLocal = { items -> contentDao.upsertAll(items.map { it.toCacheEntity() }) },
            mapLocal    = { entities -> entities.map { it.toDomain() } },
            mapRemote   = { dtos -> dtos.map { it.toDomain() } },
        )

    // ─── Series ───────────────────────────────────────────────

    override fun getSeries(page: Int, genreId: Int?): Flow<Resource<List<Content>>> =
        networkBoundFlow(
            localQuery  = { contentDao.getByType("series") },
            remoteFetch = { api.getSeries(page, 20, genreId) },
            saveToLocal = { items -> contentDao.upsertAll(items.map { it.toCacheEntity() }) },
            mapLocal    = { entities -> entities.map { it.toDomain() } },
            mapRemote   = { dtos -> dtos.map { it.toDomain() } },
        )

    // ─── Single content ───────────────────────────────────────

    override suspend fun getContentById(id: String): Resource<Content> {
        return try {
            val response = api.getMovie(id).let { r ->
                if (r.isSuccessful) r
                else api.getSeriesDetail(id)
            }
            if (response.isSuccessful && response.body()?.success == true) {
                val dto = response.body()!!.data!!
                contentDao.upsert(dto.toCacheEntity())
                Resource.Success(dto.toDomain())
            } else {
                // Fallback to cache
                contentDao.getById(id)?.toDomain()?.let { Resource.Success(it) }
                    ?: Resource.Error("Content not found", 404)
            }
        } catch (e: Exception) {
            Timber.e(e, "getContentById: $id")
            contentDao.getById(id)?.toDomain()?.let { Resource.Success(it) }
                ?: Resource.Error(e.message ?: "Network error")
        }
    }

    // ─── Home feeds ───────────────────────────────────────────

    override fun getTrending(): Flow<Resource<List<Content>>> =
        networkBoundFlow(
            localQuery  = { contentDao.getTrending() },
            remoteFetch = { api.getTrending() },
            saveToLocal = { items -> contentDao.upsertAll(items.map { it.toCacheEntity() }) },
            mapLocal    = { entities -> entities.map { it.toDomain() } },
            mapRemote   = { dtos -> dtos.map { it.toDomain() } },
        )

    override fun getFeatured(): Flow<Resource<List<Content>>> =
        networkBoundFlow(
            localQuery  = { contentDao.getFeatured() },
            remoteFetch = { api.getFeatured() },
            saveToLocal = { items -> contentDao.upsertAll(items.map { it.toCacheEntity() }) },
            mapLocal    = { entities -> entities.map { it.toDomain() } },
            mapRemote   = { dtos -> dtos.map { it.toDomain() } },
        )

    override fun getRecentlyAdded(): Flow<Resource<List<Content>>> =
        flow {
            emit(Resource.Loading)
            try {
                val response = api.getRecentlyAdded()
                if (response.isSuccessful) {
                    val items = response.body()?.data ?: emptyList()
                    contentDao.upsertAll(items.map { it.toCacheEntity() })
                    emit(Resource.Success(items.map { it.toDomain() }))
                } else {
                    emit(Resource.Error("Failed to load content", response.code()))
                }
            } catch (e: Exception) {
                emit(Resource.Error(e.message ?: "Network error"))
            }
        }

    // ─── Genres ───────────────────────────────────────────────

    override fun getGenres(): Flow<Resource<List<Genre>>> =
        flow {
            emit(Resource.Loading)
            try {
                val response = api.getGenres()
                if (response.isSuccessful) {
                    emit(Resource.Success(response.body()?.data?.map { it.toDomain() } ?: emptyList()))
                } else {
                    emit(Resource.Error("Failed to load genres"))
                }
            } catch (e: Exception) {
                emit(Resource.Error(e.message ?: "Network error"))
            }
        }

    override fun getContentByGenre(genreId: Int): Flow<Resource<List<Content>>> =
        flow {
            emit(Resource.Loading)
            try {
                val response = api.getContentByGenre(genreId)
                if (response.isSuccessful) {
                    val items = response.body()?.data ?: emptyList()
                    emit(Resource.Success(items.map { it.toDomain() }))
                } else {
                    emit(Resource.Error("Failed to load genre content"))
                }
            } catch (e: Exception) {
                emit(Resource.Error(e.message ?: "Network error"))
            }
        }

    // ─── Search ───────────────────────────────────────────────

    override fun search(query: String): Flow<Resource<List<Content>>> =
        flow {
            emit(Resource.Loading)
            if (query.isBlank()) {
                emit(Resource.Success(emptyList()))
                return@flow
            }
            try {
                val response = api.search(query)
                if (response.isSuccessful) {
                    emit(Resource.Success(response.body()?.data?.map { it.toDomain() } ?: emptyList()))
                } else {
                    // Fallback to local search
                    contentDao.search(query).first().let {
                        emit(Resource.Success(it.map { entity -> entity.toDomain() }))
                    }
                }
            } catch (e: Exception) {
                contentDao.search(query).first().let {
                    emit(Resource.Success(it.map { entity -> entity.toDomain() }))
                }
            }
        }

    // ─── Generic network-bound flow ───────────────────────────

    private fun <L, R, D> networkBoundFlow(
        localQuery:  () -> Flow<List<L>>,
        remoteFetch: suspend () -> retrofit2.Response<ApiResponse<List<R>>>,
        saveToLocal: suspend (List<R>) -> Unit,
        mapLocal:    (List<L>) -> List<D>,
        mapRemote:   (List<R>) -> List<D>,
    ): Flow<Resource<List<D>>> = flow {
        emit(Resource.Loading)

        // Emit cached data immediately
        localQuery().first().let { cached ->
            if (cached.isNotEmpty()) emit(Resource.Success(mapLocal(cached)))
        }

        // Fetch from network
        try {
            val response = remoteFetch()
            if (response.isSuccessful && response.body()?.success == true) {
                val remoteData = response.body()!!.data ?: emptyList()
                saveToLocal(remoteData)
                emit(Resource.Success(mapRemote(remoteData)))
            } else {
                // If cache was empty and network fails, emit error
                val cached = localQuery().first()
                if (cached.isEmpty()) {
                    emit(Resource.Error("Failed to load content", response.code()))
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Network fetch failed")
            val cached = localQuery().first()
            if (cached.isEmpty()) {
                emit(Resource.Error(e.message ?: "Network error"))
            }
        }
    }
}

// ─── Mappers ──────────────────────────────────────────────────

fun ContentDto.toDomain(): Content = Content(
    id               = id,
    type             = if (type == "movie") ContentType.MOVIE else ContentType.SERIES,
    title            = title,
    slug             = slug,
    description      = description,
    shortDescription = shortDescription,
    language         = language,
    releaseYear      = releaseYear,
    durationSeconds  = durationSeconds,
    ageRating        = ageRating,
    status           = status,
    isPremium        = isPremium,
    isFeatured       = isFeatured,
    isTrending       = isTrending,
    imdbRating       = imdbRating,
    trailerUrl       = trailerUrl,
    posterUrl        = formatImageUrl(posterUrl),
    bannerUrl        = formatImageUrl(bannerUrl),
    thumbnailUrl     = formatImageUrl(thumbnailUrl),
    totalPlays       = totalPlays,
    genres           = genres.map { Genre(it.id, it.name, it.slug) },
    seasons          = seasons?.map { it.toDomain() } ?: emptyList(),
    videoAssets      = videoAssets?.map { it.toDomain() } ?: emptyList(),
    publishedAt      = publishedAt,
    createdAt        = createdAt,
)

fun SeasonDto.toDomain(): Season = Season(
    id           = id,
    seasonNumber = seasonNumber,
    title        = title,
    totalEpisodes = totalEpisodes,
    episodes     = episodes?.map { it.toDomain() } ?: emptyList(),
)

fun EpisodeDto.toDomain(): Episode = Episode(
    id              = id,
    episodeNumber   = episodeNumber,
    title           = title,
    description     = description,
    durationSeconds = durationSeconds,
    thumbnailUrl    = formatImageUrl(thumbnailUrl),
    isPremium       = isPremium,
    introStartSec   = introStartSec,
    introEndSec     = introEndSec,
    masterUrl       = videoAssets?.firstOrNull()?.masterUrl,
    renditions      = videoAssets?.firstOrNull()?.renditions?.map { it.toDomain() } ?: emptyList(),
    subtitles       = videoAssets?.firstOrNull()?.subtitles?.map { it.toDomain() } ?: emptyList(),
    audioTracks     = videoAssets?.firstOrNull()?.audioTracks?.map { it.toDomain() } ?: emptyList(),
)

fun VideoAssetDto.toDomain(): VideoAsset = VideoAsset(
    id              = id,
    masterUrl       = masterUrl,
    durationSeconds = durationSeconds,
    renditions      = renditions?.map { it.toDomain() } ?: emptyList(),
    subtitles       = subtitles?.map { it.toDomain() } ?: emptyList(),
    audioTracks     = audioTracks?.map { it.toDomain() } ?: emptyList(),
)

fun RenditionDto.toDomain()   = Rendition(id, resolution, bitrateKbps, playlistUrl)
fun SubtitleDto.toDomain()    = Subtitle(id, languageCode, languageName, vttUrl, isDefault)
fun AudioTrackDto.toDomain()  = AudioTrack(id, languageCode, languageName, isDefault)
fun GenreDto.toDomain()       = Genre(id, name, slug)

fun ContentDto.toCacheEntity() = CachedContentEntity(
    id               = id,
    type             = type,
    title            = title,
    slug             = slug,
    description      = description,
    shortDescription = shortDescription,
    language         = language,
    releaseYear      = releaseYear,
    durationSeconds  = durationSeconds,
    ageRating        = ageRating,
    status           = status,
    isPremium        = isPremium,
    isFeatured       = isFeatured,
    isTrending       = isTrending,
    imdbRating       = imdbRating,
    posterUrl        = formatImageUrl(posterUrl),
    bannerUrl        = formatImageUrl(bannerUrl),
    thumbnailUrl     = formatImageUrl(thumbnailUrl),
    totalPlays       = totalPlays,
    genreNames       = genres.joinToString(",") { it.name },
    masterUrl        = videoAssets?.firstOrNull()?.masterUrl,
)

fun CachedContentEntity.toDomain() = Content(
    id               = id,
    type             = if (type == "movie") ContentType.MOVIE else ContentType.SERIES,
    title            = title,
    slug             = slug,
    description      = description,
    shortDescription = shortDescription,
    language         = language,
    releaseYear      = releaseYear,
    durationSeconds  = durationSeconds,
    ageRating        = ageRating,
    status           = status,
    isPremium        = isPremium,
    isFeatured       = isFeatured,
    isTrending       = isTrending,
    imdbRating       = imdbRating,
    trailerUrl       = null,
    posterUrl        = formatImageUrl(posterUrl),
    bannerUrl        = formatImageUrl(bannerUrl),
    thumbnailUrl     = formatImageUrl(thumbnailUrl),
    totalPlays       = totalPlays,
    genres           = genreNames.split(",").filter { it.isNotBlank() }
        .mapIndexed { i, name -> Genre(i, name, name.lowercase()) },
    seasons          = emptyList(),
    videoAssets      = masterUrl?.let { url ->
        listOf(VideoAsset("cached", url, durationSeconds, emptyList(), emptyList(), emptyList()))
    } ?: emptyList(),
    publishedAt      = null,
    createdAt        = "",
)

// ─── Image URL Formatter ──────────────────────────────────────────

fun formatImageUrl(url: String?): String? {
    if (url.isNullOrEmpty()) return null

    val baseServerUrl = BuildConfig.API_BASE_URL
        .replace("/api/v1", "")
        .trimEnd('/')

    if (url.startsWith("http://") || url.startsWith("https://")) {
        if (url.contains("localhost") || url.contains("127.0.0.1")) {
            return try {
                val uri = java.net.URI(url)
                val path = uri.path.trimStart('/')
                val query = if (uri.query.isNullOrEmpty()) "" else "?${uri.query}"
                "$baseServerUrl/$path$query"
            } catch (e: Exception) {
                url
            }
        }
        return url
    }

    val cleanPath = url.trimStart('/')
    return "$baseServerUrl/$cleanPath"
}
