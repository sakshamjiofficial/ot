package com.ott.app.presentation.player

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.WindowManager
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.ott.app.presentation.common.OttColors
import com.ott.app.player.ExoPlayerManager
import kotlin.math.abs

@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    contentId: String? = null,
    episodeId: String? = null,
    onBack:    () -> Unit,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    val uiState     by viewModel.uiState.collectAsStateWithLifecycle()
    val playerState by viewModel.playerState.collectAsStateWithLifecycle()
    val context     = LocalContext.current as Activity

    // Lock to landscape
    LaunchedEffect(Unit) {
        context.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        context.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        viewModel.loadStream(contentId, episodeId)
    }

    DisposableEffect(Unit) {
        onDispose {
            context.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            context.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ── ExoPlayer surface ─────────────────────────────────
        PlayerSurface(
            playerManager = viewModel.playerManager,
            modifier      = Modifier.fillMaxSize(),
            onClick       = { viewModel.toggleControls() },
        )

        // ── Buffering indicator ───────────────────────────────
        if (playerState.isBuffering || uiState.isLoadingStream) {
            CircularProgressIndicator(
                color    = OttColors.Brand,
                modifier = Modifier.align(Alignment.Center),
            )
        }

        // ── Error overlay ─────────────────────────────────────
        playerState.errorMessage?.let { msg ->
            ErrorOverlay(message = msg, onRetry = { viewModel.loadStream(contentId, episodeId) })
        }

        // ── Intro skip button ─────────────────────────────────
        AnimatedVisibility(
            visible = playerState.showIntroSkip,
            enter   = slideInHorizontally { it } + fadeIn(),
            exit    = slideOutHorizontally { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 24.dp, bottom = 80.dp),
        ) {
            Button(
                onClick = { viewModel.skipIntro() },
                colors  = ButtonDefaults.buttonColors(containerColor = Color.White),
                shape   = RoundedCornerShape(4.dp),
            ) {
                Text("Skip Intro", color = Color.Black, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Default.FastForward, contentDescription = null, tint = Color.Black)
            }
        }

        // ── Controls overlay ──────────────────────────────────
        if (!uiState.isLocked) {
            AnimatedVisibility(
                visible  = uiState.showControls,
                enter    = fadeIn(),
                exit     = fadeOut(),
                modifier = Modifier.fillMaxSize(),
            ) {
                PlayerControls(
                    uiState     = uiState,
                    playerState = playerState,
                    onBack      = onBack,
                    onTogglePlay  = { viewModel.togglePlayPause() },
                    onSeekForward = { viewModel.seekForward() },
                    onSeekBackward = { viewModel.seekBackward() },
                    onSeekTo      = { viewModel.seekTo(it) },
                    onQuality     = { viewModel.setQuality(it) },
                    onSubtitle    = { viewModel.setSubtitle(it) },
                    onAudioTrack  = { viewModel.setAudioTrack(it) },
                    onLock        = { viewModel.toggleLock() },
                    onNextEpisode = { viewModel.playNextEpisode() },
                )
            }
        }

        // ── Lock button (always visible when locked) ──────────
        if (uiState.isLocked) {
            LockButton(
                modifier = Modifier.align(Alignment.CenterEnd).padding(end = 16.dp),
                onUnlock = { viewModel.toggleLock() },
            )
        }
    }
}

// ─── Player Surface ──────────────────────────────────────────

@OptIn(UnstableApi::class)
@Composable
private fun PlayerSurface(
    playerManager: ExoPlayerManager,
    modifier:      Modifier,
    onClick:       () -> Unit,
) {
    val context = LocalContext.current
    AndroidView(
        factory = {
            PlayerView(context).apply {
                player               = playerManager.getOrCreatePlayer()
                useController        = false                              // we build our own UI
                resizeMode           = AspectRatioFrameLayout.RESIZE_MODE_FIT
                setBackgroundColor(android.graphics.Color.BLACK)
            }
        },
        modifier = modifier.clickable(
            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
            indication        = null,
            onClick           = onClick,
        ),
        update = { view -> view.player = playerManager.getOrCreatePlayer() },
    )
}

// ─── Full Controls Overlay ────────────────────────────────────

@Composable
private fun PlayerControls(
    uiState:        PlayerUiState,
    playerState:    com.ott.app.player.PlayerState,
    onBack:         () -> Unit,
    onTogglePlay:   () -> Unit,
    onSeekForward:  () -> Unit,
    onSeekBackward: () -> Unit,
    onSeekTo:       (Long) -> Unit,
    onQuality:      (String) -> Unit,
    onSubtitle:     (String?) -> Unit,
    onAudioTrack:   (String) -> Unit,
    onLock:         () -> Unit,
    onNextEpisode:  () -> Unit,
) {
    var showQualitySheet   by remember { mutableStateOf(false) }
    var showSubtitleSheet  by remember { mutableStateOf(false) }
    var showAudioSheet     by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent, Color.Black.copy(alpha = 0.8f)),
                )
            )
    ) {
        // ── Top bar ───────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
            }

            uiState.session?.let { session ->
                Column(modifier = Modifier.weight(1f).padding(horizontal = 8.dp)) {
                    Text(
                        text       = session.title,
                        color      = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize   = 15.sp,
                        maxLines   = 1,
                        overflow   = TextOverflow.Ellipsis,
                    )
                }
            }

            // Lock button
            IconButton(onClick = onLock) {
                Icon(Icons.Default.LockOpen, contentDescription = "Lock", tint = Color.White)
            }

            // Audio track
            if (uiState.session?.audioTracks?.size ?: 0 > 1) {
                IconButton(onClick = { showAudioSheet = true }) {
                    Icon(Icons.Default.RecordVoiceOver, contentDescription = "Audio", tint = Color.White)
                }
            }

            // Subtitles
            IconButton(onClick = { showSubtitleSheet = true }) {
                Icon(Icons.Default.Subtitles, contentDescription = "Subtitles", tint = Color.White)
            }

            // Quality
            IconButton(onClick = { showQualitySheet = true }) {
                Text(
                    text     = playerState.currentQuality,
                    color    = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        // ── Center controls ───────────────────────────────────
        Row(
            modifier = Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(32.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Seek back 10s
            PlayerControlButton(
                onClick = onSeekBackward,
                icon    = Icons.Rounded.Replay10,
                size    = 48.dp,
            )

            // Play/Pause
            PlayerControlButton(
                onClick = onTogglePlay,
                icon    = if (playerState.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                size    = 64.dp,
                filled  = true,
            )

            // Seek forward 10s
            PlayerControlButton(
                onClick = onSeekForward,
                icon    = Icons.Rounded.Forward10,
                size    = 48.dp,
            )
        }

        // ── Bottom bar ────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            // Time display
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text     = formatTime(playerState.currentPositionMs),
                    color    = Color.White,
                    fontSize = 13.sp,
                )
                Text(
                    text     = formatTime(playerState.durationMs),
                    color    = Color.White.copy(alpha = 0.6f),
                    fontSize = 13.sp,
                )
            }

            Spacer(Modifier.height(6.dp))

            // Seek bar
            SeekBar(
                positionMs = playerState.currentPositionMs,
                durationMs = playerState.durationMs,
                onSeek     = onSeekTo,
            )

            Spacer(Modifier.height(8.dp))

            // Next episode button
            uiState.session?.nextEpisode?.let { next ->
                if (playerState.currentPositionMs > 0 &&
                    playerState.durationMs > 0 &&
                    playerState.currentPositionMs >= playerState.durationMs - 60_000L) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                    ) {
                        OutlinedButton(
                            onClick = onNextEpisode,
                            border  = BorderStroke(1.dp, Color.White),
                        ) {
                            Text("Next: ${next.title}", color = Color.White, fontSize = 13.sp)
                            Spacer(Modifier.width(4.dp))
                            Icon(Icons.Default.SkipNext, contentDescription = null, tint = Color.White)
                        }
                    }
                }
            }
        }
    }

    // ── Sheets ────────────────────────────────────────────────
    if (showQualitySheet) {
        TrackSelectionSheet(
            title   = "Quality",
            options = playerState.availableQualities,
            current = playerState.currentQuality,
            onSelect = { onQuality(it); showQualitySheet = false },
            onDismiss = { showQualitySheet = false },
        )
    }

    if (showSubtitleSheet) {
        TrackSelectionSheet(
            title    = "Subtitles",
            options  = listOf("Off") + (uiState.session?.subtitles?.map { it.languageName } ?: emptyList()),
            current  = "Off",
            onSelect = { label ->
                val track = uiState.session?.subtitles?.find { it.languageName == label }
                onSubtitle(track?.languageCode)
                showSubtitleSheet = false
            },
            onDismiss = { showSubtitleSheet = false },
        )
    }

    if (showAudioSheet) {
        TrackSelectionSheet(
            title   = "Audio Track",
            options = uiState.session?.audioTracks?.map { it.languageName } ?: emptyList(),
            current = uiState.session?.audioTracks?.find { it.isDefault }?.languageName ?: "",
            onSelect = { label ->
                val track = uiState.session?.audioTracks?.find { it.languageName == label }
                track?.let { onAudioTrack(it.languageCode) }
                showAudioSheet = false
            },
            onDismiss = { showAudioSheet = false },
        )
    }
}

// ─── Seek Bar ─────────────────────────────────────────────────

@Composable
private fun SeekBar(
    positionMs: Long,
    durationMs: Long,
    onSeek:     (Long) -> Unit,
) {
    var isDragging    by remember { mutableStateOf(false) }
    var dragPosition  by remember { mutableFloatStateOf(0f) }

    val progress = if (durationMs > 0) {
        if (isDragging) dragPosition
        else (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else 0f

    Slider(
        value         = progress,
        onValueChange = { value ->
            isDragging   = true
            dragPosition = value
        },
        onValueChangeFinished = {
            isDragging = false
            onSeek((dragPosition * durationMs).toLong())
        },
        colors = SliderDefaults.colors(
            thumbColor            = OttColors.Brand,
            activeTrackColor      = OttColors.Brand,
            inactiveTrackColor    = Color.White.copy(alpha = 0.3f),
        ),
        modifier = Modifier.fillMaxWidth(),
    )
}

// ─── Track Selection Sheet ────────────────────────────────────

@Composable
private fun TrackSelectionSheet(
    title:    String,
    options:  List<String>,
    current:  String,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, color = Color.White) },
        text = {
            Column {
                options.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(option) }
                            .padding(vertical = 12.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(
                            selected = option == current,
                            onClick  = { onSelect(option) },
                            colors   = RadioButtonDefaults.colors(selectedColor = OttColors.Brand),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(option, color = Color.White, fontSize = 15.sp)
                    }
                }
            }
        },
        confirmButton = {},
        containerColor = Color(0xFF1A1A1A),
    )
}

// ─── Helper composables ───────────────────────────────────────

@Composable
private fun PlayerControlButton(
    onClick: () -> Unit,
    icon:    androidx.compose.ui.graphics.vector.ImageVector,
    size:    androidx.compose.ui.unit.Dp,
    filled:  Boolean = false,
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .then(
                if (filled) Modifier.background(Color.White.copy(alpha = 0.15f))
                else Modifier
            )
            .clickable(
                interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                indication        = null,
                onClick           = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector        = icon,
            contentDescription = null,
            tint               = Color.White,
            modifier           = Modifier.size(size * 0.55f),
        )
    }
}

@Composable
private fun ErrorOverlay(message: String, onRetry: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = OttColors.Brand, modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(12.dp))
            Text(message, color = Color.White, fontSize = 15.sp)
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onRetry,
                colors  = ButtonDefaults.buttonColors(containerColor = OttColors.Brand),
            ) {
                Text("Retry")
            }
        }
    }
}

@Composable
private fun LockButton(modifier: Modifier, onUnlock: () -> Unit) {
    IconButton(onClick = onUnlock, modifier = modifier) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.Lock, contentDescription = "Unlock", tint = Color.White)
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSecs = ms / 1000
    val hours = totalSecs / 3600
    val mins  = (totalSecs % 3600) / 60
    val secs  = totalSecs % 60
    return if (hours > 0)
        "%d:%02d:%02d".format(hours, mins, secs)
    else
        "%02d:%02d".format(mins, secs)
}
