package com.ott.app.presentation.subscription

import android.app.Activity
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ott.app.domain.model.SubscriptionPlan
import com.ott.app.presentation.common.OttColors

@Composable
fun SubscriptionScreen(
    onBack:         () -> Unit,
    onSuccess:      () -> Unit,
    userEmail:      String = "",
    userName:       String = "",
    viewModel:      SubscriptionViewModel = hiltViewModel(),
) {
    val uiState     by viewModel.uiState.collectAsStateWithLifecycle()
    val context     = LocalContext.current as Activity
    var selectedId  by remember { mutableStateOf<Int?>(null) }
    var couponInput by remember { mutableStateOf("") }
    var showCoupon  by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadPlans() }

    // Launch Razorpay when order is ready
    LaunchedEffect(uiState) {
        if (uiState is SubscriptionUiState.PaymentPending) {
            val state = uiState as SubscriptionUiState.PaymentPending
            viewModel.launchRazorpayCheckout(
                activity  = context,
                orderId   = state.orderId,
                amount    = state.amount,
                keyId     = state.keyId,
                userEmail = userEmail,
                userName  = userName,
            )
        }
        if (uiState is SubscriptionUiState.Success) {
            onSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(OttColors.Background),
    ) {
        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {

            // ── Header ─────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(OttColors.Brand.copy(alpha = 0.3f), Color.Transparent)
                        )
                    )
                    .padding(horizontal = 20.dp, vertical = 32.dp),
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    IconButton(onClick = onBack, modifier = Modifier.align(Alignment.Start)) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
                    }
                    Spacer(Modifier.height(8.dp))
                    Icon(Icons.Default.WorkspacePremium, null, tint = OttColors.Brand, modifier = Modifier.size(52.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Choose Your Plan", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 24.sp)
                    Text("Unlock unlimited streaming", color = OttColors.TextMuted, fontSize = 14.sp)
                }
            }

            Spacer(Modifier.height(8.dp))

            // ── Plan Cards ────────────────────────────────
            when (val state = uiState) {
                is SubscriptionUiState.Plans -> {
                    Column(modifier = Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {

                        // Filter out free plan — shown separately
                        val paidPlans = state.plans.filter { it.planType != "free" }

                        paidPlans.forEach { plan ->
                            PlanCard(
                                plan       = plan,
                                isSelected = selectedId == plan.id,
                                isPopular  = plan.planType == "premium",
                                onClick    = { selectedId = plan.id },
                            )
                        }
                    }
                }
                is SubscriptionUiState.Loading ->
                    Box(Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = OttColors.Brand)
                    }
                is SubscriptionUiState.Error ->
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text(state.message, color = OttColors.Error, textAlign = TextAlign.Center)
                    }
                else -> Unit
            }

            Spacer(Modifier.height(20.dp))

            // ── Coupon Code ───────────────────────────────
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                TextButton(onClick = { showCoupon = !showCoupon }) {
                    Icon(
                        if (showCoupon) Icons.Default.ExpandLess else Icons.Default.LocalOffer,
                        null, tint = OttColors.Brand, modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text("Have a coupon code?", color = OttColors.Brand, fontSize = 14.sp)
                }

                AnimatedVisibility(visible = showCoupon) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        OutlinedTextField(
                            value         = couponInput,
                            onValueChange = { couponInput = it.uppercase() },
                            placeholder   = { Text("Enter code") },
                            singleLine    = true,
                            modifier      = Modifier.weight(1f),
                            shape         = RoundedCornerShape(10.dp),
                            colors        = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor   = OttColors.Brand,
                                unfocusedBorderColor = OttColors.Border,
                                focusedTextColor     = Color.White,
                                unfocusedTextColor   = Color.White,
                            ),
                        )
                        Button(
                            onClick  = { /* validate coupon */ },
                            shape    = RoundedCornerShape(10.dp),
                            colors   = ButtonDefaults.buttonColors(containerColor = OttColors.Brand),
                        ) {
                            Text("Apply")
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // ── Subscribe Button ──────────────────────────
            Button(
                onClick  = { selectedId?.let { viewModel.initiatePayment(it, couponInput.takeIf { it.isNotBlank() }) } },
                enabled  = selectedId != null && uiState !is SubscriptionUiState.Loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(54.dp),
                shape    = RoundedCornerShape(12.dp),
                colors   = ButtonDefaults.buttonColors(
                    containerColor = OttColors.Brand,
                    disabledContainerColor = OttColors.SurfaceVariant,
                ),
            ) {
                if (uiState is SubscriptionUiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.Lock, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Subscribe Securely", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(12.dp))

            // ── Secure payment note ───────────────────────
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Icon(Icons.Default.Security, null, tint = OttColors.TextMuted, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text("Secured by Razorpay · Cancel anytime", color = OttColors.TextMuted, fontSize = 12.sp)
            }

            Spacer(Modifier.height(24.dp))

            // ── Feature list ──────────────────────────────
            Column(
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .background(OttColors.SurfaceVariant, RoundedCornerShape(12.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text("All plans include:", color = OttColors.TextSecondary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                listOf(
                    "Full HD & 4K streaming",
                    "Unlimited movies & series",
                    "Download & watch offline",
                    "Multi-language audio",
                    "Subtitles in 10+ languages",
                    "Cancel anytime — no contracts",
                ).forEach { feature ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CheckCircle, null, tint = OttColors.Success, modifier = Modifier.size(16.dp))
                        Text(feature, color = OttColors.TextSecondary, fontSize = 13.sp)
                    }
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

// ─── Plan Card ────────────────────────────────────────────────

@Composable
private fun PlanCard(
    plan:       SubscriptionPlan,
    isSelected: Boolean,
    isPopular:  Boolean,
    onClick:    () -> Unit,
) {
    val borderColor = if (isSelected) OttColors.Brand else OttColors.Border
    val bgColor     = if (isSelected) OttColors.Brand.copy(alpha = 0.08f) else OttColors.SurfaceVariant

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(
                width  = if (isSelected) 2.dp else 1.dp,
                color  = borderColor,
                shape  = RoundedCornerShape(14.dp),
            )
            .background(bgColor)
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        // Popular badge
        if (isPopular) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .background(OttColors.Brand, RoundedCornerShape(bottomStart = 8.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            ) {
                Text("POPULAR", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
            }
        }

        Row(
            modifier              = Modifier.fillMaxWidth(),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // Radio indicator
                Box(
                    modifier = Modifier
                        .size(22.dp)
                        .clip(CircleShape)
                        .border(2.dp, if (isSelected) OttColors.Brand else OttColors.Border, CircleShape)
                        .background(if (isSelected) OttColors.Brand else Color.Transparent),
                    contentAlignment = Alignment.Center,
                ) {
                    if (isSelected) {
                        Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(14.dp))
                    }
                }

                Column {
                    Text(plan.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(
                        "${plan.durationDays} days · ${plan.maxDevices} device${if (plan.maxDevices > 1) "s" else ""} · up to ${plan.maxQuality}",
                        color    = OttColors.TextMuted,
                        fontSize = 12.sp,
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "₹${plan.priceInr.toInt()}",
                    color      = if (isSelected) OttColors.Brand else Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize   = 20.sp,
                )
                Text(
                    if (plan.durationDays >= 365) "/year" else "/month",
                    color    = OttColors.TextMuted,
                    fontSize = 11.sp,
                )
                // Per-day cost
                val perDay = plan.priceInr / plan.durationDays
                Text(
                    "₹${"%.1f".format(perDay)}/day",
                    color    = OttColors.TextMuted,
                    fontSize = 10.sp,
                )
            }
        }
    }
}
