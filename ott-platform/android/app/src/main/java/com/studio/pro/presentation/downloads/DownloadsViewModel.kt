package com.studio.pro.presentation.downloads

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studio.pro.data.local.database.DownloadedAssetDao
import com.studio.pro.data.local.database.DownloadedAssetEntity
import com.studio.pro.download.DownloadManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DownloadsViewModel @Inject constructor(
    private val downloadedAssetDao: DownloadedAssetDao,
    private val downloadManager: DownloadManager,
) : ViewModel() {

    val downloads: StateFlow<List<DownloadedAssetEntity>> = downloadedAssetDao.getAll()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun deleteDownload(id: String) {
        viewModelScope.launch {
            downloadManager.deleteDownload(id)
        }
    }

    fun cancelDownload(id: String) {
        viewModelScope.launch {
            downloadManager.cancelDownload(id)
        }
    }
}
