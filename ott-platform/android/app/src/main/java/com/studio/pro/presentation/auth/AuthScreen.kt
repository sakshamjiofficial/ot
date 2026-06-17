package com.studio.pro.presentation.auth

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.res.painterResource
import com.studio.pro.R
import com.studio.pro.presentation.common.OttColors

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onRegisterClick: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val uiState     by viewModel.uiState.collectAsStateWithLifecycle()
    val focusMgr    = LocalFocusManager.current
    var email       by remember { mutableStateOf("") }
    var password    by remember { mutableStateOf("") }
    var showPw      by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) onLoginSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(OttColors.Background)
            .imePadding(),
    ) {
        // Top cinematic ambient gradient
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(OttColors.Brand.copy(alpha = 0.20f), Color.Transparent)
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(70.dp))

            // Logo with ContentScale.Fit and correct aspect ratio
            Image(
                painter = painterResource(id = R.drawable.homelogo),
                contentDescription = "Studio Logo",
                modifier = Modifier
                    .width(180.dp)
                    .height(72.dp),
                contentScale = ContentScale.Fit
            )

            Spacer(Modifier.height(24.dp))
            Text("Welcome Back", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 28.sp)
            Spacer(Modifier.height(4.dp))
            Text("Sign in to continue watching", color = OttColors.TextSecondary, fontSize = 14.sp)
            Spacer(Modifier.height(36.dp))

            // Email
            OutlinedTextField(
                value            = email,
                onValueChange    = { email = it },
                label            = { Text("Email") },
                leadingIcon      = { Icon(Icons.Default.Email, contentDescription = null) },
                keyboardOptions  = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction    = ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(onNext = { focusMgr.moveFocus(FocusDirection.Down) }),
                singleLine       = true,
                shape            = RoundedCornerShape(12.dp),
                modifier         = Modifier.fillMaxWidth(),
                colors           = OttTextFieldColors(),
            )

            Spacer(Modifier.height(14.dp))

            // Password
            OutlinedTextField(
                value            = password,
                onValueChange    = { password = it },
                label            = { Text("Password") },
                leadingIcon      = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon     = {
                    IconButton(onClick = { showPw = !showPw }) {
                        Icon(
                            if (showPw) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = null,
                        )
                    }
                },
                visualTransformation = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions  = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction    = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = {
                    focusMgr.clearFocus()
                    viewModel.login(email, password)
                }),
                singleLine       = true,
                shape            = RoundedCornerShape(12.dp),
                modifier         = Modifier.fillMaxWidth(),
                colors           = OttTextFieldColors(),
            )

            // Error
            if (uiState is AuthUiState.Error) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text     = (uiState as AuthUiState.Error).message,
                    color    = Color(0xFFEF4444),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(Modifier.height(28.dp))

            // Sign In Button
            Button(
                onClick  = { viewModel.login(email, password) },
                enabled  = email.isNotBlank() && password.isNotBlank() && uiState !is AuthUiState.Loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape    = RoundedCornerShape(12.dp),
                colors   = ButtonDefaults.buttonColors(
                    containerColor = OttColors.Brand,
                    disabledContainerColor = OttColors.Brand.copy(alpha = 0.5f),
                    contentColor = Color.White,
                    disabledContentColor = Color.White.copy(alpha = 0.5f)
                ),
            ) {
                if (uiState is AuthUiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text("Sign In", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(24.dp))

            // Register link
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Don't have an account? ", color = OttColors.TextSecondary, fontSize = 14.sp)
                Text(
                    "Sign Up",
                    color     = OttColors.Brand,
                    fontWeight = FontWeight.Bold,
                    fontSize  = 14.sp,
                    modifier  = Modifier.clickable { onRegisterClick() },
                )
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onLoginClick:      () -> Unit,
    viewModel:         AuthViewModel = hiltViewModel(),
) {
    val uiState  by viewModel.uiState.collectAsStateWithLifecycle()
    val focusMgr = LocalFocusManager.current
    var name     by remember { mutableStateOf("") }
    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPw   by remember { mutableStateOf(false) }

    val hasMinLength = password.length >= 8
    val hasUppercase = password.any { it.isUpperCase() }
    val hasLowercase = password.any { it.isLowerCase() }
    val hasDigit     = password.any { it.isDigit() }
    val isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasDigit

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) onRegisterSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(OttColors.Background)
            .imePadding(),
    ) {
        // Top cinematic ambient gradient
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(OttColors.Brand.copy(alpha = 0.20f), Color.Transparent)
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(50.dp))

            // Logo with ContentScale.Fit and correct aspect ratio
            Image(
                painter = painterResource(id = R.drawable.homelogo),
                contentDescription = "Studio Logo",
                modifier = Modifier
                    .width(180.dp)
                    .height(72.dp),
                contentScale = ContentScale.Fit
            )

            Spacer(Modifier.height(20.dp))
            Text("Create Account", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 28.sp)
            Spacer(Modifier.height(4.dp))
            Text("Start watching in minutes", color = OttColors.TextSecondary, fontSize = 14.sp)
            Spacer(Modifier.height(32.dp))

            OutlinedTextField(
                value            = name,
                onValueChange    = { input ->
                    name = if (input.isNotEmpty()) {
                        input.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                    } else {
                        input
                    }
                },
                label            = { Text("Display Name") },
                leadingIcon      = { Icon(Icons.Default.Person, contentDescription = null) },
                keyboardOptions  = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Words,
                    imeAction      = ImeAction.Next
                ),
                keyboardActions  = KeyboardActions(onNext = { focusMgr.moveFocus(FocusDirection.Down) }),
                singleLine       = true,
                shape            = RoundedCornerShape(12.dp),
                modifier         = Modifier.fillMaxWidth(),
                colors           = OttTextFieldColors(),
            )
            Spacer(Modifier.height(14.dp))

            OutlinedTextField(
                value            = email,
                onValueChange    = { email = it },
                label            = { Text("Email") },
                leadingIcon      = { Icon(Icons.Default.Email, contentDescription = null) },
                keyboardOptions  = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions  = KeyboardActions(onNext = { focusMgr.moveFocus(FocusDirection.Down) }),
                singleLine       = true,
                shape            = RoundedCornerShape(12.dp),
                modifier         = Modifier.fillMaxWidth(),
                colors           = OttTextFieldColors(),
            )
            Spacer(Modifier.height(14.dp))

            OutlinedTextField(
                value                = password,
                onValueChange        = { password = it },
                label                = { Text("Password") },
                leadingIcon          = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon         = {
                    IconButton(onClick = { showPw = !showPw }) {
                        Icon(if (showPw) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = null)
                    }
                },
                visualTransformation = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions      = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions      = KeyboardActions(onDone = {
                    focusMgr.clearFocus()
                    if (isPasswordValid && name.isNotBlank() && email.isNotBlank()) {
                        viewModel.register(email, password, name)
                    }
                }),
                singleLine           = true,
                shape                = RoundedCornerShape(12.dp),
                modifier             = Modifier.fillMaxWidth(),
                colors               = OttTextFieldColors(),
            )

            Spacer(Modifier.height(16.dp))

            // Premium Card for Password requirements checklist
            Card(
                colors = CardDefaults.cardColors(containerColor = OttColors.Surface),
                border = BorderStroke(1.dp, OttColors.Border),
                shape  = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Password must contain:", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Spacer(Modifier.height(2.dp))
                    RequirementRow(text = "At least 8 characters", isMet = hasMinLength)
                    RequirementRow(text = "An uppercase letter (A-Z)", isMet = hasUppercase)
                    RequirementRow(text = "A lowercase letter (a-z)", isMet = hasLowercase)
                    RequirementRow(text = "A number (0-9)", isMet = hasDigit)
                }
            }

            if (uiState is AuthUiState.Error) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = (uiState as AuthUiState.Error).message,
                    color = Color(0xFFEF4444),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(Modifier.height(28.dp))

            Button(
                onClick  = { viewModel.register(email, password, name) },
                enabled  = email.isNotBlank() && isPasswordValid && name.isNotBlank() && uiState !is AuthUiState.Loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape    = RoundedCornerShape(12.dp),
                colors   = ButtonDefaults.buttonColors(
                    containerColor = OttColors.Brand,
                    disabledContainerColor = OttColors.Brand.copy(alpha = 0.5f),
                    contentColor = Color.White,
                    disabledContentColor = Color.White.copy(alpha = 0.5f)
                ),
            ) {
                if (uiState is AuthUiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text("Create Account", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.height(24.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Already have an account? ", color = OttColors.TextSecondary, fontSize = 14.sp)
                Text(
                    "Sign In",
                    color      = OttColors.Brand,
                    fontWeight = FontWeight.Bold,
                    fontSize   = 14.sp,
                    modifier   = Modifier.clickable { onLoginClick() },
                )
            }

            Spacer(Modifier.height(32.dp))
            Text(
                "By creating an account you agree to our Terms of Service and Privacy Policy.",
                color    = OttColors.TextMuted,
                fontSize = 11.sp,
                modifier = Modifier.fillMaxWidth(),
                lineHeight = 16.sp
            )
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
private fun RequirementRow(text: String, isMet: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = if (isMet) Icons.Default.CheckCircle else Icons.Default.Cancel,
            contentDescription = null,
            tint = if (isMet) Color(0xFF10B981) else Color(0xFFEF4444),
            modifier = Modifier.size(15.dp)
        )
        Text(
            text = text,
            color = if (isMet) Color(0xFF10B981) else OttColors.TextSecondary,
            fontSize = 12.sp
        )
    }
}

@Composable
fun OttTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor   = OttColors.Brand,
    unfocusedBorderColor = OttColors.Border,
    focusedLabelColor    = OttColors.Brand,
    unfocusedLabelColor  = OttColors.TextMuted,
    cursorColor          = OttColors.Brand,
    focusedTextColor     = Color.White,
    unfocusedTextColor   = Color.White,
    focusedLeadingIconColor   = OttColors.Brand,
    unfocusedLeadingIconColor = OttColors.TextMuted,
    focusedContainerColor = OttColors.Surface,
    unfocusedContainerColor = OttColors.Surface,
    focusedTrailingIconColor = Color.White,
    unfocusedTrailingIconColor = OttColors.TextMuted,
)
