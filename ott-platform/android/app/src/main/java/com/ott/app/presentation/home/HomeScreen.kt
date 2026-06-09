package com.ott.app.presentation.home

import androidx.compose.animation.*
import androidx.compose.animation.animateColorAsState
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
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.ott.app.domain.model.*
import com.ott.app.presentation.common.OttColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.ui.platform.LocalConfiguration

@Composable
fun HomeScreen(
    onContentClick: (String) -> Unit,
    onSearchClick:  () -> Unit,
    onProfileClick: () -> Unit,
    viewModel:      HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var selectedFilter by remember { mutableStateOf<String?>("Series") }
    var selectedGenre by remember { mutableStateOf<Genre?>(null) }
    var showCategoriesMenu by remember { mutableStateOf(false) }
    var selectedItem by remember { mutableStateOf(0) }

    Scaffold(
        bottomBar = {
            HomeBottomNavigationBar(
                selectedItem = selectedItem,
                avatarUrl = uiState.currentUser?.avatarUrl,
                onTabSelected = { index ->
                    selectedItem = index
                    when (index) {
                        2 -> onSearchClick()
                        3 -> onProfileClick()
                    }
                }
            )
        },
        containerColor = Color.Transparent
    ) { paddingValues ->
        val mainBackgroundGradient = Brush.verticalGradient(
            colors = listOf(
                Color(0xFF1A0808), // subtle deep reddish-brown
                Color(0xFF000000), // transitions to black
                Color(0xFF000000)  // pure black at bottom
            )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
                .background(mainBackgroundGradient)
        ) {
            if (uiState.isLoading && uiState.featured.isEmpty()) {
                HomeSkeletonLoader()
            } else {
                val listState = rememberLazyListState()
                val isScrolled by remember {
                    derivedStateOf {
                        listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 0
                    }
                }
                val headerBgColor by animateColorAsState(
                    targetValue = if (isScrolled) Color.Black else Color(0xFF1A0808),
                    label = "headerBgColor"
                )

                LazyColumn(
                    state               = listState,
                    modifier            = Modifier.fillMaxSize(),
                    contentPadding      = PaddingValues(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // ── Sticky Top Navigation Header ──────────────
                    stickyHeader {
                        var selectedTabIndex by remember { mutableStateOf(0) }

                        // Sync selectedTabIndex when filters change externally
                        LaunchedEffect(selectedFilter) {
                            selectedTabIndex = when (selectedFilter) {
                                "Series" -> 0
                                "Films" -> 1
                                "Games" -> 2
                                "New & Hot" -> 3
                                else -> 0
                            }
                        }

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(headerBgColor)
                                .statusBarsPadding()
                        ) {
                            HomeTopBar(
                                userName       = uiState.currentUser?.displayName ?: "JudyS",
                                avatarUrl      = uiState.currentUser?.avatarUrl,
                                onSearchClick  = onSearchClick,
                                onProfileClick = onProfileClick,
                            )

                            ScrollableTabRow(
                                selectedTabIndex = selectedTabIndex,
                                containerColor = Color.Transparent,
                                contentColor = Color.White,
                                edgePadding = 16.dp,
                                indicator = {},
                                divider = {},
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp)
                            ) {
                                val tabs = listOf(
                                    Triple("Shows", "Series", 0),
                                    Triple("Movies", "Films", 1),
                                    Triple("Games", "Games", 2),
                                    Triple("New & Hot", "New & Hot", 3)
                                )

                                tabs.forEach { (title, filter, index) ->
                                    val isSelected = selectedTabIndex == index
                                    Tab(
                                        selected = isSelected,
                                        onClick = {
                                            selectedTabIndex = index
                                            selectedFilter = filter
                                            selectedGenre = null
                                        },
                                        modifier = Modifier
                                            .padding(horizontal = 6.dp, vertical = 6.dp)
                                            .clip(RoundedCornerShape(50.dp))
                                            .background(if (isSelected) OttColors.Brand else Color(0xFF2B2B2B).copy(alpha = 0.7f))
                                            .border(
                                                width = 1.dp,
                                                color = if (isSelected) Color.Transparent else Color.White.copy(alpha = 0.15f),
                                                shape = RoundedCornerShape(50.dp)
                                            )
                                    ) {
                                        Text(
                                            text = title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color.White,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // ── Dynamic Sections ───────────────────────────
                    items(uiState.homeSections) { section ->
                        val filteredItems = section.items.filter { item ->
                            val matchesType = when (selectedFilter) {
                                "Series" -> item.type == ContentType.SERIES
                                "Films" -> item.type == ContentType.MOVIE
                                else -> true
                            }
                            val matchesGenre = selectedGenre == null || item.genres.any { it.id == selectedGenre!!.id }
                            matchesType && matchesGenre
                        }

                        if (filteredItems.isNotEmpty()) {
                            when (section.sectionType) {
                                "featured" -> {
                                    HeroBanner(
                                        items          = filteredItems,
                                        watchlistIds   = uiState.watchlistIds,
                                        onContentClick = onContentClick,
                                        viewModel      = viewModel,
                                    )
                                }
                                "continue_watching" -> {
                                    val filteredProgress = section.progressItems.filter { progress ->
                                        val item = progress.content ?: return@filter false
                                        val matchesType = when (selectedFilter) {
                                            "Series" -> item.type == ContentType.SERIES
                                            "Films" -> item.type == ContentType.MOVIE
                                            else -> true
                                        }
                                        val matchesGenre = selectedGenre == null || item.genres.any { it.id == selectedGenre!!.id }
                                        matchesType && matchesGenre
                                    }
                                    if (filteredProgress.isNotEmpty()) {
                                        ContentRow(
                                            title  = section.title,
                                            items  = filteredProgress.mapNotNull { it.content },
                                            onItemClick    = onContentClick,
                                            showProgress   = true,
                                            progressItems  = filteredProgress,
                                            cardStyle      = CardStyle.WIDE,
                                        )
                                    }
                                }
                                "trending" -> {
                                    ContentRow(
                                        title       = section.title,
                                        items       = filteredItems,
                                        onItemClick = onContentClick,
                                        cardStyle   = CardStyle.STANDARD,
                                        showRank    = true,
                                    )
                                }
                                else -> {
                                    ContentRow(
                                        title       = section.title,
                                        items       = filteredItems,
                                        onItemClick = onContentClick,
                                        cardStyle   = CardStyle.STANDARD,
                                    )
                                }
                            }
                        }
                    }
                }

        
            }
        }
    }
}

// ─── Top App Bar ──────────────────────────────────────────────

@Composable
private fun HomeTopBar(
    userName:       String,
    avatarUrl:      String?,
    onSearchClick:  () -> Unit,
    onProfileClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        // Left side: Vertical red brand logo icon + bold white title "Home"
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(8.dp)
                    .height(26.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(OttColors.Brand)
            )
            Text(
                text = "Home",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp
            )
        }

        // Right side: white Download tray icon + white Notification Bell with red badge '5'
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment     = Alignment.CenterVertically
        ) {
            IconButton(onClick = { /* Handle downloads click */ }) {
                Icon(
                    imageVector = Icons.Default.Download,
                    contentDescription = "Downloads",
                    tint = Color.White
                )
            }
            IconButton(onClick = { /* Handle notifications click */ }) {
                Box(modifier = Modifier.padding(4.dp)) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = "Notifications",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 4.dp, y = (-4).dp)
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(Color.Red),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "5",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

// ─── Filter Chip Item ─────────────────────────────────────────

@Composable
private fun FilterChipItem(
    label: String,
    isSelected: Boolean,
    showChevron: Boolean = false,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) Color.White else Color.White.copy(alpha = 0.12f)
    val textColor = if (isSelected) Color.Black else Color.White
    val borderColor = if (isSelected) Color.White else Color.White.copy(alpha = 0.3f)
    
    Row(
        modifier = Modifier
            .clip(CircleShape)
            .background(backgroundColor)
            .border(1.dp, borderColor, CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Text(
            text = label,
            color = textColor,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium
        )
        if (showChevron) {
            Spacer(Modifier.width(4.dp))
            Icon(
                imageVector = Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                tint = textColor,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

// ─── Bottom Navigation Bar ────────────────────────────────────

@Composable
private fun HomeBottomNavigationBar(
    selectedItem:  Int,
    avatarUrl:     String?,
    onTabSelected: (Int) -> Unit
) {
    NavigationBar(
        containerColor = Color(0xFF0F0F0F),
        tonalElevation = 0.dp,
        modifier = Modifier.height(64.dp)
    ) {
        val colors = NavigationBarItemDefaults.colors(
            selectedIconColor = Color.White,
            selectedTextColor = Color.White,
            unselectedIconColor = Color(0xFF8E8E93),
            unselectedTextColor = Color(0xFF8E8E93),
            indicatorColor = Color.Transparent
        )

        // Tab 0: Home
        val homeSelected = selectedItem == 0
        NavigationBarItem(
            selected = homeSelected,
            onClick = { onTabSelected(0) },
            icon = {
                Icon(
                    imageVector = if (homeSelected) Icons.Default.Home else Icons.Outlined.Home,
                    contentDescription = "Home"
                )
            },
            label = {
                Text(
                    text = "Home",
                    fontSize = 10.sp,
                    fontWeight = if (homeSelected) FontWeight.Bold else FontWeight.Normal
                )
            },
            colors = colors
        )

        // Tab 1: Upcoming
        val upcomingSelected = selectedItem == 1
        NavigationBarItem(
            selected = upcomingSelected,
            onClick = { onTabSelected(1) },
            icon = {
                Icon(
                    imageVector = if (upcomingSelected) Icons.Default.Notifications else Icons.Outlined.Notifications,
                    contentDescription = "Upcoming"
                )
            },
            label = {
                Text(
                    text = "Upcoming",
                    fontSize = 10.sp,
                    fontWeight = if (upcomingSelected) FontWeight.Bold else FontWeight.Normal
                )
            },
            colors = colors
        )

        // Tab 2: Search
        val searchSelected = selectedItem == 2
        NavigationBarItem(
            selected = searchSelected,
            onClick = { onTabSelected(2) },
            icon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search"
                )
            },
            label = {
                Text(
                    text = "Search",
                    fontSize = 10.sp,
                    fontWeight = if (searchSelected) FontWeight.Bold else FontWeight.Normal
                )
            },
            colors = colors
        )

        // Tab 3: My Studio (My Netflix)
        val studioSelected = selectedItem == 3
        NavigationBarItem(
            selected = studioSelected,
            onClick = { onTabSelected(3) },
            icon = {
                if (!avatarUrl.isNullOrEmpty()) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .border(
                                width = 1.dp,
                                color = if (studioSelected) Color.White else Color.Transparent,
                                shape = RoundedCornerShape(4.dp)
                            )
                    ) {
                        AsyncImage(
                            model = avatarUrl,
                            contentDescription = "My Studio",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                } else {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "My Studio"
                    )
                }
            },
            label = {
                Text(
                    text = "My Studio",
                    fontSize = 10.sp,
                    fontWeight = if (studioSelected) FontWeight.Bold else FontWeight.Normal
                )
            },
            colors = colors
        )
    }
}

// ─── Hero Banner Pager ────────────────────────────────────────

@Composable
private fun HeroBanner(
    items:          List<Content>,
    watchlistIds:   Set<String>,
    onContentClick: (String) -> Unit,
    viewModel:      HomeViewModel,
) {
    val pagerState  = rememberPagerState { items.size }
    val scope       = rememberCoroutineScope()

    // Auto-scroll every 8 seconds
    LaunchedEffect(Unit) {
        while (true) {
            delay(8000L)
            val next = (pagerState.currentPage + 1) % items.size
            scope.launch { pagerState.animateScrollToPage(next) }
        }
    }

    val glossyBorderBrush = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.22f),
            Color.White.copy(alpha = 0.04f),
            Color.White.copy(alpha = 0.18f)
        )
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth().aspectRatio(0.76f),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) { page ->
            val item = items[page]
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, glossyBorderBrush, RoundedCornerShape(12.dp))
                    .clickable { onContentClick(item.id) }
            ) {
                // Portrait Poster
                AsyncImage(
                    model              = item.posterUrl ?: item.thumbnailUrl ?: item.bannerUrl,
                    contentDescription = item.title,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )

                // Heavy, dark vertical gradient scrim overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0.0f to Color.Transparent,
                                0.4f to Color.Black.copy(alpha = 0.2f),
                                0.7f to Color.Black.copy(alpha = 0.8f),
                                1.0f to Color.Black
                            )
                        )
                )

                // Foreground Content
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 16.dp, vertical = 20.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Stylized Title
                    Text(
                        text = item.title,
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 32.sp
                    )

                    Spacer(Modifier.height(8.dp))

                    // Metadata Subtitle (Tags separated by bullets)
                    val genresText = item.genres.joinToString(" • ") { it.name }
                    if (genresText.isNotEmpty()) {
                        Text(
                            text = genresText,
                            color = Color.LightGray,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    } else {
                        Text(
                            text = "Suspenseful • Thriller • Immigrant Life • Drama",
                            color = Color.LightGray,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(Modifier.height(16.dp))

                    // Action Button Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Play Button
                        Button(
                            onClick = { onContentClick(item.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.weight(1f).height(44.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = Color.Black,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = "Play",
                                    color = Color.Black,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }

                        // My List Button
                        val isInWatchlist = watchlistIds.contains(item.id)
                        Button(
                            onClick = { viewModel.toggleWatchlist(item.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2B2B2B).copy(alpha = 0.7f)),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.weight(1f).height(44.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = if (isInWatchlist) Icons.Default.Check else Icons.Default.Add,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = "My List",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
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
            fontSize   = 18.sp,
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
                    CardStyle.STANDARD -> {
                        if (showRank) {
                            RankedContentCard(
                                item    = item,
                                onClick = { onItemClick(item.id) },
                                rank    = index + 1,
                            )
                        } else {
                            ContentCard(
                                item    = item,
                                onClick = { onItemClick(item.id) },
                            )
                        }
                    }
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
) {
    Box(
        modifier = Modifier
            .width(100.dp)
            .height(145.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(OttColors.SurfaceVariant)
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model              = item.posterUrl ?: item.thumbnailUrl ?: item.bannerUrl,
            contentDescription = item.title,
            contentScale       = ContentScale.Crop,
            modifier           = Modifier.fillMaxSize(),
        )
        
        // Red "K" logo in top-left
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(6.dp)
        ) {
            Text(
                text = "K",
                color = OttColors.Brand,
                fontWeight = FontWeight.Black,
                fontSize = 14.sp,
                style = LocalTextStyle.current.copy(
                    shadow = Shadow(
                        color = Color.Black.copy(alpha = 0.5f),
                        blurRadius = 4f
                    )
                )
            )
        }

        // PRO badge in bottom-right
        if (item.isPremium) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(OttColors.Brand)
                    .padding(horizontal = 4.dp, vertical = 2.dp),
            ) {
                Text("PRO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}

// ─── Ranked Content Card (Netflix Style Top 10 Outline Number) ──

@Composable
private fun RankedContentCard(
    item:    Content,
    onClick: () -> Unit,
    rank:    Int,
) {
    Box(
        modifier = Modifier
            .width(135.dp)
            .height(145.dp)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.BottomEnd
    ) {
        // 1. Stroke Outline (white border outline text)
        Text(
            text = rank.toString(),
            fontSize = 110.sp,
            fontWeight = FontWeight.Black,
            style = TextStyle(
                color = Color.White,
                drawStyle = Stroke(width = 6f, join = androidx.compose.ui.graphics.StrokeJoin.Round)
            ),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-10).dp, y = 14.dp)
        )
        
        // 2. Solid Fill (dark background match text)
        Text(
            text = rank.toString(),
            color = Color(0xFF141414),
            fontSize = 110.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-10).dp, y = 14.dp)
        )

        // Portrait card container
        Box(
            modifier = Modifier
                .width(100.dp)
                .height(145.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(OttColors.SurfaceVariant),
        ) {
            AsyncImage(
                model              = item.posterUrl ?: item.thumbnailUrl,
                contentDescription = item.title,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
            
            // Red "K" logo in top-left
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(6.dp)
            ) {
                Text(
                    text = "K",
                    color = OttColors.Brand,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp,
                    style = LocalTextStyle.current.copy(
                        shadow = Shadow(
                            color = Color.Black.copy(alpha = 0.5f),
                            blurRadius = 4f
                        )
                    )
                )
            }

            // PRO badge in bottom-right
            if (item.isPremium) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(OttColors.Brand)
                        .padding(horizontal = 4.dp, vertical = 2.dp),
                ) {
                    Text("PRO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
private fun WideContentCard(
    item:      Content,
    onClick:   () -> Unit,
    progress:  WatchProgress?,
) {
    val pct = if (progress != null && (progress.totalSeconds ?: 0) > 0) {
        (progress.watchedSeconds.toFloat() / progress.totalSeconds!!.toFloat()).coerceIn(0f, 1f)
    } else 0f

    Box(
        modifier = Modifier
            .width(160.dp)
            .height(90.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(OttColors.SurfaceVariant)
            .clickable(onClick = onClick)
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
}

// ─── Skeleton Loader ──────────────────────────────────────────

@Composable
private fun HomeSkeletonLoader() {
    val shimmerBrush = Brush.horizontalGradient(
        colors = listOf(OttColors.Surface, OttColors.SurfaceVariant, OttColors.Surface),
    )
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.76f)
                    .padding(horizontal = 24.dp, vertical = 12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(shimmerBrush)
            )
        }
        items(3) {
            Column(modifier = Modifier.padding(vertical = 12.dp)) {
                Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp).width(140.dp).height(18.dp).clip(RoundedCornerShape(4.dp)).background(shimmerBrush))
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(5) {
                        Box(modifier = Modifier.width(100.dp).height(145.dp).clip(RoundedCornerShape(8.dp)).background(shimmerBrush))
                    }
                }
            }
        }
    }
}
