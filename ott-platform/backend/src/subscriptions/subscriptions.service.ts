import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionEntity, SubscriptionPlanEntity,
  SubscriptionStatus, SubscriptionPlanType,
} from './entities/subscription.entity';
import { PaymentEntity, PaymentStatus, PaymentGateway } from '../payments/entities/payment.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RazorpayService }    from '../payments/razorpay.service';
import { GooglePlayService }  from '../payments/google-play.service';
import { CouponsService }     from '../coupons/coupons.service';
import { InvoiceService }     from '../invoices/invoice.service';
import {
  CreateOrderDto, VerifyRazorpayDto,
  VerifyPlayBillingDto, ValidateCouponDto, StartFreeTrialDto,
  CreatePlanDto, UpdatePlanDto,
} from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private subRepo:  Repository<SubscriptionEntity>,

    @InjectRepository(SubscriptionPlanEntity)
    private planRepo: Repository<SubscriptionPlanEntity>,

    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,

    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    private razorpayService:   RazorpayService,
    private googlePlayService: GooglePlayService,
    private couponsService:    CouponsService,
    private invoiceService:    InvoiceService,
    private configService:     ConfigService,
    private dataSource:        DataSource,
  ) {}

  // ─── Get all plans ────────────────────────────────────────

  async getPlans(includeInactive = false): Promise<SubscriptionPlanEntity[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.planRepo.find({
      where,
      order: { priceInr: 'ASC' },
    });
  }

  async getPlanById(id: number): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async createPlan(dto: CreatePlanDto): Promise<SubscriptionPlanEntity> {
    const plan = this.planRepo.create({
      name: dto.name,
      planType: dto.planType as SubscriptionPlanType,
      priceInr: dto.priceInr,
      durationDays: dto.durationDays,
      maxDevices: dto.maxDevices ?? 1,
      maxQuality: dto.maxQuality ?? '1080p',
      features: {},
      isActive: true,
    });
    return this.planRepo.save(plan);
  }

  async updatePlan(id: number, dto: UpdatePlanDto): Promise<SubscriptionPlanEntity> {
    const plan = await this.getPlanById(id);

    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.planType !== undefined) plan.planType = dto.planType as SubscriptionPlanType;
    if (dto.priceInr !== undefined) plan.priceInr = dto.priceInr;
    if (dto.durationDays !== undefined) plan.durationDays = dto.durationDays;
    if (dto.maxDevices !== undefined) plan.maxDevices = dto.maxDevices;
    if (dto.maxQuality !== undefined) plan.maxQuality = dto.maxQuality;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;

    return this.planRepo.save(plan);
  }

  async deletePlan(id: number): Promise<void> {
    const plan = await this.getPlanById(id);
    const subCount = await this.subRepo.count({ where: { plan: { id } } });
    if (subCount > 0) {
      plan.isActive = false;
      await this.planRepo.save(plan);
    } else {
      await this.planRepo.remove(plan);
    }
  }

  // ─── Check active subscription ────────────────────────────

  async getActiveSubscription(userId: string): Promise<SubscriptionEntity | null> {
    return this.subRepo.findOne({
      where: {
        userId,
        status:    SubscriptionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['plan'],
      order:     { expiresAt: 'DESC' },
    });
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId);
    return sub !== null;
  }

  // ─── Free Trial ───────────────────────────────────────────

  async startFreeTrial(userId: string, dto: StartFreeTrialDto): Promise<SubscriptionEntity> {
    // Only one trial ever
    const previousTrial = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.TRIAL },
    });
    if (previousTrial) {
      throw new BadRequestException('Free trial already used for this account');
    }

    const existing = await this.getActiveSubscription(userId);
    if (existing) {
      throw new BadRequestException('Already have an active subscription');
    }

    const plan      = await this.getPlanById(dto.planId);
    const trialDays = parseInt(
      this.configService.get('FREE_TRIAL_DAYS', '7'), 10,
    );
    const now     = new Date();
    const expires = new Date(now.getTime() + trialDays * 86400_000);

    const trial = this.subRepo.create({
      userId,
      planId:    plan.id,
      status:    SubscriptionStatus.TRIAL,
      startsAt:  now,
      expiresAt: expires,
      autoRenew: false,
    });

    const saved = await this.subRepo.save(trial);
    this.logger.log(`Free trial started for user ${userId}, expires ${expires.toISOString()}`);
    return saved;
  }

  // ─── Validate Coupon ──────────────────────────────────────

  async validateCoupon(dto: ValidateCouponDto) {
    const plan = await this.getPlanById(dto.planId);
    return this.couponsService.validate(dto.code, dto.planId, plan.priceInr);
  }

  // ─── Create Razorpay Order ────────────────────────────────

  async createOrder(userId: string, dto: CreateOrderDto): Promise<{
    orderId:        string;
    amount:         number;
    currency:       string;
    keyId:          string;
    discountAmount: number;
    finalAmount:    number;
    couponMessage?: string;
    paymentId:      string;   // internal payment record ID
  }> {
    const plan = await this.getPlanById(dto.planId);

    if (plan.planType === SubscriptionPlanType.FREE) {
      throw new BadRequestException('Free plan does not require payment');
    }

    let discountAmount = 0;
    let finalAmount    = plan.priceInr;
    let couponMessage: string | undefined;

    // Apply coupon if provided
    if (dto.couponCode) {
      const couponResult = await this.couponsService.validate(
        dto.couponCode, dto.planId, plan.priceInr,
      );
      if (!couponResult.isValid) {
        throw new BadRequestException(couponResult.message);
      }
      discountAmount = couponResult.discountAmount;
      finalAmount    = couponResult.finalAmount;
      couponMessage  = couponResult.message;
    }

    const receipt = `ott_${userId.slice(0, 8)}_${Date.now()}`;
    const order   = await this.razorpayService.createOrder(finalAmount, receipt, {
      userId,
      planId: String(dto.planId),
    });

    // Create pending payment record
    const payment = this.paymentRepo.create({
      userId,
      planId:          dto.planId,
      gateway:         PaymentGateway.RAZORPAY,
      razorpayOrderId: order.id,
      amountInr:       plan.priceInr,
      discountAmount,
      couponCode:      dto.couponCode,
      status:          PaymentStatus.PENDING,
    });
    const savedPayment = await this.paymentRepo.save(payment);

    return {
      orderId:        order.id,
      amount:         order.amount,
      currency:       order.currency,
      keyId:          order.keyId,
      discountAmount,
      finalAmount,
      couponMessage,
      paymentId:      savedPayment.id,
    };
  }

  // ─── Verify Razorpay Payment ──────────────────────────────

  async verifyRazorpay(userId: string, dto: VerifyRazorpayDto): Promise<{
    subscription: SubscriptionEntity;
    invoiceUrl:   string;
  }> {
    // 1. Verify signature
    const isValid = this.razorpayService.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isValid) {
      this.logger.warn(`Invalid payment signature for order ${dto.razorpayOrderId}`);
      throw new BadRequestException('Payment verification failed — invalid signature');
    }

    // 2. Find pending payment record
    const payment = await this.paymentRepo.findOne({
      where: { razorpayOrderId: dto.razorpayOrderId, userId },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (payment.status === PaymentStatus.SUCCESS) {
      // Already processed — idempotent return
      const sub = await this.getActiveSubscription(userId);
      return { subscription: sub, invoiceUrl: payment.invoiceUrl };
    }

    // 3. Fetch payment details from Razorpay
    const details = await this.razorpayService.fetchPayment(dto.razorpayPaymentId);

    // 4. Transactionally create subscription + mark payment success
    const subscription = await this.dataSource.transaction(async (manager) => {
      const plan = await manager.findOne(SubscriptionPlanEntity, {
        where: { id: payment.planId },
      });

      // Expire any existing active subscription
      await manager.update(
        SubscriptionEntity,
        { userId, status: SubscriptionStatus.ACTIVE },
        { status: SubscriptionStatus.EXPIRED },
      );

      const now     = new Date();
      const expires = new Date(now.getTime() + plan.durationDays * 86400_000);

      const sub = manager.create(SubscriptionEntity, {
        userId,
        planId:   plan.id,
        status:   SubscriptionStatus.ACTIVE,
        startsAt: now,
        expiresAt: expires,
        autoRenew: true,
      });
      const savedSub = await manager.save(sub);

      // Update payment record
      await manager.update(PaymentEntity, payment.id, {
        subscriptionId:   savedSub.id,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
        status:           PaymentStatus.SUCCESS,
        paymentMethod:    details.method,
      });

      return savedSub;
    });

    // 5. Redeem coupon if used
    if (payment.couponCode) {
      await this.couponsService.redeem(payment.couponCode);
    }

    // 6. Generate invoice
    const user    = await this.userRepo.findOne({ where: { id: userId } });
    const plan    = await this.getPlanById(payment.planId);
    const invoiceData = {
      invoiceNumber:   this.invoiceService.generateInvoiceNumber(),
      date:            new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      customerName:    user.displayName || user.email.split('@')[0],
      customerEmail:   user.email,
      planName:        plan.name,
      planDuration:    `${plan.durationDays} days`,
      amountInr:       payment.amountInr,
      discountAmount:  payment.discountAmount || 0,
      finalAmount:     payment.amountInr - (payment.discountAmount || 0),
      paymentMethod:   details.method.toUpperCase(),
      razorpayOrderId: dto.razorpayOrderId,
      transactionId:   dto.razorpayPaymentId,
    };

    const invoiceUrl = await this.invoiceService.generateAndUpload(payment.id, invoiceData);

    this.logger.log(`Subscription activated for user ${userId}, expires ${subscription.expiresAt}`);
    return { subscription, invoiceUrl };
  }

  // ─── Verify Google Play Billing ───────────────────────────

  async verifyPlayBilling(
    userId: string,
    dto:    VerifyPlayBillingDto,
  ): Promise<SubscriptionEntity> {
    const result = await this.googlePlayService.verifySubscription(
      dto.productId,
      dto.purchaseToken,
    );

    if (!result.isValid) {
      throw new BadRequestException('Google Play purchase verification failed');
    }

    // Map product ID to plan
    const planId = dto.planId ?? this.googlePlayService.mapProductIdToPlanId(dto.productId);
    if (!planId) throw new BadRequestException('Unknown Google Play product ID');

    const plan    = await this.getPlanById(planId);
    const expires = new Date(result.expiryTimeMs);

    const subscription = await this.dataSource.transaction(async (manager) => {
      // Expire existing subscriptions
      await manager.update(
        SubscriptionEntity,
        { userId, status: SubscriptionStatus.ACTIVE },
        { status: SubscriptionStatus.EXPIRED },
      );

      const sub = manager.create(SubscriptionEntity, {
        userId,
        planId:           plan.id,
        status:           SubscriptionStatus.ACTIVE,
        startsAt:         new Date(),
        expiresAt:        expires,
        autoRenew:        result.autoRenewing,
        playPurchaseToken: dto.purchaseToken,
      });
      const savedSub = await manager.save(sub);

      // Record payment
      await manager.save(manager.create(PaymentEntity, {
        userId,
        subscriptionId:    savedSub.id,
        planId,
        gateway:           PaymentGateway.GOOGLE_PLAY,
        playOrderId:       result.orderId,
        playPurchaseToken: dto.purchaseToken,
        amountInr:         plan.priceInr,
        status:            PaymentStatus.SUCCESS,
        paymentMethod:     'google_play',
      }));

      return savedSub;
    });

    // Acknowledge the purchase (must do within 3 days)
    await this.googlePlayService.acknowledgePurchase(dto.productId, dto.purchaseToken);

    this.logger.log(`Play subscription activated for user ${userId}`);
    return subscription;
  }

  // ─── Cancel Subscription ──────────────────────────────────

  async cancelSubscription(userId: string): Promise<void> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) throw new NotFoundException('No active subscription found');

    await this.subRepo.update(sub.id, {
      autoRenew: false,
      status:    SubscriptionStatus.CANCELLED,
    });

    this.logger.log(`Subscription cancelled for user ${userId}`);
  }

  // ─── Expiry cron job (call from scheduler) ────────────────

  async expireStaleSubscriptions(): Promise<number> {
    const result = await this.subRepo
      .createQueryBuilder()
      .update(SubscriptionEntity)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('expires_at < NOW()')
      .andWhere('status IN (:...statuses)', {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      })
      .execute();

    if (result.affected > 0) {
      this.logger.log(`Expired ${result.affected} subscriptions`);
    }
    return result.affected;
  }

  // ─── Admin: subscription stats ────────────────────────────

  async getStats() {
    const [active, trials, expired, totalRevenue] = await Promise.all([
      this.subRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.subRepo.count({ where: { status: SubscriptionStatus.TRIAL } }),
      this.subRepo.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('SUM(p.amount_inr - COALESCE(p.discount_amount, 0))', 'total')
        .where('p.status = :status', { status: PaymentStatus.SUCCESS })
        .getRawOne(),
    ]);

    return {
      activeSubscriptions: active,
      trialSubscriptions:  trials,
      expiredSubscriptions: expired,
      totalRevenueInr:     parseFloat(totalRevenue?.total || '0'),
    };
  }

  // ─── Admin: Manual Subscription Control ──────────────────

  async adminActivateSubscription(userId: string, planId: number): Promise<SubscriptionEntity> {
    const plan = await this.getPlanById(planId);

    // Deactivate current active subscriptions
    const active = await this.getActiveSubscription(userId);
    if (active) {
      active.status = SubscriptionStatus.EXPIRED;
      await this.subRepo.save(active);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + plan.durationDays * 86400_000);

    const sub = this.subRepo.create({
      userId,
      planId,
      status: SubscriptionStatus.ACTIVE,
      startsAt: now,
      expiresAt: expires,
      autoRenew: false,
    });

    return this.subRepo.save(sub);
  }

  async adminDeactivateSubscription(userId: string): Promise<void> {
    const active = await this.getActiveSubscription(userId);
    if (active) {
      active.status = SubscriptionStatus.EXPIRED;
      await this.subRepo.save(active);
    }
  }
}
