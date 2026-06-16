package com.studio.pro.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.studio.pro.presentation.auth.AuthViewModel
import com.studio.pro.presentation.common.OttColors

import com.studio.pro.presentation.auth.AuthUiState

@Composable
fun ProfileScreen(
    startInEditMode:         Boolean = false,
    onBack:                  () -> Unit,
    onLogout:                () -> Unit,
    onNavigateToSubscription: () -> Unit,
    authViewModel:           AuthViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()
    val defaultAvatars by authViewModel.defaultAvatars.collectAsStateWithLifecycle()
    val context = androidx.compose.ui.platform.LocalContext.current

    LaunchedEffect(Unit) {
        authViewModel.loadCurrentUser()
        authViewModel.loadDefaultAvatars()
    }

    val user = remember(authState) {
        (authState as? AuthUiState.Success)?.user
    }

    var isEditing by remember { mutableStateOf(startInEditMode) }
    var editDisplayName by remember { mutableStateOf("") }
    var selectedAvatarUrl by remember { mutableStateOf("") }

    LaunchedEffect(user, isEditing) {
        if (user != null && isEditing) {
            editDisplayName = user.displayName ?: ""
            selectedAvatarUrl = user.avatarUrl ?: ""
        }
    }

    LaunchedEffect(authState) {
        if (authState is AuthUiState.Error) {
            android.widget.Toast.makeText(context, (authState as AuthUiState.Error).message, android.widget.Toast.LENGTH_SHORT).show()
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(OttColors.Background)
    ) {
        if (isEditing) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = {
                        if (startInEditMode) {
                            onBack()
                        } else {
                            isEditing = false
                        }
                    }) {
                        Icon(Icons.Default.Close, "Cancel", tint = Color.White)
                    }
                    Text(
                        text = "Edit Profile",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(
                        onClick = {
                            authViewModel.updateProfile(editDisplayName, selectedAvatarUrl) {
                                if (startInEditMode) {
                                    onBack()
                                } else {
                                    isEditing = false
                                }
                            }
                        },
                        colors = ButtonDefaults.textButtonColors(contentColor = OttColors.Brand)
                    ) {
                        Text("Save", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }

                Spacer(Modifier.height(24.dp))

                // Main avatar preview
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(OttColors.Brand)
                        .align(Alignment.CenterHorizontally),
                    contentAlignment = Alignment.Center
                ) {
                    if (!selectedAvatarUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = selectedAvatarUrl,
                            contentDescription = "Selected Avatar",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(
                            text = editDisplayName.firstOrNull()?.toString()?.uppercase() ?: user?.email?.firstOrNull()?.toString()?.uppercase() ?: "U",
                            color = Color.White,
                            fontSize = 48.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))
                Text(
                    "Choose an Avatar",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
                Spacer(Modifier.height(12.dp))

                // Avatar list
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp),
                    modifier = Modifier.fillMaxWidth().height(88.dp)
                ) {
                    items(defaultAvatars) { avatarUrl ->
                        val isSelected = selectedAvatarUrl == avatarUrl
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(OttColors.SurfaceVariant)
                                .border(
                                    width = if (isSelected) 3.dp else 1.dp,
                                    color = if (isSelected) OttColors.Brand else Color.White.copy(alpha = 0.1f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .clickable { selectedAvatarUrl = avatarUrl },
                            contentAlignment = Alignment.Center
                        ) {
                            AsyncImage(
                                model = avatarUrl,
                                contentDescription = "Avatar Option",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                }

                Spacer(Modifier.height(28.dp))

                // Fields
                Text(
                    "Profile Details",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
                Spacer(Modifier.height(12.dp))

                // Name Field
                OutlinedTextField(
                    value = editDisplayName,
                    onValueChange = { editDisplayName = it },
                    label = { Text("Display Name") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = OttColors.Brand,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                        focusedLabelColor = OttColors.Brand,
                        unfocusedLabelColor = Color.White.copy(alpha = 0.6f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(Modifier.height(16.dp))

                // Email Field (Read-only)
                OutlinedTextField(
                    value = user?.email ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Email (Cannot be changed)") },
                    singleLine = true,
                    leadingIcon = {
                        Icon(Icons.Default.Lock, null, tint = Color.White.copy(alpha = 0.4f))
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.White.copy(alpha = 0.1f),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.1f),
                        focusedLabelColor = Color.White.copy(alpha = 0.4f),
                        unfocusedLabelColor = Color.White.copy(alpha = 0.4f),
                        focusedTextColor = Color.White.copy(alpha = 0.6f),
                        unfocusedTextColor = Color.White.copy(alpha = 0.6f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        } else {
            LazyColumn(
                modifier       = Modifier.fillMaxSize().statusBarsPadding(),
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
                                .clip(RoundedCornerShape(16.dp))
                                .background(OttColors.Brand, RoundedCornerShape(16.dp))
                                .clickable { isEditing = true },
                            contentAlignment = Alignment.Center,
                        ) {
                            if (!user?.avatarUrl.isNullOrBlank()) {
                                AsyncImage(
                                    model = user?.avatarUrl,
                                    contentDescription = "Avatar",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Text(
                                    text       = user?.displayName?.firstOrNull()?.toString()?.uppercase() ?: user?.email?.firstOrNull()?.toString()?.uppercase() ?: "U",
                                    color      = Color.White,
                                    fontSize   = 36.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            
                            // Small edit badge over the avatar
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .background(Color.Black.copy(0.6f), CircleShape)
                                    .align(Alignment.BottomEnd),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Edit, null, tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Text(user?.displayName ?: user?.email?.substringBefore("@") ?: "User", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
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
                            ProfileMenuItem(Icons.Default.Edit, "Edit Profile") {
                                isEditing = true
                            }
                            ProfileMenuItem(Icons.Default.Subscriptions, "My Subscription") {
                                onNavigateToSubscription()
                            }
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

        if (authState is AuthUiState.Loading) {
            Box(
                modifier = Modifier.fillMaxSize().background(Color.Black.copy(0.4f)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = OttColors.Brand)
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
