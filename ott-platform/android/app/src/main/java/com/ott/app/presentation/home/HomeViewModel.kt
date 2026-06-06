package com.ott.app.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ott.app.domain.model.Content
import com.ott.app.domain.model.Genre
import com.ott.app.domain.model.WatchProgress
import com.ott.app.domain.repository.ContentRepository
import com.ott.app.domain.repository.Resource
import com.ott.app.domain.repository.WatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading:        Boolean            = true,
    val featured:         List<Content>      = emptyList(),
    val trending:         List<Content>      = emptyList(),
    val recentlyAdded:    List<Content>      = emptyList(),
    val continueWatching: List<WatchProgress> = emptyList(),
    val genres:           List<Genre>        = emptyList(),
    val error:            String?            = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val watchRepository:   WatchRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init { loadHome() }

    fun loadHome() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Load featured
            contentRepository.getFeatured()
                .collect { result ->
                    when (result) {
                        is Resource.Success ->
                            _uiState.update { it.copy(featured = result.data) }
                        is Resource.Error   ->
                            _uiState.update { it.copy(error = result.message) }
                        is Resource.Loading -> Unit
                    }
                }
        }

        viewModelScope.launch {
            contentRepository.getTrending().collect { result ->
                if (result is Resource.Success)
                    _uiState.update { it.copy(trending = result.data) }
            }
        }

        viewModelScope.launch {
            contentRepository.getRecentlyAdded().collect { result ->
                if (result is Resource.Success)
                    _uiState.update { it.copy(recentlyAdded = result.data, isLoading = false) }
            }
        }

        viewModelScope.launch {
            watchRepository.getContinueWatching().collect { items ->
                _uiState.update { it.copy(continueWatching = items) }
            }
        }

        viewModelScope.launch {
            contentRepository.getGenres().collect { result ->
                if (result is Resource.Success)
                    _uiState.update { it.copy(genres = result.data) }
            }
        }
    }

    fun refresh() { loadHome() }
}
