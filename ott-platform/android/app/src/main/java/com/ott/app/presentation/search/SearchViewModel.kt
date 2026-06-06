package com.ott.app.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ott.app.domain.model.Content
import com.ott.app.domain.repository.ContentRepository
import com.ott.app.domain.repository.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class SearchUiState(
    val isLoading: Boolean       = false,
    val results:   List<Content> = emptyList(),
    val error:     String?       = null,
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    fun search(query: String) {
        searchJob?.cancel()
        if (query.isBlank()) {
            _state.value = SearchUiState()
            return
        }
        searchJob = viewModelScope.launch {
            delay(300L)  // debounce
            _state.update { it.copy(isLoading = true, error = null) }
            contentRepository.search(query).collect { result ->
                when (result) {
                    is Resource.Success ->
                        _state.update { it.copy(isLoading = false, results = result.data) }
                    is Resource.Error   ->
                        _state.update { it.copy(isLoading = false, error = result.message) }
                    is Resource.Loading -> Unit
                }
            }
        }
    }
}
