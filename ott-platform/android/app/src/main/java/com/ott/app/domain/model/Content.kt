package com.ott.app.domain.model

data class Content(
    val id:               String,
    val type:             ContentType,
    val title:            String,
    val slug:             String,
    val description:      String?,
    val shortDescription: String?,
    val language:         String,
    val releaseYear:      Int?,
    val durationSeconds:  Int?,
    val ageRating:        String?,
    val status:           String,
    val isPremium:        Boolean,
    val isFeatured:       Boolean,
    val isTrending:       Boolean,
    val imdbRating:       Double?,
    val trailerUrl:       String?,
    val posterUrl:        String?,
    val bannerUrl:        String?,
    val thumbnailUrl:     String?,
    val totalPlays:       Long,
    val genres:           List<Genre>,
    val seasons:          List<Season>,
    val videoAssets:      List<VideoAsset>,
    val publishedAt:      String?,
    val createdAt:        String,
)

enum class ContentType { MOVIE, SERIES }

data class Genre(
    val id:   Int,
    val name: String,
    val slug: String,
)

data class Season(
    val id:           String,
    val seasonNumber: Int,
    val title:        String?,
    val totalEpisodes: Int,
    val episodes:     List<Episode>,
)

data class Episode(
    val id:              String,
    val episodeNumber:   Int,
    val title:           String,
    val description:     String?,
    val durationSeconds: Int?,
    val thumbnailUrl:    String?,
    val isPremium:       Boolean,
    val introStartSec:   Int?,
    val introEndSec:     Int?,
    val masterUrl:       String?,
    val renditions:      List<Rendition>,
    val subtitles:       List<Subtitle>,
    val audioTracks:     List<AudioTrack>,
)

data class VideoAsset(
    val id:              String,
    val masterUrl:       String?,
    val durationSeconds: Int?,
    val renditions:      List<Rendition>,
    val subtitles:       List<Subtitle>,
    val audioTracks:     List<AudioTrack>,
)

data class Rendition(
    val id:          String,
    val resolution:  String,
    val bitrateKbps: Int,
    val playlistUrl: String,
)

data class Subtitle(
    val id:           String,
    val languageCode: String,
    val languageName: String,
    val vttUrl:       String,
    val isDefault:    Boolean,
)

data class AudioTrack(
    val id:           String,
    val languageCode: String,
    val languageName: String,
    val isDefault:    Boolean,
)

data class WatchProgress(
    val contentId:      String?,
    val episodeId:      String?,
    val watchedSeconds: Int,
    val totalSeconds:   Int?,
    val completed:      Boolean,
    val content:        Content?,
    val episode:        Episode?,
)

data class User(
    val id:                  String,
    val email:               String,
    val displayName:         String?,
    val avatarUrl:           String?,
    val role:                String,
    val hasActiveSubscription: Boolean,
)

data class SubscriptionPlan(
    val id:           Int,
    val name:         String,
    val planType:     String,
    val priceInr:     Double,
    val durationDays: Int,
    val maxDevices:   Int,
    val maxQuality:   String,
)

// ─── Player state ──────────────────────────────────────────────

data class StreamSession(
    val contentId:   String?,
    val episodeId:   String?,
    val title:       String,
    val masterUrl:   String,
    val subtitles:   List<Subtitle>,
    val audioTracks: List<AudioTrack>,
    val resumeAt:    Long,              // seconds to seek to on start
    val introStart:  Int?,
    val introEnd:    Int?,
    val nextEpisode: Episode?,
)
