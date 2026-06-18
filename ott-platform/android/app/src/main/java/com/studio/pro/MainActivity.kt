package com.studio.pro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.studio.pro.presentation.navigation.AppNavigation
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.studio.pro.data.local.TokenStorage
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity(), PaymentResultListener {

    @Inject
    lateinit var tokenStorage: TokenStorage

    @Inject
    lateinit var exoPlayerManager: com.studio.pro.player.ExoPlayerManager

    var razorpayCallback: ((success: Boolean, paymentId: String?, error: String?) -> Unit)? = null

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            if (exoPlayerManager.isPlaying()) {
                val params = android.app.PictureInPictureParams.Builder()
                    .setAspectRatio(android.util.Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        var keepSplash = true
        
        splashScreen.setKeepOnScreenCondition { keepSplash }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Checkout.preload(applicationContext)

        var startDest by androidx.compose.runtime.mutableStateOf<String?>(null)

        lifecycleScope.launch {
            if (tokenStorage.getDeviceId() == null) {
                tokenStorage.saveDeviceId(java.util.UUID.randomUUID().toString())
            }
            startDest = if (tokenStorage.getAccessToken() != null) {
                com.studio.pro.presentation.navigation.Routes.CHOOSE_PROFILE
            } else {
                com.studio.pro.presentation.navigation.Routes.LOGIN
            }
            keepSplash = false
        }
        setContent {
            MaterialTheme {
                startDest?.let { dest ->
                    AppNavigation(
                        modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A)),
                        startDestination = dest
                    )
                }
            }
        }
    }

    override fun onPaymentSuccess(razorpayPaymentId: String) {
        Timber.d("Razorpay success: $razorpayPaymentId")
        razorpayCallback?.invoke(true, razorpayPaymentId, null)
        razorpayCallback = null
    }

    override fun onPaymentError(code: Int, description: String) {
        Timber.w("Razorpay error code=$code: $description")
        razorpayCallback?.invoke(false, null, "$code: $description")
        razorpayCallback = null
    }
}
