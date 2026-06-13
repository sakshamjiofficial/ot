package com.studio.pro.presentation.home

import androidx.compose.animation.*
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.toArgb
import androidx.core.graphics.drawable.toBitmap
import androidx.compose.ui.platform.LocalContext
import coil.request.ImageRequest
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.studio.pro.domain.model.*
import com.studio.pro.presentation.common.OttColors

@Composable
fun CategoryScreen(
    filterType:           String, // "Series" or "Films"
    onContentClick:       (String) -> Unit,
    onBackClick:          () -> Unit,
    viewModel:            HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var selectedGenre by remember { mutableStateOf<Genre?>(null) }

    var selectedSeriesBannerId by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedMovieBannerId by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedGenericBannerId by rememberSaveable { mutableStateOf<String?>(null) }

    var dominantColor by remember { mutableStateOf(Color(0xFF1A0808)) }

    val darkDominantColor = remember(dominantColor) {
        val hsl = FloatArray(3)
        androidx.core.graphics.ColorUtils.colorToHSL(dominantColor.toArgb(), hsl)
        hsl[2] = 0.10f // Make left side much darker for higher contrast (10%)
        Color(androidx.core.graphics.ColorUtils.HSLToColor(hsl))
    }

    val rightSideColor = remember(dominantColor) {
        val hsl = FloatArray(3)
        androidx.core.graphics.ColorUtils.colorToHSL(dominantColor.toArgb(), hsl)
        hsl[2] = 0.20f // Subtly lighter on the right (20%) for soft illumination
        Color(androidx.core.graphics.ColorUtils.HSLToColor(hsl))
    }

    Scaffold(
        containerColor = Color.Transparent
    ) { paddingValues ->
        val horizontalBackgroundGradient = Brush.horizontalGradient(
            colors = listOf(
                darkDominantColor,
                rightSideColor
            )
        )
        val verticalBlackScrim = Brush.verticalGradient(
            colors = listOf(
                Color.Transparent,
                Color.Black.copy(alpha = 0.8f),
                Color.Black
            )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
                .background(horizontalBackgroundGradient)
                .background(verticalBlackScrim)
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
                    targetValue = if (isScrolled) Color.Black else Color.Transparent,
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
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(headerBgColor)
                                .statusBarsPadding()
                        ) {
                            CategoryTopBar(
                                filterType     = filterType,
                                onBackClick    = onBackClick,
                            )
                        }
                    }

                    // ── Dropdown Categories Row ──
                    item {
                        var expanded by remember { mutableStateOf(false) }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color(0xFF2B2B2B).copy(alpha = 0.7f))
                                    .border(1.dp, if (selectedGenre != null) dominantColor else Color.White.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                    .clickable { expanded = true }
                                    .padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = selectedGenre?.name ?: "All Categories",
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Icon(
                                    imageVector = Icons.Default.ArrowDropDown,
                                    contentDescription = "Dropdown",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            DropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false },
                                modifier = Modifier.background(Color(0xFF1F1F1F))
                            ) {
                                DropdownMenuItem(
                                    text = { Text("All Categories", color = Color.White) },
                                    onClick = {
                                        selectedGenre = null
                                        expanded = false
                                    }
                                )
                                uiState.genres.forEach { genre ->
                                    DropdownMenuItem(
                                        text = { Text(genre.name, color = Color.White) },
                                        onClick = {
                                            selectedGenre = genre
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // ── Dynamic Sections ───────────────────────────
                    items(uiState.homeSections) { section ->
                        val filteredItems = section.items.filter { item ->
                            val matchesType = when (filterType) {
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
                                    val selectedId = when (filterType) {
                                        "Series" -> selectedSeriesBannerId
                                        "Films" -> selectedMovieBannerId
                                        else -> selectedGenericBannerId
                                    }
                                    val featuredItem = if (selectedId != null) {
                                        filteredItems.find { it.id == selectedId }
                                    } else {
                                        null
                                    } ?: filteredItems.randomOrNull()?.also {
                                        when (filterType) {
                                            "Series" -> selectedSeriesBannerId = it.id
                                            "Films" -> selectedMovieBannerId = it.id
                                            else -> selectedGenericBannerId = it.id
                                        }
                                    }

                                    if (featuredItem != null) {
                                        CategoryHeroBanner(
                                            featuredItem             = featuredItem,
                                            watchlistIds             = uiState.watchlistIds,
                                            onContentClick           = onContentClick,
                                            viewModel                = viewModel,
                                            onDominantColorExtracted = { dominantColor = it }
                                        )
                                    }
                                }
                                "continue_watching" -> {
                                    val filteredProgress = section.progressItems.filter { progress ->
                                        val item = progress.content ?: return@filter false
                                        val matchesType = when (filterType) {
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

@Composable
private fun CategoryTopBar(
    filterType:     String,
    onBackClick:    () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.Start,
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBackClick) {
            Icon(
                imageVector = Icons.Default.ArrowBack,
                contentDescription = "Back",
                tint = Color.White
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = if (filterType == "Series") "Shows" else "Movies",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp
        )
    }
}

@Composable
private fun CategoryHeroBanner(
    featuredItem:             Content,
    watchlistIds:             Set<String>,
    onContentClick:           (String) -> Unit,
    viewModel:                HomeViewModel,
    onDominantColorExtracted: (Color) -> Unit,
) {
    val glossyBorderBrush = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.22f),
            Color.White.copy(alpha = 0.04f),
            Color.White.copy(alpha = 0.18f)
        )
    )

    var localDominantColor by remember { mutableStateOf(Color.Transparent) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        // Ambient Halo Glow
        if (localDominantColor != Color.Transparent) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .aspectRatio(2f / 3f)
                    .scale(1.12f)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                localDominantColor.copy(alpha = 0.45f),
                                localDominantColor.copy(alpha = 0.15f),
                                Color.Transparent
                            )
                        )
                    )
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(12.dp))
                .border(1.dp, glossyBorderBrush, RoundedCornerShape(12.dp))
                .clickable { onContentClick(featuredItem.id) }
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(featuredItem.posterUrl ?: featuredItem.thumbnailUrl ?: featuredItem.bannerUrl)
                    .allowHardware(false)
                    .build(),
                contentDescription = featuredItem.title,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
                onSuccess = { state ->
                    val drawable = state.result.drawable
                    try {
                        val bitmap = drawable.toBitmap()
                        androidx.palette.graphics.Palette.from(bitmap).generate { palette ->
                            val color = palette?.dominantSwatch?.rgb 
                                ?: palette?.vibrantSwatch?.rgb 
                                ?: palette?.mutedSwatch?.rgb
                            color?.let { rgb ->
                                val extractedColor = Color(rgb)
                                localDominantColor = extractedColor
                                onDominantColorExtracted(extractedColor)
                            }
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            )

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

            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 16.dp, vertical = 20.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Stylized Title Logo Image or Fallback Text
                if (!featuredItem.featureTextImageUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model = featuredItem.featureTextImageUrl,
                        contentDescription = featuredItem.title,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth(0.85f)
                            .height(64.dp)
                    )
                } else {
                    Text(
                        text = featuredItem.title,
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 32.sp
                    )
                }

                Spacer(Modifier.height(8.dp))

                val genresText = featuredItem.genres.joinToString(" • ") { it.name }
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

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = { onContentClick(featuredItem.id) },
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

                    val isInWatchlist = watchlistIds.contains(featuredItem.id)
                    Button(
                        onClick = { viewModel.toggleWatchlist(featuredItem.id) },
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
        Text(
            text = rank.toString(),
            fontSize = 110.sp,
            fontWeight = FontWeight.Black,
            style = TextStyle(
                color = Color.White,
                drawStyle = Stroke(width = 6f, join = StrokeJoin.Round)
            ),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-10).dp, y = 14.dp)
        )
        
        Text(
            text = rank.toString(),
            color = Color(0xFF141414),
            fontSize = 110.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .offset(x = (-10).dp, y = 14.dp)
        )

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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.PlayCircle, contentDescription = null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(36.dp))
        }

        if (pct > 0f) {
            Box(modifier = Modifier.fillMaxWidth().height(3.dp).align(Alignment.BottomCenter)) {
                Box(modifier = Modifier.fillMaxSize().background(Color.White.copy(alpha = 0.3f)))
                Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(pct).background(OttColors.Brand))
            }
        }
    }
}

@Composable
private fun HomeSkeletonLoader() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(color = OttColors.Brand)
    }
}
