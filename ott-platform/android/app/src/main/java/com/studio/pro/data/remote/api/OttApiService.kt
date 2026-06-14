package com.studio.pro.data.remote.api

import com.studio.pro.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface OttApiService {

    // ─── Auth ─────────────────────────────────────────────────

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthResponseDto>>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponseDto>>

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): Response<ApiResponse<TokensDto>>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    @GET("auth/me")
    suspend fun getMe(): Response<ApiResponse<UserDto>>

    // ─── Content ──────────────────────────────────────────────

    @GET("movies")
    suspend fun getMovies(
        @Query("page")    page:    Int  = 1,
        @Query("limit")   limit:   Int  = 20,
        @Query("search")  search:  String? = null,
        @Query("genreId") genreId: Int? = null,
    ): Response<ApiResponse<List<ContentDto>>>

    @GET("movies/{id}")
    suspend fun getMovie(@Path("id") id: String): Response<ApiResponse<ContentDto>>

    @GET("series")
    suspend fun getSeries(
        @Query("page")    page:    Int  = 1,
        @Query("limit")   limit:   Int  = 20,
        @Query("genreId") genreId: Int? = null,
    ): Response<ApiResponse<List<ContentDto>>>

    @GET("series/{id}")
    suspend fun getSeriesDetail(@Path("id") id: String): Response<ApiResponse<ContentDto>>

    @GET("episodes/{id}")
    suspend fun getEpisode(@Path("id") id: String): Response<ApiResponse<EpisodeDto>>

    @GET("home/feed")
    suspend fun getHomeFeed(): Response<ApiResponse<List<HomeSectionDto>>>

    @GET("home/trending")
    suspend fun getTrending(): Response<ApiResponse<List<ContentDto>>>

    @GET("home/featured")
    suspend fun getFeatured(): Response<ApiResponse<List<ContentDto>>>

    @GET("home/recent")
    suspend fun getRecentlyAdded(): Response<ApiResponse<List<ContentDto>>>

    @GET("genres")
    suspend fun getGenres(): Response<ApiResponse<List<GenreDto>>>

    @GET("genres/{id}/content")
    suspend fun getContentByGenre(
        @Path("id")    genreId: Int,
        @Query("limit") limit:  Int = 20,
    ): Response<ApiResponse<List<ContentDto>>>

    // ─── Search ───────────────────────────────────────────────

    @GET("search")
    suspend fun search(
        @Query("q")     query:   String,
        @Query("type")  type:    String? = null,
        @Query("page")  page:    Int = 1,
        @Query("limit") limit:   Int = 20,
    ): Response<ApiResponse<List<ContentDto>>>

    // ─── Streaming ────────────────────────────────────────────

    @GET("stream/content/{id}/master.m3u8")
    suspend fun getMovieStream(@Path("id") contentId: String): Response<String>

    @GET("stream/episodes/{id}/master.m3u8")
    suspend fun getEpisodeStream(@Path("id") episodeId: String): Response<String>

    @GET("stream/content/{id}/info")
    suspend fun getStreamInfo(@Path("id") contentId: String): Response<ApiResponse<StreamInfoDto>>

    @GET("stream/episodes/{id}/info")
    suspend fun getEpisodeStreamInfo(@Path("id") episodeId: String): Response<ApiResponse<StreamInfoDto>>

    // ─── Watch History ────────────────────────────────────────

    @POST("content/{id}/progress")
    suspend fun updateProgress(
        @Path("id") contentId: String,
        @Body request: WatchProgressRequest,
    ): Response<Unit>

    @GET("me/continue-watching")
    suspend fun getContinueWatching(): Response<ApiResponse<List<WatchHistoryDto>>>

    @GET("me/watch-history")
    suspend fun getWatchHistory(
        @Query("page")  page:  Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<ApiResponse<List<WatchHistoryDto>>>

    @POST("me/watchlist/{contentId}")
    suspend fun addToWatchlist(@Path("contentId") contentId: String): Response<Unit>

    @DELETE("me/watchlist/{contentId}")
    suspend fun removeFromWatchlist(@Path("contentId") contentId: String): Response<Unit>

    @GET("me/watchlist")
    suspend fun getWatchlist(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<ApiResponse<List<ContentDto>>>

    // ─── User ─────────────────────────────────────────────────

    @PUT("users/me")
    suspend fun updateProfile(@Body body: Map<String, String>): Response<ApiResponse<UserDto>>

    @GET("users/me/devices")
    suspend fun getDevices(): Response<ApiResponse<List<Map<String, Any>>>>

    @DELETE("users/me/devices/{deviceId}")
    suspend fun revokeDevice(@Path("deviceId") deviceId: String): Response<Unit>

    // ─── Subscriptions ────────────────────────────────────────

    @GET("subscriptions/plans")
    suspend fun getSubscriptionPlans(): Response<ApiResponse<List<SubscriptionPlanDto>>>

    @POST("payment/create-order")
    suspend fun createOrder(
        @Body body: Map<String, Any>,
    ): Response<ApiResponse<CreateOrderResponse>>

    @POST("payment/verify")
    suspend fun verifyPayment(@Body body: Map<String, String>): Response<ApiResponse<Unit>>
}
