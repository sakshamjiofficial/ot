package com.studio.pro.download

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.media3.common.util.UnstableApi
import com.studio.pro.data.local.database.DownloadedAssetDao
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import timber.log.Timber
import javax.inject.Inject

@UnstableApi
@AndroidEntryPoint
class OttDownloadService : Service() {

    @Inject
    lateinit var downloadManager: DownloadManager

    @Inject
    lateinit var downloadedAssetDao: DownloadedAssetDao

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val activeJobs = mutableMapOf<String, Job>()

    companion object {
        private const val NOTIFICATION_ID = 2001
        private const val CHANNEL_ID = "downloads_channel"
        private const val CHANNEL_NAME = "Video Downloads"
        private const val EXTRA_ASSET_ID = "extra_asset_id"

        fun start(context: Context, assetId: String) {
            val intent = Intent(context, OttDownloadService::class.java).apply {
                putExtra(EXTRA_ASSET_ID, assetId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification("Initializing download...", 0))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val assetId = intent?.getStringExtra(EXTRA_ASSET_ID)
        if (assetId != null) {
            startDownloadJob(assetId)
        }
        return START_NOT_STICKY
    }

    private fun startDownloadJob(assetId: String) {
        if (activeJobs.containsKey(assetId)) return

        val job = serviceScope.launch {
            try {
                val asset = downloadedAssetDao.getById(assetId)
                val title = asset?.title ?: "Video File"
                
                downloadManager.executeDownload(assetId) { progress ->
                    updateNotification("Downloading: $title", progress.toInt())
                }
                
                Timber.d("Download finished successfully: $assetId")
            } catch (e: Exception) {
                Timber.e(e, "Download job failed for: $assetId")
            } finally {
                activeJobs.remove(assetId)
                checkServiceShutdown()
            }
        }
        activeJobs[assetId] = job
    }

    private fun checkServiceShutdown() {
        if (activeJobs.isEmpty()) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun updateNotification(title: String, progress: Int) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, createNotification(title, progress))
    }

    private fun createNotification(title: String, progress: Int): Notification {
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(if (progress >= 100) "Download complete" else "$progress% completed")
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)

        if (progress in 0..99) {
            builder.setProgress(100, progress, false)
        } else {
            builder.setProgress(0, 0, false)
        }

        return builder.build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows progress of active video downloads"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
