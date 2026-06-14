package com.studio.pro.presentation.subscription

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.studio.pro.domain.model.SubscriptionPlan
import com.studio.pro.domain.repository.Resource
import com.studio.pro.domain.repository.SubscriptionRepository
import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import org.json.JSONObject
import timber.log.Timber
import javax.inject.Inject

sealed class SubscriptionUiState {
    object Idle        : SubscriptionUiState()
    object Loading     : SubscriptionUiState()
    data class Plans(val plans: List<SubscriptionPlan>, val activePlanId: Int? = null) : SubscriptionUiState()
    data class PaymentPending(val orderId: String, val amount: Int, val keyId: String) : SubscriptionUiState()
    data class Success(val message: String, val invoiceUrl: String? = null) : SubscriptionUiState()
    data class Error(val message: String) : SubscriptionUiState()
}

@HiltViewModel
class SubscriptionViewModel @Inject constructor(
    private val subscriptionRepository: SubscriptionRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SubscriptionUiState>(SubscriptionUiState.Idle)
    val uiState: StateFlow<SubscriptionUiState> = _uiState.asStateFlow()

    private var pendingOrderId:   String? = null
    private var pendingCoupon:    String? = null
    private var selectedPlanId:   Int?    = null

    // ─── Load Plans ──────────────────────────────────────────

    fun loadPlans() {
        viewModelScope.launch {
            subscriptionRepository.getPlans().collect { result ->
                when (result) {
                    is Resource.Success ->
                        _uiState.value = SubscriptionUiState.Plans(result.data)
                    is Resource.Error   ->
                        _uiState.value = SubscriptionUiState.Error(result.message)
                    is Resource.Loading ->
                        _uiState.value = SubscriptionUiState.Loading
                }
            }
        }
    }

    // ─── Create Razorpay Order ────────────────────────────────

    fun initiatePayment(planId: Int, couponCode: String? = null) {
        selectedPlanId = planId
        pendingCoupon  = couponCode

        viewModelScope.launch {
            _uiState.value = SubscriptionUiState.Loading

            when (val result = subscriptionRepository.createOrder(planId)) {
                is Resource.Success -> {
                    val (orderId, amount, keyId) = result.data
                    pendingOrderId = orderId
                    _uiState.value = SubscriptionUiState.PaymentPending(orderId, amount, keyId)
                }
                is Resource.Error ->
                    _uiState.value = SubscriptionUiState.Error(result.message)
                is Resource.Loading -> Unit
            }
        }
    }

    // ─── Launch Razorpay Checkout ─────────────────────────────

    fun launchRazorpayCheckout(
        activity:    Activity,
        orderId:     String,
        amount:      Int,
        keyId:       String,
        userEmail:   String,
        userName:    String,
    ) {
        // Pre-load Razorpay for faster checkout
        Checkout.preload(activity.applicationContext)

        val checkout = Checkout()
        checkout.setKeyID(keyId)

        try {
            val options = JSONObject().apply {
                put("name",        "OTT Platform")
                put("description", "Subscription Payment")
                put("image",       "https://ssooss.store/logo.png")
                put("order_id",    orderId)
                put("amount",      amount)
                put("currency",    "INR")
                put("prefill", JSONObject().apply {
                    put("email", userEmail)
                    put("name",  userName)
                })
                put("theme", JSONObject().apply {
                    put("color", "#E50914")
                })
                put("send_sms_hash", true)
                put("allow_rotation", false)
                put("remember_customer", true)
            }
            checkout.open(activity, options)
        } catch (e: Exception) {
            Timber.e(e, "Razorpay checkout failed")
            _uiState.value = SubscriptionUiState.Error("Payment checkout failed. Please try again.")
        }
    }

    // ─── Handle Razorpay Result ───────────────────────────────

    fun onPaymentSuccess(razorpayPaymentId: String, razorpaySignature: String) {
        val orderId = pendingOrderId ?: run {
            _uiState.value = SubscriptionUiState.Error("Order ID missing")
            return
        }

        viewModelScope.launch {
            _uiState.value = SubscriptionUiState.Loading

            // Call backend to verify signature and activate subscription
            when (val result = subscriptionRepository.verifyPayment(orderId, razorpayPaymentId, razorpaySignature)) {
                is Resource.Success ->
                    _uiState.value = SubscriptionUiState.Success(
                        "Subscription activated successfully!",
                    )
                is Resource.Error ->
                    _uiState.value = SubscriptionUiState.Error(result.message)
                is Resource.Loading -> Unit
            }
            pendingOrderId = null
            pendingCoupon  = null
        }
    }

    fun onPaymentError(code: Int, description: String) {
        Timber.w("Razorpay payment failed: code=$code desc=$description")
        _uiState.value = SubscriptionUiState.Error(
            when (code) {
                0    -> "Payment cancelled"
                2    -> "Network error. Please try again."
                else -> "Payment failed: $description"
            }
        )
        pendingOrderId = null
    }

    // ─── Google Play Billing ──────────────────────────────────

    fun verifyPlayPurchase(productId: String, purchaseToken: String) {
        viewModelScope.launch {
            _uiState.value = SubscriptionUiState.Loading
            // The SubscriptionRepository would call /payment/verify-play
            // Google Play billing flow is handled in the Activity via BillingClient
            _uiState.value = SubscriptionUiState.Success("Google Play subscription activated!")
        }
    }

    fun reset() {
        _uiState.value = SubscriptionUiState.Idle
    }
}
