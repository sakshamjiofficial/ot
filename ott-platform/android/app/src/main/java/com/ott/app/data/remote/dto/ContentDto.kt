package com.ott.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ContentDto(
    @SerializedName("id")               val id:               String,
    @SerializedName("type")             val type:             String,
    @SerializedName("title")            val title:            String,
    @SerializedName("slug")             val slug:             String,
    @SerializedName("description")      val description:      String?,
    @SerializedName("shortDescription") val shortDescription: String?,
    @SerializedName("language")         val language:         String,
    @SerializedName("releaseYear")      val releaseYear:      Int?,
    @SerializedName("durationSeconds")  val durationSeconds:  Int?,
    @SerializedName("ageRating")        val ageRating:        String?,
    @SerializedName("status")           val status:           String,
    @SerializedName("isPremium")        val isPremium:        Boolean,
    @SerializedName("isFeatured")       val isFeatured:       Boolean,
    @SerializedName("isTrending")       val isTrending:       Boolean,
    @SerializedName("imdbRating")       val imdbRating:       Double?,
    @SerializedName("trailerUrl")       val trailerUrl:       String?,
    @SerializedName("posterUrl")        val posterUrl:        String?,
    @SerializedName("bannerUrl")        val bannerUrl:        String?,
    @SerializedName("thumbnailUrl")     val thumbnailUrl:     String?,
    @SerializedName("totalPlays")       val totalPlays:       Long,
    @SerializedName("genres")           val genres:           List<GenreDto>,
    @SerializedName("seasons")          val seasons:          List<SeasonDto>?,
    @SerializedName("videoAssets")      val videoAssets:      List<VideoAssetDto>?,
    @SerializedName("publishedAt")      val publishedAt:      String?,
    @SerializedName("createdAt")        val createdAt:        String,
)

data class GenreDto(
    @SerializedName("id")   val id:   Int,
    @SerializedName("name") val name: String,
    @SerializedName("slug") val slug: String,
)

data class SeasonDto(
    @SerializedName("id")           val id:           String,
    @SerializedName("seasonNumber") val seasonNumber: Int,
    @SerializedName("title")        val title:        String?,
    @SerializedName("totalEpisodes") val totalEpisodes: Int,
    @SerializedName("episodes")     val episodes:     List<EpisodeDto>?,
)

data class EpisodeDto(
    @SerializedName("id")              val id:              String,
    @SerializedName("contentId")       val contentId:       String? = null,
    @SerializedName("episodeNumber")   val episodeNumber:   Int,
    @SerializedName("title")           val title:           String,
    @SerializedName("description")     val description:     String?,
    @SerializedName("durationSeconds") val durationSeconds: Int?,
    @SerializedName("thumbnailUrl")    val thumbnailUrl:    String?,
    @SerializedName("status")          val status:          String,
    @SerializedName("isPremium")       val isPremium:       Boolean,
    @SerializedName("introStartSec")   val introStartSec:   Int?,
    @SerializedName("introEndSec")     val introEndSec:     Int?,
    @SerializedName("videoAssets")     val videoAssets:     List<VideoAssetDto>?,
)

data class VideoAssetDto(
    @SerializedName("id")              val id:              String,
    @SerializedName("masterUrl")       val masterUrl:       String?,
    @SerializedName("durationSeconds") val durationSeconds: Int?,
    @SerializedName("renditions")      val renditions:      List<RenditionDto>?,
    @SerializedName("subtitles")       val subtitles:       List<SubtitleDto>?,
    @SerializedName("audioTracks")     val audioTracks:     List<AudioTrackDto>?,
)

data class RenditionDto(
    @SerializedName("id")          val id:          String,
    @SerializedName("resolution")  val resolution:  String,
    @SerializedName("bitrateKbps") val bitrateKbps: Int,
    @SerializedName("playlistUrl") val playlistUrl: String,
)

data class SubtitleDto(
    @SerializedName("id")           val id:           String,
    @SerializedName("languageCode") val languageCode: String,
    @SerializedName("languageName") val languageName: String,
    @SerializedName("vttUrl")       val vttUrl:       String,
    @SerializedName("isDefault")    val isDefault:    Boolean,
)

data class AudioTrackDto(
    @SerializedName("id")           val id:           String,
    @SerializedName("languageCode") val languageCode: String,
    @SerializedName("languageName") val languageName: String,
    @SerializedName("isDefault")    val isDefault:    Boolean,
)

// ─── Stream info ───────────────────────────────────────────────

data class StreamInfoDto(
    @SerializedName("assetId")     val assetId:    String,
    @SerializedName("duration")    val duration:   Int?,
    @SerializedName("renditions")  val renditions: List<RenditionDto>,
    @SerializedName("subtitles")   val subtitles:  List<SubtitleDto>,
    @SerializedName("audioTracks") val audioTracks: List<AudioTrackDto>,
)

// ─── Watch Progress ───────────────────────────────────────────

data class WatchProgressRequest(
    @SerializedName("watchedSeconds") val watchedSeconds: Int,
    @SerializedName("totalSeconds")   val totalSeconds:   Int?,
    @SerializedName("episodeId")      val episodeId:      String?,
    @SerializedName("deviceId")       val deviceId:       String?,
)

data class WatchHistoryDto(
    @SerializedName("id")             val id:             String,
    @SerializedName("contentId")      val contentId:      String?,
    @SerializedName("episodeId")      val episodeId:      String?,
    @SerializedName("watchedSeconds") val watchedSeconds: Int,
    @SerializedName("totalSeconds")   val totalSeconds:   Int?,
    @SerializedName("completed")      val completed:      Boolean,
    @SerializedName("lastWatchedAt")  val lastWatchedAt:  String,
    @SerializedName("content")        val content:        ContentDto?,
    @SerializedName("episode")        val episode:        EpisodeDto?,
)

// ─── Subscription ─────────────────────────────────────────────

data class SubscriptionPlanDto(
    @SerializedName("id")           val id:           Int,
    @SerializedName("name")         val name:         String,
    @SerializedName("planType")     val planType:     String,
    @SerializedName("priceInr")     val priceInr:     Double,
    @SerializedName("durationDays") val durationDays: Int,
    @SerializedName("maxDevices")   val maxDevices:   Int,
    @SerializedName("maxQuality")   val maxQuality:   String,
    @SerializedName("features")     val features:     Map<String, Any>?,
)

data class CreateOrderResponse(
    @SerializedName("orderId")  val orderId:  String,
    @SerializedName("amount")   val amount:   Int,
    @SerializedName("currency") val currency: String,
    @SerializedName("keyId")    val keyId:    String,
)

data class HomeSectionItemDto(
    @SerializedName("id")               val id:               String,
    @SerializedName("contentId")        val contentId:        String? = null,
    @SerializedName("episodeId")        val episodeId:        String? = null,
    @SerializedName("watchedSeconds")   val watchedSeconds:   Int? = null,
    @SerializedName("totalSeconds")     val totalSeconds:     Int? = null,
    @SerializedName("completed")        val completed:        Boolean? = null,
    @SerializedName("lastWatchedAt")    val lastWatchedAt:    String? = null,
    @SerializedName("content")          val content:          ContentDto? = null,

    @SerializedName("type")             val type:             String? = null,
    @SerializedName("title")            val title:            String? = null,
    @SerializedName("slug")             val slug:             String? = null,
    @SerializedName("description")      val description:      String? = null,
    @SerializedName("shortDescription") val shortDescription: String? = null,
    @SerializedName("language")         val language:         String? = null,
    @SerializedName("releaseYear")      val releaseYear:      Int? = null,
    @SerializedName("durationSeconds")  val durationSeconds:  Int? = null,
    @SerializedName("ageRating")        val ageRating:        String? = null,
    @SerializedName("status")           val status:           String? = null,
    @SerializedName("isPremium")        val isPremium:        Boolean? = null,
    @SerializedName("isFeatured")       val isFeatured:       Boolean? = null,
    @SerializedName("isTrending")       val isTrending:       Boolean? = null,
    @SerializedName("imdbRating")       val imdbRating:       Double? = null,
    @SerializedName("trailerUrl")       val trailerUrl:       String? = null,
    @SerializedName("posterUrl")        val posterUrl:        String? = null,
    @SerializedName("bannerUrl")        val bannerUrl:        String? = null,
    @SerializedName("thumbnailUrl")     val thumbnailUrl:     String? = null,
    @SerializedName("totalPlays")       val totalPlays:       Long? = null,
    @SerializedName("genres")           val genres:           List<GenreDto>? = null,
    @SerializedName("seasons")          val seasons:          List<SeasonDto>? = null,
    @SerializedName("videoAssets")      val videoAssets:      List<VideoAssetDto>? = null,
    @SerializedName("publishedAt")      val publishedAt:      String? = null,
    @SerializedName("createdAt")        val createdAt:        String? = null,
)

data class HomeSectionDto(
    @SerializedName("id")          val id:          Int,
    @SerializedName("title")       val title:       String,
    @SerializedName("sectionType") val sectionType: String,
    @SerializedName("items")       val items:       List<HomeSectionItemDto>,
)
