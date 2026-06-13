package com.studio.pro.presentation.content

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studio.pro.domain.model.Content
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
)

@HiltViewModel
class ContentDetailViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val watchRepository:   WatchRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ContentDetailUiState())
    val uiState: StateFlow<ContentDetailUiState> = _uiState.asStateFlow()

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
}
