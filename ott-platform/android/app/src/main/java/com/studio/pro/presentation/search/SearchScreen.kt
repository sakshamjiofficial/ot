package com.studio.pro.presentation.search

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.studio.pro.domain.model.Content
import com.studio.pro.presentation.common.OttColors
import com.studio.pro.presentation.common.HomeBottomNavigationBar

@Composable
fun SearchScreen(
    onContentClick: (String) -> Unit,
    onBack:         () -> Unit,
    onHomeClick:    () -> Unit,
    onProfileClick: () -> Unit,
    viewModel:      SearchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var query   by remember { mutableStateOf("") }

    Scaffold(
        bottomBar = {
            HomeBottomNavigationBar(
                selectedItem = 2,
                avatarUrl = uiState.currentUser?.avatarUrl,
                onTabSelected = { index ->
                    when (index) {
                        0, 1 -> onHomeClick()
                        3 -> onProfileClick()
                    }
                }
            )
        },
        containerColor = Color.Transparent
    ) { paddingValues ->
        val backgroundGradient = Brush.verticalGradient(
            colors = listOf(
                Color(0xFF0F0F0F),
                Color.Black
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(backgroundGradient)
                .statusBarsPadding()
                .padding(bottom = paddingValues.calculateBottomPadding()),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                OutlinedTextField(
                    value         = query,
                    onValueChange = { query = it; viewModel.search(it) },
                    placeholder   = { Text("Movies, series, genres…", color = OttColors.TextMuted) },
                    leadingIcon   = { Icon(Icons.Default.Search, null, tint = OttColors.TextMuted) },
                    trailingIcon  = if (query.isNotEmpty()) {
                        { IconButton(onClick = { query = ""; viewModel.search("") }) {
                            Icon(Icons.Default.Clear, null, tint = OttColors.TextMuted)
                        }}
                    } else null,
                    singleLine    = true,
                    modifier      = Modifier.weight(1f),
                    shape         = RoundedCornerShape(12.dp),
                    colors        = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor   = OttColors.Brand,
                        unfocusedBorderColor = OttColors.Border,
                        focusedTextColor     = Color.White,
                        unfocusedTextColor   = Color.White,
                    ),
                )
            }

            when {
                uiState.isLoading -> SearchShimmerPlaceholder()
                uiState.results.isEmpty() && query.isNotBlank() -> Box(
                    Modifier.fillMaxSize().padding(top = 60.dp),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.SearchOff, null, tint = OttColors.TextMuted, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No results for \"$query\"", color = OttColors.TextMuted, fontSize = 15.sp)
                    }
                }
                else -> LazyColumn(
                    contentPadding      = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(uiState.results, key = { it.id }) { item ->
                        SearchResultRow(item = item, onClick = { onContentClick(item.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResultRow(item: Content, onClick: () -> Unit) {
    Row(
        modifier              = Modifier.fillMaxWidth().clickable(onClick = onClick),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(64.dp, 90.dp)
                .background(OttColors.SurfaceVariant, RoundedCornerShape(6.dp)),
        ) {
            AsyncImage(
                model              = item.posterUrl ?: item.thumbnailUrl,
                contentDescription = null,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = Color.White, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(3.dp))
            Text(
                "${item.type.name.lowercase().replaceFirstChar { it.uppercase() }} · ${item.releaseYear ?: ""}",
                color = OttColors.TextMuted, fontSize = 13.sp,
            )
            item.imdbRating?.let {
                Spacer(Modifier.height(2.dp))
                Text("⭐ $it / 10", color = OttColors.TextMuted, fontSize = 12.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 4.dp)) {
                item.genres.take(2).forEach { genre ->
                    Box(
                        modifier = Modifier
                            .background(OttColors.SurfaceElevated, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(genre.name, color = OttColors.TextSecondary, fontSize = 10.sp)
                    }
                }
            }
        }

        if (item.isPremium) {
            Box(
                modifier = Modifier
                    .background(OttColors.Brand, RoundedCornerShape(4.dp))
                    .padding(horizontal = 6.dp, vertical = 3.dp),
            ) {
                Text("PRO", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun SearchShimmerPlaceholder() {
    LazyColumn(
        contentPadding      = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        userScrollEnabled   = false,
    ) {
        items(6) {
            Row(
                modifier              = Modifier.fillMaxWidth(),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // Image Placeholder
                Box(
                    modifier = Modifier
                        .size(64.dp, 90.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .shimmerEffect()
                )

                // Info Placeholder
                Column(modifier = Modifier.weight(1f)) {
                    // Title
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.7f)
                            .height(16.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .shimmerEffect()
                    )
                    Spacer(Modifier.height(8.dp))
                    // Subtitle
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.4f)
                            .height(12.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .shimmerEffect()
                    )
                    Spacer(Modifier.height(8.dp))
                    // Rating/meta
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.2f)
                            .height(10.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .shimmerEffect()
                    )
                    Spacer(Modifier.height(8.dp))
                    // Genre Tags
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Box(
                            modifier = Modifier
                                .size(40.dp, 16.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .shimmerEffect()
                        )
                        Box(
                            modifier = Modifier
                                .size(50.dp, 16.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .shimmerEffect()
                        )
                    }
                }
            }
        }
    }
}

fun Modifier.shimmerEffect(): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerTranslation"
    )

    val shimmerColors = listOf(
        Color.White.copy(alpha = 0.05f),
        Color.White.copy(alpha = 0.15f),
        Color.White.copy(alpha = 0.05f)
    )

    background(
        brush = Brush.linearGradient(
            colors = shimmerColors,
            start = Offset(x = translateAnim.value - 300f, y = translateAnim.value - 300f),
            end = Offset(x = translateAnim.value, y = translateAnim.value)
        )
    )
}

