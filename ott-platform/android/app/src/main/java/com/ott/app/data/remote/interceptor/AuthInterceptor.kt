package com.ott.app.data.remote.interceptor

import com.ott.app.data.local.TokenStorage
import com.ott.app.data.remote.dto.RefreshRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Provider

/**
 * Attaches Bearer token to every request.
 * On 401, attempts silent refresh and retries once.
 * On refresh failure, broadcasts logout event.
 */
class AuthInterceptor @Inject constructor(
    private val tokenStorage: TokenStorage,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val accessToken = runBlocking { tokenStorage.getAccessToken() }

        val request = chain.request().withAuth(accessToken)
        val response = chain.proceed(request)

        // Not a 401 — pass through
        if (response.code != 401) return response

        // Attempt token refresh
        val refreshToken = runBlocking { tokenStorage.getRefreshToken() }
            ?: run {
                runBlocking { tokenStorage.clearTokens() }
                return response
            }

        response.close()

        return synchronized(this) {
            // Double-check another thread didn't already refresh
            val freshToken = runBlocking { tokenStorage.getAccessToken() }
            if (freshToken != null && freshToken != accessToken) {
                return@synchronized chain.proceed(chain.request().withAuth(freshToken))
            }

            // Perform refresh via a raw OkHttpClient (no interceptor loop)
            val newTokens = runBlocking {
                try {
                    refreshTokens(
                        baseUrl      = chain.request().url.newBuilder().encodedPath("/api/v1/").build().toString(),
                        refreshToken = refreshToken,
                    )
                } catch (e: Exception) {
                    Timber.w(e, "Token refresh failed")
                    null
                }
            }

            if (newTokens == null) {
                // Refresh failed — clear session
                runBlocking { tokenStorage.clearTokens() }
                chain.proceed(chain.request())   // Will 401 and caller handles
            } else {
                runBlocking {
                    tokenStorage.saveTokens(
                        accessToken  = newTokens.first,
                        refreshToken = newTokens.second,
                    )
                }
                chain.proceed(chain.request().withAuth(newTokens.first))
            }
        }
    }

    private suspend fun refreshTokens(
        baseUrl:      String,
        refreshToken: String,
    ): Pair<String, String>? {
        // Minimal Retrofit client — no auth interceptor to avoid recursion
        val client = OkHttpClient.Builder().build()
        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val api = retrofit.create(com.ott.app.data.remote.api.OttApiService::class.java)
        val response = api.refresh(RefreshRequest(refreshToken))

        return if (response.isSuccessful) {
            val tokens = response.body()?.data
            tokens?.let { Pair(it.accessToken, it.refreshToken) }
        } else null
    }

    private fun Request.withAuth(token: String?): Request {
        if (token == null) return this
        return newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
    }
}
