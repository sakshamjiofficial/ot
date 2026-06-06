import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { ScheduleModule }  from '@nestjs/schedule';
import { SubscriptionsService }    from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionScheduler }   from './subscription.scheduler';
import { SubscriptionEntity, SubscriptionPlanEntity } from './entities/subscription.entity';
import { PaymentEntity }   from '../payments/entities/payment.entity';
import { CouponEntity }    from '../coupons/entities/coupon.entity';
import { UserEntity }      from '../users/entities/user.entity';
import { RazorpayService }   from '../payments/razorpay.service';
import { GooglePlayService } from '../payments/google-play.service';
import { CouponsService }    from '../coupons/coupons.service';
import { InvoiceService }    from '../invoices/invoice.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      SubscriptionEntity, SubscriptionPlanEntity,
      PaymentEntity, CouponEntity, UserEntity,
    ]),
  ],
  providers: [
    SubscriptionsService, RazorpayService, GooglePlayService,
    CouponsService, InvoiceService, SubscriptionScheduler,
  ],
  controllers: [SubscriptionsController],
  exports:     [SubscriptionsService],
})
export class SubscriptionsModule {}
