package com.studio.pro.presentation.downloads

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.DownloadDone
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.studio.pro.data.local.database.DownloadedAssetEntity
import com.studio.pro.presentation.common.OttColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DownloadsScreen(
    onBack: () -> Unit,
    onPlayContent: (String) -> Unit,
    onPlayEpisode: (String) -> Unit,
    viewModel: DownloadsViewModel = hiltViewModel(),
) {
    val downloads by viewModel.downloads.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Offline Downloads", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = OttColors.Background
                )
            )
        },
        containerColor = OttColors.Background
    ) { paddingValues ->
        if (downloads.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Text("No downloaded videos yet.", color = OttColors.TextSecondary, fontSize = 16.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(downloads, key = { it.id }) { asset ->
                    DownloadItemRow(
                        asset = asset,
                        onPlayClick = {
                            if (asset.episodeId != null) {
                                onPlayEpisode(asset.episodeId)
                            } else {
                                onPlayContent(asset.id)
                            }
                        },
                        onDeleteClick = {
                            if (asset.downloadState == "DOWNLOADING" || asset.downloadState == "PENDING") {
                                viewModel.cancelDownload(asset.id)
                            } else {
                                viewModel.deleteDownload(asset.id)
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun DownloadItemRow(
    asset: DownloadedAssetEntity,
    onPlayClick: () -> Unit,
    onDeleteClick: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = OttColors.SurfaceVariant),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = asset.title,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = asset.quality,
                        color = OttColors.Brand,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp
                    )
                    Text(
                        text = "·",
                        color = OttColors.TextMuted,
                        fontSize = 12.sp
                    )
                    Text(
                        text = asset.downloadState,
                        color = when (asset.downloadState) {
                            "COMPLETED" -> Color.Green
                            "FAILED" -> Color.Red
                            else -> OttColors.TextSecondary
                        },
                        fontSize = 12.sp
                    )
                }
                if (asset.downloadState == "DOWNLOADING" || asset.downloadState == "PENDING") {
                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { asset.progress / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = OttColors.Brand,
                        trackColor = OttColors.Border
                    )
                }
            }
            if (asset.downloadState == "COMPLETED") {
                IconButton(
                    onClick = onPlayClick,
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color.White)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = Color.Black)
                }
            }
            IconButton(onClick = onDeleteClick) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Red)
            }
        }
    }
}
