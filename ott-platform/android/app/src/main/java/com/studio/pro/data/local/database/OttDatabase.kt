package com.studio.pro.data.local.database

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entities ──────────────────────────────────────────────────

@Entity(tableName = "cached_content")
data class CachedContentEntity(
    @PrimaryKey val id:               String,
    val type:             String,
    val title:            String,
    val slug:             String,
    val description:      String?,
    val shortDescription: String?,
    val language:         String,
    val releaseYear:      Int?,
    val durationSeconds:  Int?,
    val ageRating:        String?,
    val status:           String,
    val isPremium:        Boolean,
    val isFeatured:       Boolean,
    val isTrending:       Boolean,
    val imdbRating:       Double?,
    val posterUrl:        String?,
    val bannerUrl:        String?,
    val thumbnailUrl:     String?,
    val totalPlays:       Long,
    val genreNames:       String,    // comma-separated genre names
    val masterUrl:        String?,   // from first videoAsset
    val cachedAt:         Long = System.currentTimeMillis(),
)

@Entity(tableName = "watch_progress")
data class WatchProgressEntity(
    @PrimaryKey val id:             String,    // contentId or episodeId
    val contentId:      String?,
    val episodeId:      String?,
    val watchedSeconds: Int,
    val totalSeconds:   Int?,
    val completed:      Boolean,
    val lastWatchedAt:  Long = System.currentTimeMillis(),
    val syncedAt:       Long?,   // null = not yet synced to server
)

@Entity(tableName = "search_history")
data class SearchHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val query:     String,
    val searchedAt: Long = System.currentTimeMillis(),
)

// ─── DAOs ──────────────────────────────────────────────────────

@Dao
interface ContentDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<CachedContentEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: CachedContentEntity)

    @Query("SELECT * FROM cached_content WHERE type = :type ORDER BY totalPlays DESC LIMIT :limit")
    fun getByType(type: String, limit: Int = 50): Flow<List<CachedContentEntity>>

    @Query("SELECT * FROM cached_content WHERE id = :id")
    suspend fun getById(id: String): CachedContentEntity?

    @Query("SELECT * FROM cached_content WHERE isTrending = 1 ORDER BY totalPlays DESC LIMIT :limit")
    fun getTrending(limit: Int = 20): Flow<List<CachedContentEntity>>

    @Query("SELECT * FROM cached_content WHERE isFeatured = 1 ORDER BY cachedAt DESC LIMIT 10")
    fun getFeatured(): Flow<List<CachedContentEntity>>

    @Query("SELECT * FROM cached_content WHERE title LIKE '%' || :query || '%' ORDER BY totalPlays DESC")
    fun search(query: String): Flow<List<CachedContentEntity>>

    @Query("DELETE FROM cached_content WHERE cachedAt < :before")
    suspend fun deleteOlderThan(before: Long)

    @Query("DELETE FROM cached_content")
    suspend fun deleteAll()
}

@Dao
interface WatchProgressDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: WatchProgressEntity)

    @Query("SELECT * FROM watch_progress WHERE id = :id")
    suspend fun getById(id: String): WatchProgressEntity?

    @Query("SELECT * FROM watch_progress WHERE completed = 0 ORDER BY lastWatchedAt DESC LIMIT 20")
    fun getContinueWatching(): Flow<List<WatchProgressEntity>>

    @Query("SELECT * FROM watch_progress WHERE syncedAt IS NULL")
    suspend fun getUnsynced(): List<WatchProgressEntity>

    @Query("UPDATE watch_progress SET syncedAt = :time WHERE id = :id")
    suspend fun markSynced(id: String, time: Long = System.currentTimeMillis())

    @Query("DELETE FROM watch_progress WHERE lastWatchedAt < :before")
    suspend fun deleteOlderThan(before: Long)
}

@Dao
interface SearchHistoryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: SearchHistoryEntity)

    @Query("SELECT * FROM search_history ORDER BY searchedAt DESC LIMIT 10")
    fun getRecent(): Flow<List<SearchHistoryEntity>>

    @Query("DELETE FROM search_history WHERE id NOT IN (SELECT id FROM search_history ORDER BY searchedAt DESC LIMIT 10)")
    suspend fun trimToLatest()

    @Query("DELETE FROM search_history")
    suspend fun clearAll()
}

@Entity(tableName = "downloaded_assets")
data class DownloadedAssetEntity(
    @PrimaryKey val id: String, // MovieId or EpisodeId
    val contentId: String?,
    val episodeId: String?,
    val title: String,
    val localUri: String?,
    val r2Key: String,
    val downloadState: String, // PENDING, DOWNLOADING, COMPLETED, FAILED, CANCELLED
    val progress: Float,
    val fileSizeBytes: Long = 0L,
    val quality: String, // "Standard" | "HD"
    val downloadedAt: Long = System.currentTimeMillis()
)

@Dao
interface DownloadedAssetDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: DownloadedAssetEntity)

    @Query("SELECT * FROM downloaded_assets WHERE id = :id")
    suspend fun getById(id: String): DownloadedAssetEntity?

    @Query("SELECT * FROM downloaded_assets ORDER BY downloadedAt DESC")
    fun getAll(): Flow<List<DownloadedAssetEntity>>

    @Query("SELECT * FROM downloaded_assets WHERE downloadState = :state")
    suspend fun getByState(state: String): List<DownloadedAssetEntity>

    @Query("UPDATE downloaded_assets SET downloadState = :state, progress = :progress, fileSizeBytes = :sizeBytes WHERE id = :id")
    suspend fun updateProgress(id: String, state: String, progress: Float, sizeBytes: Long)

    @Query("UPDATE downloaded_assets SET localUri = :localUri, downloadState = :state WHERE id = :id")
    suspend fun markCompleted(id: String, localUri: String, state: String = "COMPLETED")

    @Query("DELETE FROM downloaded_assets WHERE id = :id")
    suspend fun deleteById(id: String)
}

// ─── Database ──────────────────────────────────────────────────

@Database(
    entities = [
        CachedContentEntity::class,
        WatchProgressEntity::class,
        SearchHistoryEntity::class,
        DownloadedAssetEntity::class,
    ],
    version  = 2,
    exportSchema = false,
)
abstract class OttDatabase : RoomDatabase() {
    abstract fun contentDao():      ContentDao
    abstract fun watchProgressDao(): WatchProgressDao
    abstract fun searchHistoryDao(): SearchHistoryDao
    abstract fun downloadedAssetDao(): DownloadedAssetDao

    companion object {
        const val DATABASE_NAME = "ott_db"
    }
}
