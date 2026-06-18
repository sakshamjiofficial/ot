# Android OTT App Gap Analysis — Netflix Implementation Roadmap

This document outlines the architectural and feature gaps between the current **Kaler Android App** and a production-grade streaming application like **Netflix**. It provides technical implementation specifications, code examples, and design requirements to bridge these gaps.

---

## 1. Feature Comparison Matrix

| Feature Domain | Netflix Capability | Current Android App Status | Complexity |
|---|---|---|---|
| **Multi-Profile Management** | Up to 5 profiles, Kids profiles, PIN locks, custom avatars, distinct histories | ⚠️ **Partial**: Choose Profile screen is a mock UI loading the logged-in user account details. | Medium |
| **Advanced Player Gestures** | Vertical swipe (left: brightness, right: volume), double-tap seek, pinch-to-zoom | ❌ **Missing**: Only supports seek-slider clicks and basic button events. | Medium |
| **Picture-in-Picture (PiP)** | Triggers on backgrounding during play, hides UI controls automatically | ⚠️ **Partial**: Declared in Manifest, but triggers/callbacks are missing in code. | Low |
| **Offline Video Downloads** | Downloads HLS chunks locally, standard/high selection, Smart Downloads | ❌ **Missing**: Tray icons exist, but download engine and database tables are absent. | High |
| **Chromecast / TV Cast** | Connects to Chromecast / AirPlay receivers with synched play state | ❌ **Missing**: No Google Cast SDK integration or media controls. | High |
| **Auto-Play Next Episode** | Visual 5-second countdown dialog automatically launching next episode | ⚠️ **Partial**: "Next Episode" button is displayed, but auto-countdown is missing. | Low |
| **Data Saver / Cellular Limits** | Dynamic track selection limits, quality caps (Wi-Fi only / Data Saver) | ❌ **Missing**: No bandwidth or network-type configuration options. | Low |
| **Autoplay Trailers** | Autoplays muted trailer snippets on focused homepage banners | ❌ **Missing**: Banner artwork is static. | Medium |

---

## 2. Core Missing Features & Technical Specifications

### 2.1. Multi-Profile Management Engine
* **Goal**: Enable up to 5 profiles per subscription account (e.g., Kids, Family members) with distinct watchlists, progress data, and age locks.

#### Implementation Steps:
1. **Database Update**: Create a `UserProfileEntity` table in Room Database ([OttDatabase.kt](file:///workspaces/ot/ott-platform/android/app/src/main/java/com/studio/pro/data/local/database/OttDatabase.kt)):
   ```kotlin
   @Entity(tableName = "user_profiles")
   data class UserProfileEntity(
       @PrimaryKey val id: String,
       val userId: String,
       val name: String,
       val avatarUrl: String?,
       val isKids: Boolean,
       val pinCode: String? // Optional security PIN
   )
   ```
2. **API Alignment**: Extend `OttApiService` to support:
   - GET `/users/profiles`
   - POST `/users/profiles` (Create)
   - PUT `/users/profiles/{id}` (Update/Edit)
   - DELETE `/users/profiles/{id}` (Delete)
3. **Session Interceptor**: Modify [AuthInterceptor.kt](file:///workspaces/ot/ott-platform/android/app/src/main/java/com/studio/pro/data/remote/interceptor/AuthInterceptor.kt) to append an `X-Profile-Id` header to all API requests, ensuring watchlist, history, and search queries are indexed relative to the active profile.

---

### 2.2. Advanced Video Player Gestures
* **Goal**: Implement vertical drag gestures to alter audio volume and screen brightness, and double-tap gestures to seek back or forward 10 seconds.

#### Technical Specifications (Compose Integration in [PlayerScreen.kt](file:///workspaces/ot/ott-platform/android/app/src/main/java/com/studio/pro/presentation/player/PlayerScreen.kt)):
Use Jetpack Compose `pointerInput` and `detectTapGestures` to capture user inputs on the left and right halves of the screen:

```kotlin
@Composable
fun PlayerGestureOverlay(
    modifier: Modifier = Modifier,
    onLeftSwipe: (Float) -> Unit,  // Brightness adjustments
    onRightSwipe: (Float) -> Unit, // Volume adjustments
    onDoubleTapLeft: () -> Unit,   // Seek backward
    onDoubleTapRight: () -> Unit,  // Seek forward
    onSingleTap: () -> Unit        // Toggle controls overlay
) {
    var screenWidth by remember { mutableIntStateOf(0) }
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .onGloballyPositioned { screenWidth = it.size.width }
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { onSingleTap() },
                    onDoubleTap = { offset ->
                        if (offset.x < screenWidth / 2) onDoubleTapLeft()
                        else onDoubleTapRight()
                    }
                )
            }
            .pointerInput(Unit) {
                detectVerticalDragGestures { change, dragAmount ->
                    change.consume()
                    val normalizedDrag = dragAmount / size.height
                    if (change.position.x < screenWidth / 2) {
                        onLeftSwipe(-normalizedDrag) // Drag up increases
                    } else {
                        onRightSwipe(-normalizedDrag)
                    }
                }
            }
    )
}
```

* **Aspect Ratio Adjust**: Bind pinch gestures to cyclically update ExoPlayer's resize modes:
  - `RESIZE_MODE_FIT` (Letterbox/Default)
  - `RESIZE_MODE_ZOOM` (Crop to fill screen aspect ratio)
  - `RESIZE_MODE_FILL` (Stretch contents to fit layout boundaries)

---

### 2.3. Picture-in-Picture (PiP) Mode Auto-Trigger
* **Goal**: Smooth transition into PiP window when the user presses the home button or swipes up to go home during an active video playback.

#### Technical Implementation:
1. **Activity Override** in [MainActivity.kt](file:///workspaces/ot/ott-platform/android/app/src/main/java/com/studio/pro/MainActivity.kt):
   ```kotlin
   import android.app.PictureInPictureParams
   import android.util.Rational
   
   override fun onUserLeaveHint() {
       // Check if the current navigation route is the Player Screen
       // and verify player is actively streaming media
       if (isInPlayerScreen && isPlayerPlaying) {
           val params = PictureInPictureParams.Builder()
               .setAspectRatio(Rational(16, 9))
               .build()
           enterPictureInPictureMode(params)
       }
   }
   ```
2. **Compose Layout Adaptation**: Inside `PlayerScreen`, listen for PiP changes to clean the UI:
   ```kotlin
   val isInPiPMode = context.isInPictureInPictureMode
   if (isInPiPMode) {
       // Hide ALL controllers, overlays, gradients, and subtitles
       // Render only the raw video surface
   } else {
       // Restore controllers based on normal overlay visibility states
   }
   ```

---

### 2.4. Offline Video Downloads Engine (Core Feature Gap)
* **Goal**: Permit users to download premium encrypted segments locally for offline viewing.

#### Required Architecture:
1. **Libraries**: Append Google Media3 download dependencies inside `app/build.gradle`:
   ```groovy
   implementation "androidx.media3:media3-datasource-cronet:$media3_version"
   implementation "androidx.media3:media3-exoplayer-dash:$media3_version"
   implementation "androidx.media3:media3-exoplayer-hls:$media3_version"
   ```
2. **ExoPlayer Download Manager**: Implement a singleton download manager inside Hilt modules:
   - **DownloadCache**: Cache instance backed by a `SimpleCache` pointing to protected storage directory (`context.filesDir`).
   - **DownloadManager**: Listens to requests and coordinates segment download threads.
   - **DownloadService**: A background foreground service that runs downloads when the app is in the background.
3. **Database Tracker**: Maintain download progress states locally:
   ```kotlin
   @Entity(tableName = "downloaded_assets")
   data class DownloadedAssetEntity(
       @PrimaryKey val id: String, // MovieId or EpisodeId
       val title: String,
       val localPath: String,
       val progress: Float,
       val downloadState: String, // PENDING, DOWNLOADING, COMPLETED, FAILED
       val quality: String // STANDARD, HIGH
   )
   ```
4. **Smart Downloads Manager**: Orchestrator checking network states and deleting completed series episodes if the user watches past them, automatically queuing the next episode when Wi-Fi connects.

---

### 2.5. Chromecast (Google Cast SDK) Integration
* **Goal**: Support casting the HLS manifest to a local Smart TV or Cast receiver.

#### Implementation Steps:
1. **Dependencies**: Add the Google Play Services Cast Framework:
   ```groovy
   implementation "com.google.android.gms:play-services-cast-framework:21.4.0"
   ```
2. **Cast Options Provider**: Declare the options class inside `AndroidManifest.xml`:
   ```xml
   <meta-data
       android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"
       android:value="com.studio.pro.cast.CastOptionsProvider" />
   ```
3. **Compose MediaRouteButton**: Implement the Cast button in the Home toolbar and Player screen.
4. **Cast Session Management**: Bind the player to remote sessions:
   - When cast session starts, pause local `ExoPlayer` and fetch play position.
   - Pass playback url (HLS) to the `RemoteMediaClient`.
   - Update phone controls to operate as a remote control.

---

### 2.6. Autoplay Trailers on HomePage
* **Goal**: Dynamic home screen where the focused title card banner automatically loads a silent preview stream after 1.5 seconds of user inactivity.

#### Implementation Steps:
1. **Autoplay Player Instance**: Allocate a secondary, low-cache ExoPlayer instance initialized on the Home screen view.
2. **Focus Delay Listener**: Use a coroutine delay in Compose:
   ```kotlin
   var isAutoplayActive by remember { mutableStateOf(false) }
   LaunchedEffect(focusedContentId) {
       isAutoplayActive = false
       delay(1500)
       isAutoplayActive = true
   }
   ```
3. **Muted Playback**: Bind the player to the banner surface layout, enforcing volume level `0.0f` to prevent audio clash until the user taps the play button.

---

## 3. Step-by-Step Refactoring Plan

### Phase 1: Video Controls & Gestures (Low Risk, Fast Win)
- Integrate vertical drag sensors to adjust volume and brightness values.
- Setup horizontal swipe mapping to seek cleanly during player gesture drags.
- Implement the `onUserLeaveHint()` override inside `MainActivity.kt` to trigger Picture-in-Picture mode automatically.

### Phase 2: User Profiles & Session Segmentation (Backend Sync)
- Refactor backend databases to support the `user_profiles` schema.
- Implement profile switcher panels (`ChooseProfileScreen`) that link watch histories and recommend metrics to the active profile ID.
- Append profile constraints inside content lists.

### Phase 3: Offline Downloads Core System (Highest Priority Core Gap)
- Build the singleton `DownloadManager` class utilizing Android Media3 cache caches.
- Implement the background `DownloadService` and associate notification bars.
- Write Room Database entity tables tracking offline storage structures.
- Restrict content access using signed URL paths verified locally.

---
*Gap Analysis generated for Saksham Jio Android application engineering team.*
