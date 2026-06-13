package com.studio.pro.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.studio.pro.presentation.auth.AuthViewModel
import com.studio.pro.presentation.common.OttColors

@Composable
fun ProfileScreen(
    onBack:    () -> Unit,
    onLogout:  () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val user by remember { mutableStateOf<com.studio.pro.domain.model.User?>(null) }

    LazyColumn(
        modifier       = Modifier.fillMaxSize().background(OttColors.Background).statusBarsPadding(),
        contentPadding = PaddingValues(bottom = 40.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
                }
                Text("Profile", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        // Avatar + name
        item {
            Column(
                modifier            = Modifier.fillMaxWidth().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier         = Modifier
                        .size(88.dp)
                        .background(OttColors.Brand, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text       = user?.displayName?.firstOrNull()?.uppercase() ?: "U",
                        color      = Color.White,
                        fontSize   = 36.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.height(12.dp))
                Text(user?.displayName ?: "User", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text(user?.email ?: "", color = OttColors.TextMuted, fontSize = 14.sp)
                Spacer(Modifier.height(12.dp))

                // Subscription status chip
                Box(
                    modifier = Modifier
                        .background(
                            if (user?.hasActiveSubscription == true) OttColors.Brand.copy(0.2f)
                            else OttColors.SurfaceVariant,
                            RoundedCornerShape(20.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                ) {
                    Text(
                        if (user?.hasActiveSubscription == true) "✓ Premium Active" else "Free Plan",
                        color      = if (user?.hasActiveSubscription == true) OttColors.Brand else OttColors.TextMuted,
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        // Menu items
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                ProfileSection("Account") {
                    ProfileMenuItem(Icons.Default.Subscriptions, "My Subscription") {}
                    ProfileMenuItem(Icons.Default.BookmarkBorder, "My Watchlist") {}
                    ProfileMenuItem(Icons.Default.History, "Watch History") {}
                    ProfileMenuItem(Icons.Default.Devices, "Manage Devices") {}
                }

                Spacer(Modifier.height(16.dp))

                ProfileSection("Settings") {
                    ProfileMenuItem(Icons.Default.Language, "Language") {}
                    ProfileMenuItem(Icons.Default.Download, "Download Quality") {}
                    ProfileMenuItem(Icons.Default.Notifications, "Notifications") {}
                }

                Spacer(Modifier.height(16.dp))

                ProfileSection("Support") {
                    ProfileMenuItem(Icons.Default.Help, "Help Centre") {}
                    ProfileMenuItem(Icons.Default.Policy, "Privacy Policy") {}
                    ProfileMenuItem(Icons.Default.Description, "Terms of Service") {}
                }

                Spacer(Modifier.height(16.dp))

                // Logout
                Card(
                    modifier  = Modifier.fillMaxWidth(),
                    colors    = CardDefaults.cardColors(containerColor = OttColors.SurfaceVariant),
                    shape     = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier          = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onLogout)
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Icon(Icons.Default.Logout, null, tint = OttColors.Error, modifier = Modifier.size(20.dp))
                        Text("Sign Out", color = OttColors.Error, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    "OTT Platform · Version 1.0.0",
                    color    = OttColors.TextMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.fillMaxWidth().wrapContentWidth(Alignment.CenterHorizontally),
                )
            }
        }
    }
}

@Composable
private fun ProfileSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Text(title, color = OttColors.TextMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp))
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors   = CardDefaults.cardColors(containerColor = OttColors.SurfaceVariant),
        shape    = RoundedCornerShape(12.dp),
    ) {
        Column(content = content)
    }
}

@Composable
private fun ProfileMenuItem(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(icon, null, tint = OttColors.TextSecondary, modifier = Modifier.size(20.dp))
        Text(label, color = Color.White, fontSize = 15.sp, modifier = Modifier.weight(1f))
        Icon(Icons.Default.ChevronRight, null, tint = OttColors.TextMuted, modifier = Modifier.size(18.dp))
    }
}
