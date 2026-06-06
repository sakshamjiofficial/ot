package com.ott.app.di

import android.content.Context
import androidx.room.Room
import com.google.gson.GsonBuilder
import com.ott.app.BuildConfig
import com.ott.app.data.local.TokenStorage
import com.ott.app.data.local.database.*
import com.ott.app.data.remote.api.OttApiService
import com.ott.app.data.remote.interceptor.AuthInterceptor
import com.ott.app.data.repository.*
import com.ott.app.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor, tokenStorage: TokenStorage): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG)
                HttpLoggingInterceptor.Level.BODY
            else
                HttpLoggingInterceptor.Level.NONE
        }

        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            // Add device fingerprint header
            .addInterceptor { chain ->
                val deviceId = kotlinx.coroutines.runBlocking { tokenStorage.getDeviceId() } ?: ""
                chain.proceed(
                    chain.request().newBuilder()
                        .addHeader("X-App-Version", BuildConfig.VERSION_NAME)
                        .addHeader("X-Device-Type", "android")
                        .apply {
                            if (deviceId.isNotEmpty()) {
                                addHeader("X-Device-Id", deviceId)
                            }
                        }
                        .build()
                )
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60,    TimeUnit.SECONDS)
            .writeTimeout(60,   TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        val gson = GsonBuilder()
            .setLenient()
            .create()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): OttApiService =
        retrofit.create(OttApiService::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): OttDatabase =
        Room.databaseBuilder(
            context,
            OttDatabase::class.java,
            OttDatabase.DATABASE_NAME,
        )
            .fallbackToDestructiveMigration()   // dev only — add proper migrations before release
            .build()

    @Provides
    fun provideContentDao(db: OttDatabase):       ContentDao       = db.contentDao()

    @Provides
    fun provideWatchProgressDao(db: OttDatabase): WatchProgressDao  = db.watchProgressDao()

    @Provides
    fun provideSearchHistoryDao(db: OttDatabase): SearchHistoryDao  = db.searchHistoryDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindContentRepository(impl: ContentRepositoryImpl): ContentRepository

    @Binds
    @Singleton
    abstract fun bindWatchRepository(impl: WatchRepositoryImpl): WatchRepository

    @Binds
    @Singleton
    abstract fun bindStreamRepository(impl: StreamRepositoryImpl): StreamRepository

    @Binds
    @Singleton
    abstract fun bindSubscriptionRepository(impl: SubscriptionRepositoryImpl): SubscriptionRepository
}
