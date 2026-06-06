# OTT Android App — Setup Guide

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 34
- Min Android: API 24 (Android 7.0)

## Project Structure

```
app/src/main/java/com/ott/app/
├── data/
│   ├── local/
│   │   ├── TokenStorage.kt          DataStore token persistence
│   │   └── database/
│   │       └── OttDatabase.kt       Room DB + DAOs + entities
│   ├── remote/
│   │   ├── api/OttApiService.kt     All Retrofit endpoints
│   │   ├── dto/                     Request/response DTOs
│   │   └── interceptor/
│   │       └── AuthInterceptor.kt   JWT attach + refresh
│   └── repository/                  Repository implementations
├── domain/
│   ├── model/Content.kt             All domain models
│   └── repository/                  Repository interfaces + Resource<T>
├── di/AppModule.kt                  Hilt DI — Network, DB, Repos
├── player/ExoPlayerManager.kt       HLS + quality + subtitles + audio
├── presentation/
│   ├── auth/                        Login / Register screens + VM
│   ├── home/                        Home screen (hero, carousels)
│   ├── content/                     Detail screen + VM
│   ├── player/                      Full-screen player + VM
│   ├── search/                      Search screen + VM
│   ├── profile/                     Profile screen
│   ├── splash/                      Animated splash
│   ├── common/OttColors.kt          Design system colours
│   └── navigation/AppNavigation.kt  NavHost with all routes
└── services/
    ├── OttFcmService.kt             FCM push handler
    ├── NotificationHelper.kt        Local notification builder
    └── MediaPlaybackService.kt      Media3 session service
```

## Setup Steps

### 1. Clone and open in Android Studio
```bash
git clone <repo>
cd ott-platform/android
# Open in Android Studio: File → Open → select android/
```

### 2. Add google-services.json
Place your Firebase `google-services.json` in `app/` directory.
Get it from: Firebase Console → Project Settings → Android app.

### 3. Configure API URL
In `app/build.gradle`:
```groovy
buildConfigField "String", "API_BASE_URL", "\"https://ssooss.store/api/v1\""
buildConfigField "String", "CDN_BASE_URL",  "\"https://ott-media.r2.dev\""
```

### 4. Build
```bash
./gradlew assembleDebug    # debug APK
./gradlew assembleRelease  # signed release APK
```

## Key Architecture Decisions

### JWT Token Refresh
`AuthInterceptor` handles 401 responses by:
1. Attempting silent refresh via `/auth/refresh`
2. Queueing pending requests during refresh
3. Retrying queued requests with new token
4. Broadcasting logout if refresh fails

### ExoPlayer HLS
`ExoPlayerManager` is `@Singleton` — the same player instance is reused across
screen rotations. `PlayerViewModel.onCleared()` saves the final position
and calls `playerManager.release()`.

Quality selection works by constraining `DefaultTrackSelector` min/max heights.
"Auto" mode removes constraints and lets bandwidth-based ABR run freely.

### Offline-first watch progress
Progress is written to Room immediately (local-first), then synced to the API.
Failed syncs are retried by `WatchRepositoryImpl.syncPendingProgress()`.
This means resume positions survive offline usage.

### Intro Skip
`ExoPlayerManager.tick()` is called every 1 second by `PlayerViewModel`.
When `currentPosSec >= introStartSec && currentPosSec < introEndSec`, it
sets `showIntroSkip = true` in `PlayerState`, triggering the button in
`PlayerScreen`.

## Player Gestures (implement in PlayerScreen)
The PlayerScreen includes the control overlay. To add gesture controls:
- **Brightness**: drag left half vertically → `Settings.System.SCREEN_BRIGHTNESS`
- **Volume**: drag right half vertically → `AudioManager.STREAM_MUSIC`
- **Seek**: drag horizontally → `playerManager.seekTo()`

## Release Build
1. Generate keystore: `keytool -genkey -v -keystore ott-release.jks`
2. Add to `gradle.properties`:
   ```
   KEYSTORE_PATH=../ott-release.jks
   KEY_ALIAS=ott
   KEY_PASSWORD=yourpassword
   STORE_PASSWORD=yourstorepassword
   ```
3. In `build.gradle` signingConfigs block, reference the above

## Dependencies Summary

| Library              | Version | Purpose                              |
|----------------------|---------|--------------------------------------|
| Jetpack Compose      | BOM 2024.06 | UI framework                    |
| Hilt                 | 2.51.1  | Dependency injection                 |
| Retrofit             | 2.11.0  | HTTP client                          |
| OkHttp               | 4.12.0  | HTTP + logging                       |
| Room                 | 2.6.1   | Local SQLite database                |
| Media3 ExoPlayer     | 1.3.1   | HLS video playback                   |
| Coil                 | 2.6.0   | Image loading + caching              |
| DataStore            | 1.1.1   | Token storage                        |
| Firebase Messaging   | BOM 33  | Push notifications                   |
| Navigation Compose   | 2.7.7   | In-app navigation                    |
| Razorpay             | 1.6.41  | Payment checkout                     |
| Paging 3             | 3.3.0   | Paginated lists                      |
| Timber               | 5.0.1   | Logging                              |
