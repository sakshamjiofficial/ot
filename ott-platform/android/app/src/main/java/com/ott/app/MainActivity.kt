package com.ott.app

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
import com.ott.app.presentation.navigation.AppNavigation
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.ott.app.data.local.TokenStorage
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity(), PaymentResultListener {

    @Inject
    lateinit var tokenStorage: TokenStorage

    var razorpayCallback: ((success: Boolean, paymentId: String?, error: String?) -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Checkout.preload(applicationContext)

        lifecycleScope.launch {
            if (tokenStorage.getDeviceId() == null) {
                tokenStorage.saveDeviceId(java.util.UUID.randomUUID().toString())
            }
        }
        setContent {
            MaterialTheme {
                AppNavigation(
                    modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A))
                )
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
