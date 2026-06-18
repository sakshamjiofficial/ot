package com.studio.pro.presentation.content

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studio.pro.data.local.database.DownloadedAssetDao
import com.studio.pro.data.local.database.DownloadedAssetEntity
import com.studio.pro.download.DownloadManager
import com.studio.pro.domain.model.Content
import com.studio.pro.domain.model.Episode
import com.studio.pro.domain.model.WatchProgress
import com.studio.pro.domain.repository.ContentRepository
import com.studio.pro.domain.repository.Resource
import com.studio.pro.domain.repository.WatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ContentDetailUiState(
    val isLoading:     Boolean      = true,
    val content:       Content?     = null,
    val watchProgress: WatchProgress? = null,
    val isInWatchlist: Boolean      = false,
    val error:         String?      = null,
    val downloads:     Map<String, DownloadedAssetEntity> = emptyMap(),
)

@HiltViewModel
class ContentDetailViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val watchRepository:   WatchRepository,
    private val downloadedAssetDao: DownloadedAssetDao,
    private val downloadManager:   DownloadManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ContentDetailUiState())
    val uiState: StateFlow<ContentDetailUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            downloadedAssetDao.getAll().collect { assetList ->
                val downloadMap = assetList.associateBy { it.id }
                _uiState.update { it.copy(downloads = downloadMap) }
            }
        }
    }

    fun loadContent(contentId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = contentRepository.getContentById(contentId)) {
                is Resource.Success -> {
                    val progress = watchRepository.getLocalProgress(contentId)
                    _uiState.update {
                        it.copy(isLoading = false, content = result.data, watchProgress = progress)
                    }
                }
                is Resource.Error ->
                    _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Resource.Loading -> Unit
            }
        }

        viewModelScope.launch {
            watchRepository.getWatchlist().collect { result ->
                if (result is Resource.Success) {
                    val inWatchlist = result.data.any { it.id == contentId }
                    _uiState.update { it.copy(isInWatchlist = inWatchlist) }
                }
            }
        }
    }

    fun toggleWatchlist(contentId: String) {
        viewModelScope.launch {
            val current = _uiState.value.isInWatchlist
            if (current) {
                watchRepository.removeFromWatchlist(contentId)
            } else {
                watchRepository.addToWatchlist(contentId)
            }
            _uiState.update { it.copy(isInWatchlist = !current) }
        }
    }

    fun startDownload(quality: String = "Standard") {
        val content = _uiState.value.content ?: return
        val url = content.videoAssets.firstOrNull()?.masterUrl ?: return
        viewModelScope.launch {
            try {
                downloadManager.queueDownload(
                    id = content.id,
                    contentId = content.id,
                    episodeId = null,
                    title = content.title,
                    url = url,
                    quality = quality
                )
            } catch (e: Exception) {
                // Ignore download exception or log
            }
        }
    }

    fun startEpisodeDownload(episode: Episode, quality: String = "Standard") {
        val content = _uiState.value.content ?: return
        val url = episode.masterUrl ?: return
        viewModelScope.launch {
            try {
                downloadManager.queueDownload(
                    id = episode.id,
                    contentId = content.id,
                    episodeId = episode.id,
                    title = episode.title,
                    url = url,
                    quality = quality
                )
            } catch (e: Exception) {
                // Ignore or log
            }
        }
    }

    fun cancelOrDeleteDownload(id: String) {
        viewModelScope.launch {
            val asset = downloadedAssetDao.getById(id)
            if (asset != null) {
                if (asset.downloadState == "DOWNLOADING" || asset.downloadState == "PENDING") {
                    downloadManager.cancelDownload(id)
                } else {
                    downloadManager.deleteDownload(id)
                }
            }
        }
    }
}
