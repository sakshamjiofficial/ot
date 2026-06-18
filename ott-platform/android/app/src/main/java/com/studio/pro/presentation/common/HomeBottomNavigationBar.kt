package com.studio.pro.presentation.common

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

@Composable
fun HomeBottomNavigationBar(
    selectedItem:  Int,
    avatarUrl:     String?,
    onTabSelected: (Int) -> Unit
) {
    NavigationBar(
        containerColor = Color(0xFF141414),
        tonalElevation = 8.dp,
        modifier = Modifier
            .padding(horizontal = 24.dp)
            .padding(bottom = 16.dp)
            .navigationBarsPadding()
            .height(64.dp)
            .shadow(elevation = 12.dp, shape = CircleShape)
            .clip(CircleShape)
            .border(
                width = 1.5.dp,
                color = Color.White.copy(alpha = 0.12f),
                shape = CircleShape
            )
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
