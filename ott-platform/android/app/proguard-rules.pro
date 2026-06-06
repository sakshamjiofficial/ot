# Keep Retrofit models
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.ott.app.data.remote.dto.** { *; }
-keep class com.ott.app.domain.model.**   { *; }

# Keep Hilt generated components
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-dontwarn dagger.**

# Keep ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Keep Room entities
-keep class com.ott.app.data.local.entity.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Razorpay
-keepclassmembers class * implements com.razorpay.** { *; }
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
