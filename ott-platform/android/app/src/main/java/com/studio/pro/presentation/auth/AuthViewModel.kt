package com.studio.pro.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studio.pro.domain.model.User
import com.studio.pro.domain.repository.AuthRepository
import com.studio.pro.domain.repository.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthUiState {
    object Idle     : AuthUiState()
    object Loading  : AuthUiState()
    data class Success(val user: User) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    val isLoggedIn: StateFlow<Boolean> = authRepository
        .isLoggedIn()
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = authRepository.login(email.trim(), password)) {
                is Resource.Success -> _uiState.value = AuthUiState.Success(result.data)
                is Resource.Error   -> _uiState.value = AuthUiState.Error(result.message)
                is Resource.Loading -> Unit
            }
        }
    }

    fun register(email: String, password: String, displayName: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = authRepository.register(email.trim(), password, displayName.trim().ifBlank { null })) {
                is Resource.Success -> _uiState.value = AuthUiState.Success(result.data)
                is Resource.Error   -> _uiState.value = AuthUiState.Error(result.message)
                is Resource.Loading -> Unit
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = AuthUiState.Idle
        }
    }

    private val _defaultAvatars = MutableStateFlow<List<String>>(emptyList())
    val defaultAvatars: StateFlow<List<String>> = _defaultAvatars.asStateFlow()

    fun loadCurrentUser() {
        viewModelScope.launch {
            val user = authRepository.getCurrentUser()
            if (user != null) {
                _uiState.value = AuthUiState.Success(user)
            }
        }
    }

    fun updateProfile(displayName: String?, avatarUrl: String?, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            when (val result = authRepository.updateProfile(displayName?.trim()?.ifBlank { null }, avatarUrl)) {
                is Resource.Success -> {
                    _uiState.value = AuthUiState.Success(result.data)
                    onSuccess()
                }
                is Resource.Error   -> _uiState.value = AuthUiState.Error(result.message)
                is Resource.Loading -> Unit
            }
        }
    }

    fun loadDefaultAvatars() {
        viewModelScope.launch {
            when (val result = authRepository.getDefaultAvatars()) {
                is Resource.Success -> _defaultAvatars.value = result.data
                else -> Unit
            }
        }
    }

    fun resetState() {
        _uiState.value = AuthUiState.Idle
    }
}
