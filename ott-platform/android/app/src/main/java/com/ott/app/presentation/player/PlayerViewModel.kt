package com.ott.app.presentation.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ott.app.domain.model.StreamSession
import com.ott.app.domain.repository.Resource
import com.ott.app.domain.repository.StreamRepository
import com.ott.app.domain.repository.WatchRepository
import com.ott.app.player.ExoPlayerManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import timber.log.Timber
import javax.inject.Inject

data class PlayerUiState(
    val isLoadingStream:  Boolean       = true,
    val session:          StreamSession? = null,
    val error:            String?       = null,
    val showControls:     Boolean       = true,
    val isLocked:         Boolean       = false,   // gesture lock
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val streamRepository: StreamRepository,
    private val watchRepository:  WatchRepository,
    val playerManager:            ExoPlayerManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    val playerState = playerManager.playerState

    private var progressJob:      Job? = null
    private var tickJob:          Job? = null
    private var controlsHideJob:  Job? = null

    private var currentContentId: String? = null
    private var currentEpisodeId: String? = null

    // ─── Load stream ──────────────────────────────────────────

    fun loadStream(contentId: String? = null, episodeId: String? = null) {
        currentContentId = contentId
        currentEpisodeId = episodeId

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingStream = true, error = null) }

            val result = streamRepository.getStreamSession(
                contentId = contentId ?: episodeId ?: return@launch,
                episodeId = episodeId,
            )

            when (result) {
                is Resource.Success -> {
                    val session = result.data
                    _uiState.update { it.copy(isLoadingStream = false, session = session) }
                    currentContentId = session.contentId

                    // Load into ExoPlayer
                    playerManager.loadHls(
                        masterUrl  = session.masterUrl,
                        resumeAtMs = session.resumeAt * 1000L,
                        introStart = session.introStart,
                        introEnd   = session.introEnd,
                        subtitles  = session.subtitles,
                    )

                    startTicking()
                    startProgressSync(currentContentId, episodeId)
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoadingStream = false, error = result.message) }
                }
                is Resource.Loading -> Unit
            }
        }
    }

    // ─── Tick (position + intro skip) ────────────────────────

    private fun startTicking() {
        tickJob?.cancel()
        tickJob = viewModelScope.launch {
            while (isActive) {
                playerManager.tick()
                delay(1000L)
            }
        }
    }

    // ─── Progress sync (every 10 seconds) ────────────────────

    private fun startProgressSync(contentId: String?, episodeId: String?) {
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000L)
                val positionMs  = playerManager.getCurrentPositionMs()
                val durationMs  = playerManager.getDurationMs()
                if (positionMs < 3000L) continue   // don't save in first 3 seconds

                val watchedSec = (positionMs / 1000).toInt()
                val totalSec   = if (durationMs > 0) (durationMs / 1000).toInt() else null
                val targetId   = contentId ?: episodeId ?: continue

                watchRepository.updateProgress(
                    contentId      = targetId,
                    watchedSeconds = watchedSec,
                    totalSeconds   = totalSec,
                    episodeId      = episodeId,
                )
            }
        }
    }

    // ─── Controls visibility ─────────────────────────────────

    fun showControls() {
        _uiState.update { it.copy(showControls = true) }
        scheduleHideControls()
    }

    fun toggleControls() {
        val current = _uiState.value.showControls
        _uiState.update { it.copy(showControls = !current) }
        if (!current) scheduleHideControls()
    }

    private fun scheduleHideControls() {
        controlsHideJob?.cancel()
        controlsHideJob = viewModelScope.launch {
            delay(4000L)
            if (playerManager.isPlaying()) {
                _uiState.update { it.copy(showControls = false) }
            }
        }
    }

    // ─── Lock overlay ─────────────────────────────────────────

    fun toggleLock() {
        _uiState.update { it.copy(isLocked = !it.isLocked, showControls = true) }
        if (!_uiState.value.isLocked) scheduleHideControls()
    }

    // ─── Next episode ─────────────────────────────────────────

    fun playNextEpisode() {
        val nextEp = _uiState.value.session?.nextEpisode ?: return
        loadStream(episodeId = nextEp.id)
    }

    // ─── Player controls delegated to ExoPlayerManager ───────

    fun togglePlayPause() {
        if (playerManager.isPlaying()) playerManager.pause() else playerManager.play()
        showControls()
    }

    fun seekForward()   { playerManager.seekForward();  showControls() }
    fun seekBackward()  { playerManager.seekBackward(); showControls() }
    fun seekTo(ms: Long){ playerManager.seekTo(ms);     showControls() }
    fun skipIntro()     { playerManager.skipIntro() }

    fun setQuality(label: String)  { playerManager.setQuality(label) }
    fun setSubtitle(lang: String?) { playerManager.setSubtitle(lang) }
    fun setAudioTrack(lang: String){ playerManager.setAudioTrack(lang) }

    override fun onCleared() {
        super.onCleared()
        // Save final position before clearing — capture values synchronously before releasing player
        val posMs = playerManager.getCurrentPositionMs()
        val durMs = playerManager.getDurationMs()
        val contentId = currentContentId
        val episodeId = currentEpisodeId

        viewModelScope.launch {
            if (posMs > 3000 && contentId != null) {
                watchRepository.updateProgress(
                    contentId      = contentId,
                    watchedSeconds = (posMs / 1000).toInt(),
                    totalSeconds   = if (durMs > 0) (durMs / 1000).toInt() else null,
                    episodeId      = episodeId,
                )
            }
        }
        tickJob?.cancel()
        progressJob?.cancel()
        controlsHideJob?.cancel()
        playerManager.release()
    }
}
