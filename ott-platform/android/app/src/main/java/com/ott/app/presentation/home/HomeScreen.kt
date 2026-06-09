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
        containerColor = OttColors.Background
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
                .background(OttColors.Background)
        ) {
            if (uiState.isLoading && uiState.featured.isEmpty()) {
                HomeSkeletonLoader()
            } else {
                LazyColumn(
                    modifier            = Modifier.fillMaxSize(),
                    contentPadding      = PaddingValues(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp),
                ) {
                    // ── Top App Bar ──────────────────────────────
                    item {
                        HomeTopBar(
                            userName       = uiState.currentUser?.displayName ?: "JudyS",
                            avatarUrl      = uiState.currentUser?.avatarUrl,
                            onSearchClick  = onSearchClick,
                            onProfileClick = onProfileClick,
                        )
                    }

                    // ── Top Navigation Tabs ─────────────────────
                    stickyHeader {
                        var selectedTabIndex by remember { mutableStateOf(0) }

                        // Sync selectedTabIndex when filters change externally
                        LaunchedEffect(selectedFilter, selectedGenre) {
                            if (selectedGenre != null) {
                                selectedTabIndex = 4
                            } else {
                                when (selectedFilter) {
                                    "Series" -> selectedTabIndex = 0
                                    "Films" -> selectedTabIndex = 1
                                    "Games" -> selectedTabIndex = 2
                                    "New & Hot" -> selectedTabIndex = 3
                                    else -> selectedTabIndex = 0
                                }
                            }
                        }

                        ScrollableTabRow(
                            selectedTabIndex = selectedTabIndex,
                            containerColor = Color.Black,
                            contentColor = Color.White,
                            edgePadding = 16.dp,
                            indicator = {},
                            divider = {},
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp) // Slightly taller to account for larger pill buttons
                        ) {
                            // Shows Tab
                            Tab(
                                selected = selectedTabIndex == 0,
                                onClick = {
                                    selectedTabIndex = 0
                                    selectedFilter = "Series"
                                    selectedGenre = null
                                },
                                modifier = Modifier
                                    .padding(horizontal = 6.dp, vertical = 6.dp)
                                    .clip(RoundedCornerShape(50.dp))
                                    .background(if (selectedTabIndex == 0) OttColors.Brand else Color(0xFF1A1A1A))
                                    .border(
                                        width = 1.dp,
                                        color = if (selectedTabIndex == 0) Color.Transparent else Color.White.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(50.dp)
                                    )
                            ) {
                                Text(
                                    text = "Shows",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp, // Increased font size from 13.sp to 14.sp
                                    color = if (selectedTabIndex == 0) Color.White else Color.White.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp) // Increased padding
                                )
                            }

                            // Movies Tab
                            Tab(
                                selected = selectedTabIndex == 1,
                                onClick = {
                                    selectedTabIndex = 1
                                    selectedFilter = "Films"
                                    selectedGenre = null
                                },
                                modifier = Modifier
                                    .padding(horizontal = 6.dp, vertical = 6.dp)
                                    .clip(RoundedCornerShape(50.dp))
                                    .background(if (selectedTabIndex == 1) OttColors.Brand else Color(0xFF1A1A1A))
                                    .border(
                                        width = 1.dp,
                                        color = if (selectedTabIndex == 1) Color.Transparent else Color.White.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(50.dp)
                                    )
                            ) {
                                Text(
                                    text = "Movies",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (selectedTabIndex == 1) Color.White else Color.White.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                )
                            }

                            // Games Tab
                            Tab(
                                selected = selectedTabIndex == 2,
                                onClick = {
                                    selectedTabIndex = 2
                                    selectedFilter = "Games"
                                    selectedGenre = null
                                },
                                modifier = Modifier
                                    .padding(horizontal = 6.dp, vertical = 6.dp)
                                    .clip(RoundedCornerShape(50.dp))
                                    .background(if (selectedTabIndex == 2) OttColors.Brand else Color(0xFF1A1A1A))
                                    .border(
                                        width = 1.dp,
                                        color = if (selectedTabIndex == 2) Color.Transparent else Color.White.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(50.dp)
                                    )
                            ) {
                                Text(
                                    text = "Games",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (selectedTabIndex == 2) Color.White else Color.White.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                )
                            }

                            // New & Hot Tab
                            Tab(
                                selected = selectedTabIndex == 3,
                                onClick = {
                                    selectedTabIndex = 3
                                    selectedFilter = "New & Hot"
                                    selectedGenre = null
                                },
                                modifier = Modifier
                                    .padding(horizontal = 6.dp, vertical = 6.dp)
                                    .clip(RoundedCornerShape(50.dp))
                                    .background(if (selectedTabIndex == 3) OttColors.Brand else Color(0xFF1A1A1A))
                                    .border(
                                        width = 1.dp,
                                        color = if (selectedTabIndex == 3) Color.Transparent else Color.White.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(50.dp)
                                    )
                            ) {
                                Text(
                                    text = "New & Hot",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (selectedTabIndex == 3) Color.White else Color.White.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                )
                            }

                            // Categories Tab with Dropdown
                            Box {
                                Tab(
                                    selected = selectedTabIndex == 4,
                                    onClick = {
                                        selectedTabIndex = 4
                                        showCategoriesMenu = true
                                    },
                                    modifier = Modifier
                                        .padding(horizontal = 6.dp, vertical = 6.dp)
                                        .clip(RoundedCornerShape(50.dp))
                                        .background(if (selectedTabIndex == 4) OttColors.Brand else Color(0xFF1A1A1A))
                                        .border(
                                            width = 1.dp,
                                            color = if (selectedTabIndex == 4) Color.Transparent else Color.White.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(50.dp)
                                        )
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                    ) {
                                        Text(
                                            text = if (selectedGenre != null) selectedGenre!!.name else "Categories",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = if (selectedTabIndex == 4) Color.White else Color.White.copy(alpha = 0.7f)
                                        )
                                        Spacer(Modifier.width(2.dp))
                                        Icon(
                                            imageVector = Icons.Default.ArrowDropDown,
                                            contentDescription = null,
                                            tint = if (selectedTabIndex == 4) Color.White else Color.White.copy(alpha = 0.7f),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                DropdownMenu(
                                    expanded = showCategoriesMenu,
                                    onDismissRequest = { showCategoriesMenu = false },
                                    modifier = Modifier.background(OttColors.SurfaceVariant)
                                ) {
                                    uiState.genres.forEach { genre ->
                                        DropdownMenuItem(
                                            text = { Text(genre.name, color = Color.White) },
                                            onClick = {
                                                showCategoriesMenu = false
                                                selectedGenre = genre
                                                selectedFilter = null
                                            }
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
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        Text(
            text = "For $userName.",
            color = Color.White,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 24.sp,
            style = LocalTextStyle.current.copy(
                shadow = Shadow(
                    color = Color.Black.copy(alpha = 0.3f),
                    blurRadius = 4f
                )
            )
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment     = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Cast,
                contentDescription = "Cast",
                tint = Color.White,
                modifier = Modifier.size(24.dp).clickable { /* Cast action */ }
            )
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = Color.White,
                modifier = Modifier.size(24.dp).clickable(onClick = onSearchClick)
            )
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color(0xFF3B82F6))
                    .clickable(onClick = onProfileClick),
                contentAlignment = Alignment.Center
            ) {
                if (!avatarUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model              = avatarUrl,
                        contentDescription = "Profile",
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Profile",
                        tint = Color.White.copy(alpha = 0.8f),
                        modifier = Modifier.size(20.dp)
                    )
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

    val configuration = LocalConfiguration.current
    val bannerHeight = (configuration.screenHeightDp * 0.65f).dp
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
            .height(bannerHeight)
            .padding(vertical = 12.dp)
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) { page ->
            val item = items[page]
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 6.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                Color(0xFFFF2A54), // Vibrant Pink/Red
                                Color(0xFF7E0A2B), // Deep Maroon
                                Color(0xFF1F030E)  // Dark Plum
                            )
                        )
                    )
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .border(1.dp, glossyBorderBrush, RoundedCornerShape(10.dp))
                        .clickable { onContentClick(item.id) }
                ) {

                // Portrait Poster
                AsyncImage(
                    model              = item.posterUrl ?: item.thumbnailUrl ?: item.bannerUrl,
                    contentDescription = item.title,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )

                // Top Gradient Overlay
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Black.copy(alpha = 0.4f), Color.Transparent)
                            )
                        )
                )

                // Bottom Gradient Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0.0f to Color.Transparent,
                                0.5f to Color.Black.copy(alpha = 0.3f),
                                0.8f to Color.Black.copy(alpha = 0.85f),
                                1.0f to Color.Black,
                            )
                        )
                )

                // Featured Content Info
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(horizontal = 20.dp, vertical = 24.dp)
                        .fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Branding: Red "K" + type
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "K",
                            color = OttColors.Brand,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            style = LocalTextStyle.current.copy(
                                shadow = Shadow(
                                    color = Color.Black.copy(alpha = 0.6f),
                                    blurRadius = 6f
                                )
                            )
                        )
                        Text(
                            text = if (item.type == ContentType.SERIES) "SERIES" else "FILM",
                            color = Color.White.copy(alpha = 0.8f),
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            letterSpacing = 2.sp
                        )
                    }

                    Spacer(Modifier.height(8.dp))

                    Text(
                        text       = item.title,
                        color      = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize   = 30.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Serif,
                        textAlign  = TextAlign.Center,
                        maxLines   = 2,
                        overflow   = TextOverflow.Ellipsis,
                        lineHeight = 34.sp,
                        style      = LocalTextStyle.current.copy(
                            shadow = Shadow(
                                color = Color.Black.copy(alpha = 0.5f),
                                blurRadius = 8f
                            )
                        )
                    )

                    Spacer(Modifier.height(8.dp))

                    val genresText = item.genres.joinToString(" • ") { it.name }
                    if (genresText.isNotEmpty()) {
                        Text(
                            text     = genresText,
                            color    = Color.White.copy(alpha = 0.9f),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(Modifier.height(18.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val isInWatchlist = watchlistIds.contains(item.id)
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clickable { viewModel.toggleWatchlist(item.id) }
                                .padding(8.dp)
                        ) {
                            Icon(
                                imageVector = if (isInWatchlist) Icons.Default.Check else Icons.Default.Add,
                                contentDescription = "My List",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "My List",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Button(
                            onClick = { onContentClick(item.id) },
                            colors  = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape   = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .width(140.dp)
                                .height(44.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.PlayArrow,
                                contentDescription = "Play",
                                tint = Color.Black,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = "Play",
                                color = Color.Black,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clickable { onContentClick(item.id) }
                                .padding(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Info",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "Info",
                                color = Color.White,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
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
            .clickable(onClick = onClick),
    ) {
        Column {
            Box(
                modifier = Modifier
                    .width(100.dp)
                    .height(145.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(OttColors.SurfaceVariant),
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
            Spacer(Modifier.height(4.dp))
            Text(
                text = item.title,
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 11.sp,
            )
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


    Column(
        modifier = Modifier
            .width(160.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .width(160.dp)
                .height(90.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(OttColors.SurfaceVariant)
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

// ─── Skeleton Loader ──────────────────────────────────────────

@Composable
private fun HomeSkeletonLoader() {
    val shimmerBrush = Brush.horizontalGradient(
        colors = listOf(OttColors.Surface, OttColors.SurfaceVariant, OttColors.Surface),
    )
    val configuration = LocalConfiguration.current
    val bannerHeight = (configuration.screenHeightDp * 0.65f).dp


    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Box(modifier = Modifier.fillMaxWidth().height(bannerHeight).background(shimmerBrush))
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
