import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, HttpCode, HttpStatus, RawBodyRequest,
  Req, Headers, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { SubscriptionsService }  from './subscriptions.service';
import { RazorpayService }       from '../payments/razorpay.service';
import { CouponsService }        from '../coupons/coupons.service';
import { JwtAuthGuard }          from '../common/guards/jwt-auth.guard';
import { RolesGuard }            from '../common/guards/roles.guard';
import { Roles, Role }           from '../common/decorators/roles.decorator';
import { Public }                from '../common/decorators/public.decorator';
import { CurrentUser }           from '../common/decorators/current-user.decorator';
import {
  CreateOrderDto, VerifyRazorpayDto, VerifyPlayBillingDto,
  ValidateCouponDto, StartFreeTrialDto, CreatePlanDto, UpdatePlanDto,
} from './dto/subscription.dto';

@ApiTags('subscriptions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subsService:    SubscriptionsService,
    private readonly razorpayService: RazorpayService,
    private readonly couponsService:  CouponsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // PUBLIC — Plans
  // ─────────────────────────────────────────────────────────

  @Public()
  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'List all active subscription plans' })
  getPlans() {
    return this.subsService.getPlans();
  }

  @Public()
  @Get('subscriptions/plans/:id')
  @ApiOperation({ summary: 'Get single plan' })
  getPlan(@Param('id') id: string) {
    return this.subsService.getPlanById(parseInt(id));
  }

  // ─────────────────────────────────────────────────────────
  // AUTH — Current subscription
  // ─────────────────────────────────────────────────────────

  @Get('subscriptions/me')
  @ApiOperation({ summary: 'Get my active subscription' })
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subsService.getActiveSubscription(userId);
  }

  @Post('subscriptions/trial')
  @ApiOperation({ summary: 'Start free trial' })
  startTrial(
    @CurrentUser('id') userId: string,
    @Body() dto: StartFreeTrialDto,
  ) {
    return this.subsService.startFreeTrial(userId, dto);
  }

  @Delete('subscriptions/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel subscription (sets auto-renew off)' })
  cancelSubscription(@CurrentUser('id') userId: string) {
    return this.subsService.cancelSubscription(userId);
  }

  // ─────────────────────────────────────────────────────────
  // RAZORPAY FLOW
  // ─────────────────────────────────────────────────────────

  @Post('payment/create-order')
  @ApiOperation({ summary: 'Create Razorpay order — Step 1 of payment' })
  createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.subsService.createOrder(userId, dto);
  }

  @Post('payment/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature — Step 2' })
  verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyRazorpayDto,
  ) {
    return this.subsService.verifyRazorpay(userId, dto);
  }

  // ─────────────────────────────────────────────────────────
  // RAZORPAY WEBHOOK (no auth — signature verified inside)
  // ─────────────────────────────────────────────────────────

  @Public()
  @Post('payment/webhook/razorpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook receiver' })
  async razorpayWebhook(
    @Req()     req:  Request,
    @Headers('x-razorpay-signature') sig: string,
    @Body()    body: any,
  ) {
    const rawBody = JSON.stringify(body);

    if (!this.razorpayService.verifyWebhookSignature(rawBody, sig)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;

    switch (event) {
      case 'payment.captured':
        // Payment captured — subscription already activated via /verify
        // This is a safety net for cases where the app closed before /verify
        break;

      case 'payment.failed':
        // TODO: notify user via FCM
        break;

      case 'subscription.charged':
        // Auto-renewal charged — extend subscription
        break;

      default:
        break;
    }

    return { received: true };
  }

  // ─────────────────────────────────────────────────────────
  // GOOGLE PLAY BILLING
  // ─────────────────────────────────────────────────────────

  @Post('payment/verify-play')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Google Play subscription purchase' })
  verifyPlayBilling(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPlayBillingDto,
  ) {
    return this.subsService.verifyPlayBilling(userId, dto);
  }

  // ─────────────────────────────────────────────────────────
  // COUPONS
  // ─────────────────────────────────────────────────────────

  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code without redeeming' })
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.subsService.validateCoupon(dto);
  }

  // ─── Admin: Coupon management ─────────────────────────────

  @Get('admin/coupons')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  listCoupons() {
    return this.couponsService.listCoupons();
  }

  @Post('admin/coupons')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createCoupon(@Body() body: any) {
    return this.couponsService.createCoupon(body);
  }

  @Post('admin/coupons/:id/toggle')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  toggleCoupon(@Param('id') id: string) {
    return this.couponsService.toggleCoupon(id);
  }

  @Delete('admin/coupons/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCoupon(@Param('id') id: string) {
    return this.couponsService.deleteCoupon(id);
  }

  // ─── Admin: Stats ─────────────────────────────────────────

  @Get('admin/subscriptions/stats')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Subscription revenue stats' })
  getStats() {
    return this.subsService.getStats();
  }

  // ─── Admin: Plan management ──────────────────────────────

  @Get('admin/subscriptions/plans')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] List all subscription plans (including inactive)' })
  listAllPlans() {
    return this.subsService.getPlans(true);
  }

  @Post('admin/subscriptions/plans')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Create a subscription plan' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subsService.createPlan(dto);
  }

  @Put('admin/subscriptions/plans/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Update a subscription plan' })
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.subsService.updatePlan(parseInt(id), dto);
  }

  @Delete('admin/subscriptions/plans/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Delete/deactivate a subscription plan' })
  deletePlan(@Param('id') id: string) {
    return this.subsService.deletePlan(parseInt(id));
  }

  // ─── Admin: Manual user subscription activation ──────────

  @Post('admin/users/:userId/subscription')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Manually activate subscription for a user' })
  adminActivate(
    @Param('userId') userId: string,
    @Body('planId') planId: number,
  ) {
    return this.subsService.adminActivateSubscription(userId, planId);
  }

  @Delete('admin/users/:userId/subscription')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Manually deactivate/cancel subscription for a user' })
  adminDeactivate(
    @Param('userId') userId: string,
  ) {
    return this.subsService.adminDeactivateSubscription(userId);
  }
}
