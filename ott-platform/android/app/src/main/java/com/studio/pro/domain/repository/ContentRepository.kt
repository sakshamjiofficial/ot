package com.studio.pro.domain.repository

import com.studio.pro.domain.model.*
import kotlinx.coroutines.flow.Flow

// ─── Resource wrapper ──────────────────────────────────────────

sealed class Resource<out T> {
    data class Success<T>(val data: T)                       : Resource<T>()
    data class Error(val message: String, val code: Int = 0) : Resource<Nothing>()
    object Loading                                           : Resource<Nothing>()
}

// ─── Repository interfaces ─────────────────────────────────────

interface AuthRepository {
    suspend fun login(email: String, password: String): Resource<User>
    suspend fun register(email: String, password: String, displayName: String?): Resource<User>
    suspend fun logout(): Resource<Unit>
    suspend fun refreshToken(): Resource<Unit>
    fun isLoggedIn(): Flow<Boolean>
    suspend fun getCurrentUser(): User?
    suspend fun updateFcmToken(token: String): Resource<Unit>
    suspend fun updateProfile(displayName: String?, avatarUrl: String?): Resource<User>
    suspend fun getDefaultAvatars(): Resource<List<String>>
}

interface ContentRepository {
    fun getMovies(page: Int = 1, search: String? = null, genreId: Int? = null): Flow<Resource<List<Content>>>
    fun getSeries(page: Int = 1, genreId: Int? = null): Flow<Resource<List<Content>>>
    suspend fun getContentById(id: String): Resource<Content>
    fun getTrending(): Flow<Resource<List<Content>>>
    fun getFeatured(): Flow<Resource<List<Content>>>
    fun getRecentlyAdded(): Flow<Resource<List<Content>>>
    fun getGenres(): Flow<Resource<List<Genre>>>
    fun getContentByGenre(genreId: Int): Flow<Resource<List<Content>>>
    fun search(query: String): Flow<Resource<List<Content>>>
    fun getHomeFeed(): Flow<Resource<List<HomeSection>>>
}

interface StreamRepository {
    suspend fun getStreamUrl(contentId: String, episodeId: String? = null): Resource<String>
    suspend fun getStreamSession(contentId: String, episodeId: String? = null): Resource<StreamSession>
}

interface WatchRepository {
    suspend fun updateProgress(contentId: String, watchedSeconds: Int, totalSeconds: Int?, episodeId: String?): Resource<Unit>
    fun getContinueWatching(): Flow<List<WatchProgress>>
    fun getWatchHistory(page: Int = 1): Flow<Resource<List<WatchProgress>>>
    suspend fun getLocalProgress(id: String): WatchProgress?
    suspend fun syncPendingProgress()
    suspend fun addToWatchlist(contentId: String): Resource<Unit>
    suspend fun removeFromWatchlist(contentId: String): Resource<Unit>
    fun getWatchlist(page: Int = 1): Flow<Resource<List<Content>>>
}

interface SubscriptionRepository {
    fun getPlans(): Flow<Resource<List<SubscriptionPlan>>>
    suspend fun createOrder(planId: Int): Resource<Triple<String, Int, String>>  // orderId, amount, keyId
    suspend fun verifyPayment(orderId: String, paymentId: String, signature: String): Resource<Unit>
}
