package com.ott.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.tokenDataStore: DataStore<Preferences>
    by preferencesDataStore(name = "ott_tokens")

@Singleton
class TokenStorage @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private val KEY_ACCESS_TOKEN  = stringPreferencesKey("access_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val KEY_USER_ID       = stringPreferencesKey("user_id")
        private val KEY_USER_EMAIL    = stringPreferencesKey("user_email")
        private val KEY_USER_ROLE     = stringPreferencesKey("user_role")
        private val KEY_DISPLAY_NAME  = stringPreferencesKey("display_name")
        private val KEY_DEVICE_ID     = stringPreferencesKey("device_id")
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        context.tokenDataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN]  = accessToken
            prefs[KEY_REFRESH_TOKEN] = refreshToken
        }
    }

    suspend fun getAccessToken(): String? =
        context.tokenDataStore.data.first()[KEY_ACCESS_TOKEN]

    suspend fun getRefreshToken(): String? =
        context.tokenDataStore.data.first()[KEY_REFRESH_TOKEN]

    suspend fun saveUserInfo(
        userId:      String,
        email:       String,
        role:        String,
        displayName: String?,
    ) {
        context.tokenDataStore.edit { prefs ->
            prefs[KEY_USER_ID]      = userId
            prefs[KEY_USER_EMAIL]   = email
            prefs[KEY_USER_ROLE]    = role
            displayName?.let { prefs[KEY_DISPLAY_NAME] = it }
        }
    }

    suspend fun getUserId(): String? =
        context.tokenDataStore.data.first()[KEY_USER_ID]

    fun getUserIdFlow(): Flow<String?> =
        context.tokenDataStore.data.map { it[KEY_USER_ID] }

    suspend fun getUserRole(): String? =
        context.tokenDataStore.data.first()[KEY_USER_ROLE]

    suspend fun getUserEmail(): String? =
        context.tokenDataStore.data.first()[KEY_USER_EMAIL]

    suspend fun getDisplayName(): String? =
        context.tokenDataStore.data.first()[KEY_DISPLAY_NAME]

    suspend fun saveDeviceId(deviceId: String) {
        context.tokenDataStore.edit { it[KEY_DEVICE_ID] = deviceId }
    }

    suspend fun getDeviceId(): String? =
        context.tokenDataStore.data.first()[KEY_DEVICE_ID]

    suspend fun clearTokens() {
        context.tokenDataStore.edit { prefs ->
            prefs.remove(KEY_ACCESS_TOKEN)
            prefs.remove(KEY_REFRESH_TOKEN)
            prefs.remove(KEY_USER_ID)
            prefs.remove(KEY_USER_EMAIL)
            prefs.remove(KEY_USER_ROLE)
            prefs.remove(KEY_DISPLAY_NAME)
        }
    }

    fun isLoggedInFlow(): Flow<Boolean> =
        context.tokenDataStore.data.map { it[KEY_ACCESS_TOKEN] != null }
}
