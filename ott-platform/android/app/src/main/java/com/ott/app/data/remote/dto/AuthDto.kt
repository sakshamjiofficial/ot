package com.ott.app.data.remote.dto

import com.google.gson.annotations.SerializedName

// ─── Requests ─────────────────────────────────────────────────

data class LoginRequest(
    @SerializedName("email")    val email:    String,
    @SerializedName("password") val password: String,
)

data class RegisterRequest(
    @SerializedName("email")       val email:       String,
    @SerializedName("password")    val password:    String,
    @SerializedName("displayName") val displayName: String? = null,
    @SerializedName("phone")       val phone:       String? = null,
)

data class RefreshRequest(
    @SerializedName("refreshToken") val refreshToken: String,
)

// ─── Responses ────────────────────────────────────────────────

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data")    val data:    T?,
    @SerializedName("message") val message: String?,
    @SerializedName("meta")    val meta:    MetaDto?,
)

data class MetaDto(
    @SerializedName("total")      val total:      Int,
    @SerializedName("page")       val page:       Int,
    @SerializedName("limit")      val limit:      Int,
    @SerializedName("totalPages") val totalPages: Int,
)

data class AuthResponseDto(
    @SerializedName("user")   val user:   UserDto,
    @SerializedName("tokens") val tokens: TokensDto,
)

data class TokensDto(
    @SerializedName("accessToken")  val accessToken:  String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("expiresIn")    val expiresIn:    Long,
)

data class UserDto(
    @SerializedName("id")                  val id:                  String,
    @SerializedName("email")               val email:               String,
    @SerializedName("displayName")         val displayName:         String?,
    @SerializedName("avatarUrl")           val avatarUrl:           String?,
    @SerializedName("role")                val role:                String,
    @SerializedName("isActive")            val isActive:            Boolean,
    @SerializedName("isEmailVerified")     val isEmailVerified:     Boolean,
    @SerializedName("fcmToken")            val fcmToken:            String?,
    @SerializedName("hasActiveSubscription") val hasActiveSubscription: Boolean = false,
    @SerializedName("createdAt")           val createdAt:           String,
)
