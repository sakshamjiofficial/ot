package com.ott.app.presentation.home

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.pager.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.ott.app.domain.model.*
import com.ott.app.presentation.common.OttColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    onContentClick: (String) -> Unit,
    onSearchClick:  () -> Unit,
    onProfileClick: () -> Unit,
    viewModel:      HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Box(modifier = Modifier.fillMaxSize().background(OttColors.Background)) {
        if (uiState.isLoading && uiState.featured.isEmpty()) {
            HomeSkeletonLoader()
        } else {
            LazyColumn(
                modifier            = Modifier.fillMaxSize(),
                contentPadding      = PaddingValues(bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                // ── Top App Bar ──────────────────────────────
                item {
                    HomeTopBar(
                        onSearchClick  = onSearchClick,
                        onProfileClick = onProfileClick,
                    )
                }

                // ── Hero Banner ───────────────────────────────
                if (uiState.featured.isNotEmpty()) {
                    item {
                        HeroBanner(
                            items          = uiState.featured,
                            onContentClick = onContentClick,
                        )
                    }
                }

                // ── Continue Watching ─────────────────────────
                if (uiState.continueWatching.isNotEmpty()) {
                    item {
                        ContentRow(
                            title  = "Continue Watching",
                            items  = uiState.continueWatching.mapNotNull { it.content },
                            onItemClick    = onContentClick,
                            showProgress   = true,
                            progressItems  = uiState.continueWatching,
                            cardStyle      = CardStyle.WIDE,
                        )
                    }
                }

                // ── Trending ──────────────────────────────────
                if (uiState.trending.isNotEmpty()) {
                    item {
                        ContentRow(
                            title       = "Trending Now",
                            items       = uiState.trending,
                            onItemClick = onContentClick,
                            cardStyle   = CardStyle.STANDARD,
                            showRank    = true,
                        )
                    }
                }

                // ── New Releases ──────────────────────────────
                if (uiState.recentlyAdded.isNotEmpty()) {
                    item {
                        ContentRow(
                            title       = "New Releases",
                            items       = uiState.recentlyAdded,
                            onItemClick = onContentClick,
                            cardStyle   = CardStyle.STANDARD,
                        )
                    }
                }

                // ── Genre rows ────────────────────────────────
                items(uiState.genres.take(5)) { genre ->
                    GenreRow(
                        genre          = genre,
                        onContentClick = onContentClick,
                    )
                }
            }
        }
    }
}

// ─── Top App Bar ──────────────────────────────────────────────

@Composable
private fun HomeTopBar(
    onSearchClick:  () -> Unit,
    onProfileClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        // Logo
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(OttColors.Brand),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Text("OTT", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, letterSpacing = 1.sp)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            IconButton(onClick = onSearchClick) {
                Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.White)
            }
            IconButton(onClick = onProfileClick) {
                Icon(Icons.Default.AccountCircle, contentDescription = "Profile", tint = Color.White)
            }
        }
    }
}

// ─── Hero Banner Pager ────────────────────────────────────────

@Composable
private fun HeroBanner(
    items:          List<Content>,
    onContentClick: (String) -> Unit,
) {
    val pagerState  = rememberPagerState { items.size }
    val scope       = rememberCoroutineScope()

    // Auto-scroll every 5 seconds
    LaunchedEffect(Unit) {
        while (true) {
            delay(5000L)
            val next = (pagerState.currentPage + 1) % items.size
            scope.launch { pagerState.animateScrollToPage(next) }
        }
    }

    Box(modifier = Modifier.fillMaxWidth().height(480.dp)) {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
            val item = items[page]
            Box(modifier = Modifier.fillMaxSize()) {
                // Banner image
                AsyncImage(
                    model             = item.bannerUrl ?: item.posterUrl,
                    contentDescription = item.title,
                    contentScale      = ContentScale.Crop,
                    modifier          = Modifier.fillMaxSize(),
                )

                // Gradient overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0.0f to Color.Transparent,
                                0.5f to Color.Black.copy(alpha = 0.3f),
                                1.0f to OttColors.Background,
                            )
                        )
                )

                // Content info
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(horizontal = 20.dp, vertical = 24.dp)
                        .fillMaxWidth(0.65f),
                ) {
                    // Genre chips
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        item.genres.take(2).forEach { genre ->
                            Text(
                                text     = genre.name,
                                color    = Color.White.copy(alpha = 0.7f),
                                fontSize = 11.sp,
                                modifier = Modifier
                                    .border(1.dp, Color.White.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                    }

                    Spacer(Modifier.height(8.dp))

                    Text(
                        text       = item.title,
                        color      = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize   = 26.sp,
                        maxLines   = 2,
                        overflow   = TextOverflow.Ellipsis,
                        lineHeight = 30.sp,
                    )

                    item.shortDescription?.let { desc ->
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text     = desc,
                            color    = Color.White.copy(alpha = 0.75f),
                            fontSize = 13.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }

                    Spacer(Modifier.height(16.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { onContentClick(item.id) },
                            colors  = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape   = RoundedCornerShape(6.dp),
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Play", color = Color.Black, fontWeight = FontWeight.SemiBold)
                        }

                        OutlinedButton(
                            onClick = { onContentClick(item.id) },
                            border  = BorderStroke(1.dp, Color.White.copy(alpha = 0.5f)),
                            shape   = RoundedCornerShape(6.dp),
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("More Info", color = Color.White)
                        }
                    }
                }
            }
        }

        // Page dots
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            repeat(items.size) { index ->
                Box(
                    modifier = Modifier
                        .width(if (index == pagerState.currentPage) 20.dp else 4.dp)
                        .height(4.dp)
                        .clip(CircleShape)
                        .background(if (index == pagerState.currentPage) OttColors.Brand else Color.White.copy(alpha = 0.4f))
                )
            }
        }
    }
}

// ─── Content Row ──────────────────────────────────────────────

enum class CardStyle { STANDARD, WIDE }

@Composable
private fun ContentRow(
    title:         String,
    items:         List<Content>,
    onItemClick:   (String) -> Unit,
    cardStyle:     CardStyle = CardStyle.STANDARD,
    showRank:      Boolean = false,
    showProgress:  Boolean = false,
    progressItems: List<WatchProgress> = emptyList(),
) {
    Column(modifier = Modifier.padding(vertical = 12.dp)) {
        Text(
            text       = title,
            color      = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize   = 17.sp,
            modifier   = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )

        LazyRow(
            contentPadding      = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            itemsIndexed(items) { index, item ->
                val progress = if (showProgress) {
                    progressItems.find { it.contentId == item.id }
                } else null

                when (cardStyle) {
                    CardStyle.STANDARD -> ContentCard(
                        item      = item,
                        onClick   = { onItemClick(item.id) },
                        rank      = if (showRank) index + 1 else null,
                    )
                    CardStyle.WIDE     -> WideContentCard(
                        item      = item,
                        onClick   = { onItemClick(item.id) },
                        progress  = progress,
                    )
                }
            }
        }
    }
}

// ─── Standard Content Card ────────────────────────────────────

@Composable
private fun ContentCard(
    item:    Content,
    onClick: () -> Unit,
    rank:    Int? = null,
) {
    Box(
        modifier = Modifier
            .width(120.dp)
            .clickable(onClick = onClick),
    ) {
        Column {
            Box(
                modifier = Modifier
                    .width(120.dp)
                    .height(175.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(OttColors.SurfaceVariant),
            ) {
                AsyncImage(
                    model              = item.posterUrl ?: item.thumbnailUrl,
                    contentDescription = item.title,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )
                if (item.isPremium) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(OttColors.Brand)
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                    ) {
                        Text("PRO", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }

            Spacer(Modifier.height(5.dp))
            Text(
                text     = item.title,
                color    = Color.White.copy(alpha = 0.9f),
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text     = item.releaseYear?.toString() ?: "",
                color    = Color.White.copy(alpha = 0.5f),
                fontSize = 11.sp,
            )
        }

        // Rank number (trending)
        rank?.let { n ->
            Text(
                text       = "$n",
                color      = Color.White,
                fontWeight = FontWeight.ExtraBold,
                fontSize   = 56.sp,
                modifier   = Modifier
                    .align(Alignment.BottomStart)
                    .offset(x = (-8).dp, y = 12.dp),
                style      = LocalTextStyle.current.copy(
                    shadow = androidx.compose.ui.graphics.Shadow(
                        color = Color.Black,
                        blurRadius = 4f,
                    )
                ),
            )
        }
    }
}

// ─── Wide Card (continue watching) ───────────────────────────

@Composable
private fun WideContentCard(
    item:     Content,
    onClick:  () -> Unit,
    progress: WatchProgress?,
) {
    val pct = if (progress != null && (progress.totalSeconds ?: 0) > 0) {
        (progress.watchedSeconds.toFloat() / progress.totalSeconds!!.toFloat()).coerceIn(0f, 1f)
    } else 0f

    Column(
        modifier = Modifier.width(180.dp).clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .width(180.dp)
                .height(100.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(OttColors.SurfaceVariant),
        ) {
            AsyncImage(
                model              = item.bannerUrl ?: item.thumbnailUrl,
                contentDescription = item.title,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
            // Play icon overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.PlayCircle, contentDescription = null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(36.dp))
            }

            // Progress bar at bottom
            if (pct > 0f) {
                Box(modifier = Modifier.fillMaxWidth().height(3.dp).align(Alignment.BottomCenter)) {
                    Box(modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.3f)))
                    Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(pct).background(OttColors.Brand))
                }
            }
        }
        Spacer(Modifier.height(5.dp))
        Text(item.title, color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ─── Genre Row ────────────────────────────────────────────────

@Composable
private fun GenreRow(
    genre:          Genre,
    onContentClick: (String) -> Unit,
    viewModel:      HomeViewModel = hiltViewModel(),
) {
    // Genre-specific content — in a real app use a GenreViewModel or pass data down
    ContentRow(
        title       = genre.name,
        items       = viewModel.uiState.collectAsStateWithLifecycle().value.trending
            .filter { it.genres.any { g -> g.id == genre.id } },
        onItemClick = onContentClick,
    )
}

// ─── Skeleton Loader ──────────────────────────────────────────

@Composable
private fun HomeSkeletonLoader() {
    val shimmerBrush = Brush.horizontalGradient(
        colors = listOf(OttColors.Surface, OttColors.SurfaceVariant, OttColors.Surface),
    )
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Box(modifier = Modifier.fillMaxWidth().height(480.dp).background(shimmerBrush))
        }
        items(3) {
            Column(modifier = Modifier.padding(vertical = 12.dp)) {
                Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp).width(140.dp).height(18.dp).clip(RoundedCornerShape(4.dp)).background(shimmerBrush))
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(5) {
                        Box(modifier = Modifier.width(120.dp).height(175.dp).clip(RoundedCornerShape(8.dp)).background(shimmerBrush))
                    }
                }
            }
        }
    }
}
