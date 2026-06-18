package com.studio.pro.download

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.FileDataSource
import androidx.media3.datasource.cache.CacheDataSink
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.NoOpCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.hls.offline.HlsDownloader
import com.studio.pro.data.local.database.DownloadedAssetDao
import com.studio.pro.data.local.database.DownloadedAssetEntity
import com.studio.pro.domain.model.Subtitle
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

@UnstableApi
@Singleton
class DownloadManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val downloadedAssetDao: DownloadedAssetDao
) {
    private val databaseProvider = StandaloneDatabaseProvider(context)
    private val cacheDir = File(context.filesDir, "downloads_cache")

    // Concurrent map to keep track of active download jobs
    private val activeDownloads = ConcurrentHashMap<String, HlsDownloader>()

    // Media3 SimpleCache instance
    val downloadCache: SimpleCache by lazy {
        SimpleCache(
            cacheDir,
            NoOpCacheEvictor(),
            databaseProvider
        )
    }

    // Upstream datasource factory
    private val upstreamDataSourceFactory = DefaultHttpDataSource.Factory()

    // Cache datasource factory for playback
    fun getCacheDataSourceFactory(): CacheDataSource.Factory {
        return CacheDataSource.Factory()
            .setCache(downloadCache)
            .setUpstreamDataSourceFactory(upstreamDataSourceFactory)
            .setCacheReadDataSourceFactory(FileDataSource.Factory())
            .setCacheWriteDataSinkFactory(CacheDataSink.Factory().setCache(downloadCache))
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }

    // Local signed URL security check
    fun verifySignedUrlLocally(url: String): Boolean {
        val uri = Uri.parse(url)
        val expires = uri.getQueryParameter("expires")?.toLongOrNull() ?: return false
        val now = System.currentTimeMillis() / 1000
        return now <= expires
    }

    // Check if an asset is fully completed and downloaded
    suspend fun isAssetDownloaded(id: String): Boolean {
        val asset = downloadedAssetDao.getById(id)
        return asset?.downloadState == "COMPLETED"
    }

    // Get track of downloads flow
    fun getAllDownloads(): Flow<List<DownloadedAssetEntity>> = downloadedAssetDao.getAll()

    // Add or start download task
    suspend fun queueDownload(
        id: String,
        contentId: String?,
        episodeId: String?,
        title: String,
        url: String,
        quality: String
    ) {
        if (!verifySignedUrlLocally(url)) {
            throw SecurityException("Cannot download content. The signed URL has expired.")
        }

        val entity = DownloadedAssetEntity(
            id = id,
            contentId = contentId,
            episodeId = episodeId,
            title = title,
            localUri = null,
            r2Key = url,
            downloadState = "PENDING",
            progress = 0f,
            quality = quality
        )
        downloadedAssetDao.upsert(entity)

        // Start background download service
        OttDownloadService.start(context, id)
    }

    // Actual execution flow of the download (invoked from service thread)
    suspend fun executeDownload(id: String, onProgress: (Float) -> Unit) {
        val asset = downloadedAssetDao.getById(id) ?: return
        if (asset.downloadState == "COMPLETED") return

        val mediaItem = MediaItem.Builder()
            .setUri(asset.r2Key)
            .build()

        val hlsDownloader = HlsDownloader(mediaItem, getCacheDataSourceFactory())
        activeDownloads[id] = hlsDownloader

        try {
            downloadedAssetDao.updateProgress(id, "DOWNLOADING", 0f, 0L)
            
            withContext(Dispatchers.IO) {
                hlsDownloader.download { contentLength, bytesDownloaded, percentDownloaded ->
                    CoroutineScope(Dispatchers.IO).launch {
                        downloadedAssetDao.updateProgress(
                            id = id,
                            state = "DOWNLOADING",
                            progress = percentDownloaded,
                            sizeBytes = bytesDownloaded
                        )
                    }
                    onProgress(percentDownloaded)
                }
            }

            // Mark completed
            downloadedAssetDao.markCompleted(id, asset.r2Key)
            activeDownloads.remove(id)
        } catch (e: Exception) {
            activeDownloads.remove(id)
            if (e is InterruptedException) {
                downloadedAssetDao.updateProgress(id, "CANCELLED", asset.progress, asset.fileSizeBytes)
            } else {
                downloadedAssetDao.updateProgress(id, "FAILED", asset.progress, asset.fileSizeBytes)
                throw e
            }
        }
    }

    // Cancel an active download task
    suspend fun cancelDownload(id: String) {
        activeDownloads[id]?.cancel()
        activeDownloads.remove(id)
        val asset = downloadedAssetDao.getById(id)
        if (asset != null && asset.downloadState != "COMPLETED") {
            downloadedAssetDao.updateProgress(id, "CANCELLED", asset.progress, asset.fileSizeBytes)
        }
    }

    // Delete a downloaded asset completely
    suspend fun deleteDownload(id: String) {
        cancelDownload(id)
        val asset = downloadedAssetDao.getById(id) ?: return
        withContext(Dispatchers.IO) {
            try {
                val mediaItem = MediaItem.Builder().setUri(asset.r2Key).build()
                val hlsDownloader = HlsDownloader(mediaItem, getCacheDataSourceFactory())
                hlsDownloader.remove()
            } catch (e: IOException) {
                // Ignore removal errors
            }
            downloadedAssetDao.deleteById(id)
        }
    }
}
