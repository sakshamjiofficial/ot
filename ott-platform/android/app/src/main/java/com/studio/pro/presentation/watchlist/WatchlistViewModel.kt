package com.studio.pro.presentation.watchlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studio.pro.domain.model.Content
import com.studio.pro.domain.repository.Resource
import com.studio.pro.domain.repository.WatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WatchlistUiState(
    val isLoading: Boolean       = false,
    val items:     List<Content> = emptyList(),
    val error:     String?       = null,
)

@HiltViewModel
class WatchlistViewModel @Inject constructor(
    private val watchRepository: WatchRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WatchlistUiState())
    val uiState: StateFlow<WatchlistUiState> = _uiState.asStateFlow()

    init {
        loadWatchlist()
    }

    fun loadWatchlist() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            watchRepository.getWatchlist().collect { result ->
                when (result) {
                    is Resource.Success -> {
                        _uiState.update { it.copy(isLoading = false, items = result.data) }
                    }
                    is Resource.Error -> {
                        _uiState.update { it.copy(isLoading = false, error = result.message) }
                    }
                    is Resource.Loading -> {
                        _uiState.update { it.copy(isLoading = true) }
                    }
                }
            }
        }
    }

    fun removeFromWatchlist(contentId: String) {
        viewModelScope.launch {
            val result = watchRepository.removeFromWatchlist(contentId)
            if (result is Resource.Success) {
                // Update local items state directly for instant feedback
                _uiState.update { state ->
                    state.copy(items = state.items.filter { it.id != contentId })
                }
            }
        }
    }
}
