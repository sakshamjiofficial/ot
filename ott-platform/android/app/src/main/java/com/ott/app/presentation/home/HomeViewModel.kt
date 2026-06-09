package com.ott.app.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ott.app.domain.model.*
import com.ott.app.domain.repository.AuthRepository
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
    val currentUser:      User?              = null,
    val watchlistIds:     Set<String>        = emptySet(),
    val error:            String?            = null,
    val homeSections:     List<HomeSection>  = emptyList(),
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val watchRepository:   WatchRepository,
    private val authRepository:    AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init { loadHome() }

    fun loadHome() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            contentRepository.getHomeFeed().collect { result ->
                when (result) {
                    is Resource.Success -> {
                        val sections = result.data
                        _uiState.update { state ->
                            val featuredSection = sections.find { it.sectionType == "featured" }
                            val trendingSection = sections.find { it.sectionType == "trending" }
                            val recentSection = sections.find { it.sectionType == "recently_added" }
                            val continueSection = sections.find { it.sectionType == "continue_watching" }

                            state.copy(
                                homeSections = sections,
                                isLoading = false,
                                featured = featuredSection?.items ?: state.featured,
                                trending = trendingSection?.items ?: state.trending,
                                recentlyAdded = recentSection?.items ?: state.recentlyAdded,
                                continueWatching = if (continueSection != null && continueSection.progressItems.isNotEmpty()) {
                                    continueSection.progressItems
                                } else {
                                    state.continueWatching
                                }
                            )
                        }
                    }
                    is Resource.Error -> {
                        _uiState.update { it.copy(error = result.message, isLoading = false) }
                    }
                    is Resource.Loading -> {
                        _uiState.update { it.copy(isLoading = true) }
                    }
                }
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

        viewModelScope.launch {
            val user = authRepository.getCurrentUser()
            _uiState.update { it.copy(currentUser = user) }
        }

        viewModelScope.launch {
            watchRepository.getWatchlist().collect { result ->
                if (result is Resource.Success) {
                    _uiState.update { it.copy(watchlistIds = result.data.map { it.id }.toSet()) }
                }
            }
        }
    }

    fun toggleWatchlist(contentId: String) {
        viewModelScope.launch {
            val isCurrentlyAdded = _uiState.value.watchlistIds.contains(contentId)
            val result = if (isCurrentlyAdded) {
                watchRepository.removeFromWatchlist(contentId)
            } else {
                watchRepository.addToWatchlist(contentId)
            }
            if (result is Resource.Success) {
                _uiState.update { state ->
                    val newIds = state.watchlistIds.toMutableSet()
                    if (isCurrentlyAdded) newIds.remove(contentId) else newIds.add(contentId)
                    state.copy(watchlistIds = newIds)
                }
            }
        }
    }

    fun refresh() { loadHome() }
}
