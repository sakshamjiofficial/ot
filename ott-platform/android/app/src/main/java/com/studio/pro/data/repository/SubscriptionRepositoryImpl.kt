package com.studio.pro.data.repository

import com.studio.pro.data.remote.api.OttApiService
import com.studio.pro.domain.model.SubscriptionPlan
import com.studio.pro.domain.repository.*
import kotlinx.coroutines.flow.*
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SubscriptionRepositoryImpl @Inject constructor(
    private val api: OttApiService,
) : SubscriptionRepository {

    override fun getPlans(): Flow<Resource<List<SubscriptionPlan>>> = flow {
        emit(Resource.Loading)
        try {
            val response = api.getSubscriptionPlans()
            if (response.isSuccessful) {
                val plans = response.body()?.data?.map { dto ->
                    SubscriptionPlan(
                        dto.id, dto.name, dto.planType,
                        dto.priceInr, dto.durationDays, dto.maxDevices, dto.maxQuality,
                    )
                } ?: emptyList()
                emit(Resource.Success(plans))
            } else {
                emit(Resource.Error("Failed to load plans", response.code()))
            }
        } catch (e: Exception) {
            Timber.e(e, "getPlans error")
            emit(Resource.Error(e.message ?: "Network error"))
        }
    }

    override suspend fun createOrder(planId: Int): Resource<Triple<String, Int, String>> {
        return try {
            val response = api.createOrder(mapOf("planId" to planId))
            if (response.isSuccessful && response.body()?.data != null) {
                val data = response.body()!!.data!!
                Resource.Success(Triple(data.orderId, data.amount, data.keyId))
            } else {
                Resource.Error(response.body()?.message ?: "Order creation failed", response.code())
            }
        } catch (e: Exception) {
            Timber.e(e, "createOrder error")
            Resource.Error(e.message ?: "Network error")
        }
    }

    override suspend fun verifyPayment(
        orderId:   String,
        paymentId: String,
        signature: String,
    ): Resource<Unit> {
        return try {
            val response = api.verifyPayment(
                mapOf(
                    "razorpayOrderId"   to orderId,
                    "razorpayPaymentId" to paymentId,
                    "razorpaySignature" to signature,
                )
            )
            if (response.isSuccessful) Resource.Success(Unit)
            else Resource.Error("Payment verification failed", response.code())
        } catch (e: Exception) {
            Timber.e(e, "verifyPayment error")
            Resource.Error(e.message ?: "Network error")
        }
    }
}
