package com.ott.app.player

import android.content.Context
import androidx.media3.common.*
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.exoplayer.upstream.DefaultBandwidthMeter
import com.ott.app.BuildConfig
import com.ott.app.data.local.TokenStorage
import com.ott.app.domain.model.Subtitle
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

data class PlayerState(
    val isPlaying:        Boolean = false,
    val isBuffering:      Boolean = false,
    val hasError:         Boolean = false,
    val errorMessage:     String? = null,
    val currentPositionMs: Long   = 0L,
    val durationMs:       Long    = 0L,
    val currentQuality:   String  = "Auto",
    val availableQualities: List<String> = emptyList(),
    val showIntroSkip:    Boolean = false,
    val introEndSec:      Int?    = null,
)

@UnstableApi
@Singleton
class ExoPlayerManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenStorage: TokenStorage,
    private val okHttpClient: OkHttpClient,
) {
    private var exoPlayer: ExoPlayer?      = null
    private var trackSelector: DefaultTrackSelector? = null

    private val _playerState = MutableStateFlow(PlayerState())
    val playerState: StateFlow<PlayerState> = _playerState

    // Intro skip state
    private var introStartSec: Int? = null
    private var introEndSec:   Int? = null

    // ─── Build Player ─────────────────────────────────────────

    fun getOrCreatePlayer(): ExoPlayer {
        if (exoPlayer != null) return exoPlayer!!

        trackSelector = DefaultTrackSelector(context).apply {
            // Start with auto quality — player chooses based on bandwidth
            setParameters(
                buildUponParameters()
                    .setMaxVideoSizeSd()   // Start conservative on cellular
                    .setForceHighestSupportedBitrate(false)
                    .build()
            )
        }

        // OkHttp data source with auth headers injected
        val accessToken = runBlocking { tokenStorage.getAccessToken() }
        val dataSourceFactory = OkHttpDataSource.Factory(okHttpClient).apply {
            setDefaultRequestProperties(
                mapOf(
                    "Authorization"  to "Bearer ${accessToken ?: ""}",
                    "X-App-Version"  to BuildConfig.VERSION_NAME,
                )
            )
        }

        exoPlayer = ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector!!)
            .setBandwidthMeter(DefaultBandwidthMeter.getSingletonInstance(context))
            .build()
            .apply {
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        _playerState.value = _playerState.value.copy(
                            isBuffering = state == Player.STATE_BUFFERING,
                            isPlaying   = isPlaying && state == Player.STATE_READY,
                        )
                    }

                    override fun onIsPlayingChanged(playing: Boolean) {
                        _playerState.value = _playerState.value.copy(isPlaying = playing)
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        Timber.e(error, "ExoPlayer error")
                        _playerState.value = _playerState.value.copy(
                            hasError     = true,
                            errorMessage = error.message ?: "Playback error",
                        )
                    }

                    override fun onTracksChanged(tracks: Tracks) {
                        updateAvailableQualities(tracks)
                    }
                })
            }

        return exoPlayer!!
    }

    // ─── Load Media ───────────────────────────────────────────

    fun loadHls(
        masterUrl:    String,
        resumeAtMs:   Long = 0L,
        introStart:   Int? = null,
        introEnd:     Int? = null,
        subtitles:    List<Subtitle> = emptyList(),
        autoPlay:     Boolean = true,
    ) {
        val player = getOrCreatePlayer()

        introStartSec = introStart
        introEndSec   = introEnd

        val accessToken = runBlocking { tokenStorage.getAccessToken() }

        val dataSourceFactory = OkHttpDataSource.Factory(okHttpClient).apply {
            setDefaultRequestProperties(
                mapOf("Authorization" to "Bearer ${accessToken ?: ""}")
            )
        }

        val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
            .createMediaSource(
                MediaItem.Builder()
                    .setUri(masterUrl)
                    .setMimeType(MimeTypes.APPLICATION_M3U8)
                    // Add external VTT subtitles
                    .setSubtitleConfigurations(
                        subtitles.map { sub ->
                            MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(sub.vttUrl))
                                .setMimeType(MimeTypes.TEXT_VTT)
                                .setLanguage(sub.languageCode)
                                .setLabel(sub.languageName)
                                .setSelectionFlags(
                                    if (sub.isDefault) C.SELECTION_FLAG_DEFAULT else 0
                                )
                                .build()
                        }
                    )
                    .build()
            )

        player.apply {
            setMediaSource(hlsSource)
            seekTo(resumeAtMs)
            playWhenReady = autoPlay
            prepare()
        }

        _playerState.value = _playerState.value.copy(
            hasError     = false,
            errorMessage = null,
            introEndSec  = introEnd,
        )
    }

    // ─── Quality Selection ────────────────────────────────────

    fun setQuality(qualityLabel: String) {
        val selector = trackSelector ?: return
        val player   = exoPlayer    ?: return

        if (qualityLabel == "Auto") {
            selector.setParameters(
                selector.buildUponParameters()
                    .clearVideoSizeConstraints()
                    .setForceHighestSupportedBitrate(false)
                    .build()
            )
        } else {
            // Parse height from label e.g. "1080p" -> 1080
            val height = qualityLabel.replace("p", "").toIntOrNull() ?: return
            selector.setParameters(
                selector.buildUponParameters()
                    .setMaxVideoSize(Int.MAX_VALUE, height)
                    .setMinVideoSize(0, height)
                    .setForceHighestSupportedBitrate(true)
                    .build()
            )
        }

        _playerState.value = _playerState.value.copy(currentQuality = qualityLabel)
    }

    // ─── Subtitle Selection ───────────────────────────────────

    fun setSubtitle(languageCode: String?) {
        val selector = trackSelector ?: return
        if (languageCode == null) {
            selector.setParameters(
                selector.buildUponParameters()
                    .setDisabledTextTrackSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                    .build()
            )
        } else {
            selector.setParameters(
                selector.buildUponParameters()
                    .setPreferredTextLanguage(languageCode)
                    .build()
            )
        }
    }

    // ─── Audio Track Selection ────────────────────────────────

    fun setAudioTrack(languageCode: String) {
        val selector = trackSelector ?: return
        selector.setParameters(
            selector.buildUponParameters()
                .setPreferredAudioLanguage(languageCode)
                .build()
        )
    }

    // ─── Playback controls ────────────────────────────────────

    fun play()  { exoPlayer?.play() }
    fun pause() { exoPlayer?.pause() }

    fun seekTo(positionMs: Long) {
        exoPlayer?.seekTo(positionMs)
    }

    fun seekForward(ms: Long = 10_000L) {
        exoPlayer?.let { seekTo(it.currentPosition + ms) }
    }

    fun seekBackward(ms: Long = 10_000L) {
        exoPlayer?.let { seekTo(maxOf(0L, it.currentPosition - ms)) }
    }

    fun skipIntro() {
        val endSec = introEndSec ?: return
        seekTo(endSec * 1000L)
        _playerState.value = _playerState.value.copy(showIntroSkip = false)
    }

    fun getCurrentPositionMs(): Long = exoPlayer?.currentPosition ?: 0L
    fun getDurationMs():         Long = exoPlayer?.duration        ?: 0L
    fun isPlaying():             Boolean = exoPlayer?.isPlaying   ?: false

    // Called periodically (every 1s) by the UI to update progress and check intro
    fun tick() {
        val player   = exoPlayer ?: return
        val posMs    = player.currentPosition
        val durMs    = player.duration
        val posSec   = (posMs / 1000).toInt()
        val startSec = introStartSec
        val endSec   = introEndSec

        val showIntro = startSec != null && endSec != null
            && posSec >= startSec && posSec < endSec

        _playerState.value = _playerState.value.copy(
            currentPositionMs = posMs,
            durationMs        = if (durMs > 0) durMs else _playerState.value.durationMs,
            showIntroSkip     = showIntro,
        )
    }

    // ─── Available Qualities ──────────────────────────────────

    private fun updateAvailableQualities(tracks: Tracks) {
        val heights = mutableSetOf<Int>()
        for (group in tracks.groups) {
            if (group.type != C.TRACK_TYPE_VIDEO) continue
            for (i in 0 until group.length) {
                val format = group.getTrackFormat(i)
                if (format.height > 0) heights.add(format.height)
            }
        }
        val labels = listOf("Auto") + heights.sortedDescending().map { "${it}p" }
        _playerState.value = _playerState.value.copy(availableQualities = labels)
    }

    // ─── Lifecycle ────────────────────────────────────────────

    fun release() {
        exoPlayer?.release()
        exoPlayer      = null
        trackSelector  = null
        _playerState.value = PlayerState()
    }
}
