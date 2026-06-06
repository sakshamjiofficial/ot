package com.ott.app.presentation.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ott.app.presentation.common.OttColors
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onComplete: () -> Unit) {
    var animStarted by remember { mutableStateOf(false) }

    val scale by animateFloatAsState(
        targetValue    = if (animStarted) 1f else 0.5f,
        animationSpec  = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label          = "logo_scale",
    )

    LaunchedEffect(Unit) {
        animStarted = true
        delay(1800L)
        onComplete()
    }

    Box(
        modifier = Modifier.fillMaxSize().background(OttColors.Background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .scale(scale)
                    .background(OttColors.Brand, RoundedCornerShape(22.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(54.dp))
            }
            Spacer(Modifier.height(20.dp))
            Text("OTT", color = Color.White, style = MaterialTheme.typography.headlineLarge)
        }
    }
}
