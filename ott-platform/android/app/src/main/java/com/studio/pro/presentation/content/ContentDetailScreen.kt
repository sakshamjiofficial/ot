package com.studio.pro.presentation.content

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.studio.pro.domain.model.*
import com.studio.pro.presentation.common.OttColors

@Composable
fun ContentDetailScreen(
    contentId:     String,
    onBack:        () -> Unit,
    onPlayMovie:   (String) -> Unit,
    onPlayEpisode: (String) -> Unit,
    viewModel:     ContentDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(contentId) { viewModel.loadContent(contentId) }

    Box(modifier = Modifier.fillMaxSize().background(OttColors.Background)) {
        when {
            uiState.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = OttColors.Brand)
            }
            uiState.error != null -> ErrorView(message = uiState.error!!, onRetry = { viewModel.loadContent(contentId) })
            uiState.content != null -> ContentDetailBody(
                content       = uiState.content!!,
                watchProgress = uiState.watchProgress,
                isInWatchlist = uiState.isInWatchlist,
                downloads     = uiState.downloads,
                onBack        = onBack,
                onPlay        = { if (uiState.content!!.type == ContentType.MOVIE) onPlayMovie(contentId) },
                onPlayEpisode = onPlayEpisode,
                onToggleWatchlist = { viewModel.toggleWatchlist(contentId) },
                onDownloadMovie  = { viewModel.startDownload() },
                onDownloadEpisode = { episode -> viewModel.startEpisodeDownload(episode) },
                onCancelOrDeleteDownload = { id -> viewModel.cancelOrDeleteDownload(id) }
            )
        }
    }
}

@Composable
private fun ContentDetailBody(
    content:          Content,
    watchProgress:    WatchProgress?,
    isInWatchlist:    Boolean,
    downloads:        Map<String, com.studio.pro.data.local.database.DownloadedAssetEntity>,
    onBack:           () -> Unit,
    onPlay:           () -> Unit,
    onPlayEpisode:    (String) -> Unit,
    onToggleWatchlist: () -> Unit,
    onDownloadMovie:  () -> Unit,
    onDownloadEpisode: (Episode) -> Unit,
    onCancelOrDeleteDownload: (String) -> Unit,
) {
    var selectedSeason by remember { mutableIntStateOf(0) }
    val isSeries       = content.type == ContentType.SERIES
    val pct            = if (watchProgress != null && (watchProgress.totalSeconds ?: 0) > 0)
        watchProgress.watchedSeconds.toFloat() / watchProgress.totalSeconds!! else 0f

    LazyColumn(modifier = Modifier.fillMaxSize()) {

        // ── Hero Image ──────────────────────────────────────
        item {
            Box(modifier = Modifier.fillMaxWidth().height(280.dp)) {
                AsyncImage(
                    model             = content.bannerUrl ?: content.posterUrl,
                    contentDescription = content.title,
                    contentScale      = ContentScale.Crop,
                    modifier          = Modifier.fillMaxSize(),
                )
                Box(modifier = Modifier.fillMaxSize().background(
                    Brush.verticalGradient(listOf(Color.Black.copy(0.4f), Color.Transparent, OttColors.Background))
                ))
                IconButton(onClick = onBack, modifier = Modifier.statusBarsPadding().padding(8.dp)) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
                }
            }
        }

        // ── Content Info ────────────────────────────────────
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Spacer(Modifier.height(8.dp))

                // Title + Premium badge
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(content.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp, modifier = Modifier.weight(1f))
                    if (content.isPremium) {
                        Box(Modifier.background(OttColors.Brand, RoundedCornerShape(4.dp)).padding(horizontal = 8.dp, vertical = 3.dp)) {
                            Text("PREMIUM", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(Modifier.height(6.dp))

                // Meta row
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    content.releaseYear?.let { Text("$it", color = OttColors.TextMuted, fontSize = 13.sp) }
                    content.ageRating?.let { Text(it, color = OttColors.TextMuted, fontSize = 13.sp) }
                    content.durationSeconds?.let { Text(formatDuration(it), color = OttColors.TextMuted, fontSize = 13.sp) }
                    content.imdbRating?.let { Text("⭐ $it", color = OttColors.TextMuted, fontSize = 13.sp) }
                }

                // Genre chips
                if (content.genres.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        content.genres.forEach { genre ->
                            Box(Modifier.background(OttColors.SurfaceElevated, RoundedCornerShape(4.dp)).padding(horizontal = 8.dp, vertical = 3.dp)) {
                                Text(genre.name, color = OttColors.TextSecondary, fontSize = 11.sp)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Play + Watchlist + Download buttons
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Button(
                        onClick  = onPlay,
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape    = RoundedCornerShape(8.dp),
                        colors   = ButtonDefaults.buttonColors(containerColor = Color.White),
                    ) {
                        Icon(Icons.Default.PlayArrow, null, tint = Color.Black)
                        Spacer(Modifier.width(6.dp))
                        Text(
                            if (watchProgress != null && !watchProgress.completed) "Resume" else "Play",
                            color = Color.Black, fontWeight = FontWeight.SemiBold,
                        )
                    }
                    OutlinedButton(
                        onClick  = onToggleWatchlist,
                        modifier = Modifier.height(48.dp),
                        shape    = RoundedCornerShape(8.dp),
                        border   = BorderStroke(1.dp, if (isInWatchlist) OttColors.Brand else OttColors.Border),
                    ) {
                        Icon(
                            if (isInWatchlist) Icons.Default.BookmarkAdded else Icons.Default.BookmarkBorder,
                            null, tint = if (isInWatchlist) OttColors.Brand else Color.White,
                        )
                    }

                    if (content.type == ContentType.MOVIE) {
                        val download = downloads[content.id]
                        val state = download?.downloadState ?: "NOT_DOWNLOADED"
                        val progress = download?.progress ?: 0f

                        OutlinedButton(
                            onClick  = {
                                if (state == "DOWNLOADING" || state == "PENDING" || state == "COMPLETED") {
                                    onCancelOrDeleteDownload(content.id)
                                } else {
                                    onDownloadMovie()
                                }
                            },
                            modifier = Modifier.height(48.dp),
                            shape    = RoundedCornerShape(8.dp),
                            border   = BorderStroke(1.dp, if (state == "COMPLETED") OttColors.Brand else OttColors.Border),
                        ) {
                            when (state) {
                                "PENDING", "DOWNLOADING" -> {
                                    Box(contentAlignment = Alignment.Center) {
                                        CircularProgressIndicator(
                                            progress = { progress / 100f },
                                            modifier = Modifier.size(20.dp),
                                            color = OttColors.Brand,
                                            strokeWidth = 2.dp
                                        )
                                        Icon(
                                            Icons.Default.Close,
                                            null,
                                            tint = Color.White,
                                            modifier = Modifier.size(10.dp)
                                        )
                                    }
                                }
                                "COMPLETED" -> {
                                    Icon(Icons.Default.DownloadDone, null, tint = OttColors.Brand)
                                }
                                else -> {
                                    Icon(Icons.Default.Download, null, tint = Color.White)
                                }
                            }
                        }
                    }
                }

                // Resume progress bar
                if (pct > 0f && !watchProgress!!.completed) {
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { pct },
                        modifier = Modifier.fillMaxWidth().height(3.dp).clip(RoundedCornerShape(2.dp)),
                        color    = OttColors.Brand,
                        trackColor = OttColors.Border,
                    )
                }

                Spacer(Modifier.height(16.dp))

                // Description
                content.description?.let { desc ->
                    Text(desc, color = OttColors.TextSecondary, fontSize = 14.sp, lineHeight = 22.sp)
                    Spacer(Modifier.height(16.dp))
                }
            }
        }

        // ── Episodes (series) ───────────────────────────────
        if (isSeries && content.seasons.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text("Episodes", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(10.dp))

                    // Season tabs
                    if (content.seasons.size > 1) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            itemsIndexed(content.seasons) { index, season ->
                                FilterChip(
                                    selected = selectedSeason == index,
                                    onClick  = { selectedSeason = index },
                                    label    = { Text("Season ${season.seasonNumber}") },
                                    colors   = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor     = OttColors.Brand,
                                        selectedLabelColor         = Color.White,
                                        containerColor             = OttColors.SurfaceVariant,
                                        labelColor                 = OttColors.TextSecondary,
                                    ),
                                )
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }

            val currentSeason = content.seasons.getOrNull(selectedSeason)
            currentSeason?.episodes?.forEach { episode ->
                item(key = episode.id) {
                    val download = downloads[episode.id]
                    EpisodeRow(
                        episode    = episode,
                        download   = download,
                        onDownloadClick = {
                            val state = download?.downloadState ?: "NOT_DOWNLOADED"
                            if (state == "DOWNLOADING" || state == "PENDING" || state == "COMPLETED") {
                                onCancelOrDeleteDownload(episode.id)
                            } else {
                                onDownloadEpisode(episode)
                            }
                        },
                        onClick    = { onPlayEpisode(episode.id) },
                    )
                }
            }
        }

        item { Spacer(Modifier.height(32.dp)) }
    }
}

@Composable
private fun EpisodeRow(
    episode: Episode,
    download: com.studio.pro.data.local.database.DownloadedAssetEntity?,
    onDownloadClick: () -> Unit,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(120.dp, 68.dp)
                .background(OttColors.SurfaceVariant, RoundedCornerShape(6.dp)),
        ) {
            AsyncImage(
                model              = episode.thumbnailUrl,
                contentDescription = episode.title,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
            Box(Modifier.fillMaxSize().background(Color.Black.copy(0.3f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.PlayCircleOutline, null, tint = Color.White.copy(0.8f), modifier = Modifier.size(30.dp))
            }
            if (episode.isPremium) {
                Box(Modifier.align(Alignment.TopEnd).padding(4.dp).background(OttColors.Brand, RoundedCornerShape(3.dp)).padding(horizontal = 4.dp, vertical = 1.dp)) {
                    Text("PRO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text("E${episode.episodeNumber} · ${episode.title}", color = Color.White, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 14.sp)
            episode.durationSeconds?.let {
                Text(formatDuration(it), color = OttColors.TextMuted, fontSize = 12.sp)
            }
            episode.description?.let {
                Text(it, color = OttColors.TextMuted, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }

        val state = download?.downloadState ?: "NOT_DOWNLOADED"
        val progress = download?.progress ?: 0f

        IconButton(
            onClick = onDownloadClick,
            modifier = Modifier.size(40.dp)
        ) {
            when (state) {
                "PENDING", "DOWNLOADING" -> {
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            progress = { progress / 100f },
                            modifier = Modifier.size(24.dp),
                            color = OttColors.Brand,
                            strokeWidth = 2.dp
                        )
                        Icon(
                            Icons.Default.Close,
                            null,
                            tint = Color.White,
                            modifier = Modifier.size(10.dp)
                        )
                    }
                }
                "COMPLETED" -> {
                    Icon(Icons.Default.DownloadDone, null, tint = OttColors.Brand)
                }
                else -> {
                    Icon(Icons.Default.Download, null, tint = OttColors.TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun ErrorView(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.ErrorOutline, null, tint = OttColors.Brand, modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(12.dp))
            Text(message, color = OttColors.TextSecondary, fontSize = 15.sp)
            Spacer(Modifier.height(16.dp))
            Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = OttColors.Brand)) {
                Text("Retry")
            }
        }
    }
}

private fun formatDuration(secs: Int): String {
    val h = secs / 3600; val m = (secs % 3600) / 60
    return if (h > 0) "${h}h ${m}m" else "${m}m"
}
