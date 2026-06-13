package com.studio.pro.data.repository

import com.studio.pro.data.local.TokenStorage
import com.studio.pro.data.remote.api.OttApiService
import com.studio.pro.data.remote.dto.LoginRequest
import com.studio.pro.data.remote.dto.RegisterRequest
import com.studio.pro.domain.model.User
import com.studio.pro.domain.repository.AuthRepository
import com.studio.pro.domain.repository.Resource
import kotlinx.coroutines.flow.Flow
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api:          OttApiService,
    private val tokenStorage: TokenStorage,
) : AuthRepository {

    override suspend fun login(email: String, password: String): Resource<User> {
        return try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!.data!!
                tokenStorage.saveTokens(body.tokens.accessToken, body.tokens.refreshToken)
                tokenStorage.saveUserInfo(
                    userId      = body.user.id,
                    email       = body.user.email,
                    role        = body.user.role,
                    displayName = body.user.displayName,
                )
                Resource.Success(body.user.toDomain())
            } else {
                val msg = parseErrorMessage(response.errorBody()?.string(), "Login failed")
                Resource.Error(msg, response.code())
            }
        } catch (e: Exception) {
            Timber.e(e, "Login error")
            Resource.Error(e.message ?: "Network error")
        }
    }

    override suspend fun register(
        email:       String,
        password:    String,
        displayName: String?,
    ): Resource<User> {
        return try {
            val response = api.register(RegisterRequest(email, password, displayName))
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!.data!!
                tokenStorage.saveTokens(body.tokens.accessToken, body.tokens.refreshToken)
                tokenStorage.saveUserInfo(
                    userId      = body.user.id,
                    email       = body.user.email,
                    role        = body.user.role,
                    displayName = body.user.displayName,
                )
                Resource.Success(body.user.toDomain())
            } else {
                val msg = parseErrorMessage(response.errorBody()?.string(), "Registration failed")
                Resource.Error(msg, response.code())
            }
        } catch (e: Exception) {
            Timber.e(e, "Register error")
            Resource.Error(e.message ?: "Network error")
        }
    }

    override suspend fun logout(): Resource<Unit> {
        return try {
            api.logout()   // Best-effort — don't fail on network error
            tokenStorage.clearTokens()
            Resource.Success(Unit)
        } catch (e: Exception) {
            tokenStorage.clearTokens()   // Always clear locally
            Resource.Success(Unit)
        }
    }

    override suspend fun refreshToken(): Resource<Unit> {
        val refreshToken = tokenStorage.getRefreshToken()
            ?: return Resource.Error("No refresh token")
        return try {
            val response = api.refresh(com.studio.pro.data.remote.dto.RefreshRequest(refreshToken))
            if (response.isSuccessful && response.body()?.success == true) {
                val tokens = response.body()!!.data!!
                tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken)
                Resource.Success(Unit)
            } else {
                tokenStorage.clearTokens()
                Resource.Error("Session expired", 401)
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Refresh failed")
        }
    }

    override fun isLoggedIn(): Flow<Boolean> = tokenStorage.isLoggedInFlow()

    override suspend fun getCurrentUser(): User? {
        return try {
            val response = api.getMe()
            response.body()?.data?.toDomain()
        } catch (e: Exception) {
            // Return cached user info from DataStore
            val id    = tokenStorage.getUserId()    ?: return null
            val email = tokenStorage.getUserEmail() ?: return null
            val role  = tokenStorage.getUserRole()  ?: "user"
            User(
                id          = id,
                email       = email,
                displayName = tokenStorage.getDisplayName(),
                avatarUrl   = null,
                role        = role,
                hasActiveSubscription = false,
            )
        }
    }

    override suspend fun updateFcmToken(token: String): Resource<Unit> {
        return try {
            val response = api.updateProfile(mapOf("fcmToken" to token))
            if (response.isSuccessful) Resource.Success(Unit)
            else Resource.Error("Failed to update FCM token")
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Network error")
        }
    }

    private fun parseErrorMessage(errorBody: String?, default: String): String {
        if (errorBody.isNullOrBlank()) return default
        return try {
            val jsonObject = org.json.JSONObject(errorBody)
            if (jsonObject.has("message")) {
                val msgElement = jsonObject.get("message")
                if (msgElement is org.json.JSONArray) {
                    val list = mutableListOf<String>()
                    for (i in 0 until msgElement.length()) {
                        list.add(msgElement.getString(i))
                    }
                    list.joinToString("\n")
                } else {
                    msgElement.toString()
                }
            } else {
                default
            }
        } catch (e: Exception) {
            default
        }
    }
}

// ─── Mapper ───────────────────────────────────────────────────

private fun com.studio.pro.data.remote.dto.UserDto.toDomain() = User(
    id                  = id,
    email               = email,
    displayName         = displayName,
    avatarUrl           = avatarUrl,
    role                = role,
    hasActiveSubscription = hasActiveSubscription,
)
