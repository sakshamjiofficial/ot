import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(private readonly subsService: SubscriptionsService) {}

  // Run every hour — expire any subscriptions past their expiry date
  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleSubscriptions() {
    const count = await this.subsService.expireStaleSubscriptions();
    if (count > 0) {
      this.logger.log(`Scheduler expired ${count} subscriptions`);
    }
  }

  // Daily at 08:00 IST — log revenue stats
  @Cron('0 8 * * *', { timeZone: 'Asia/Kolkata' })
  async dailyRevenueReport() {
    const stats = await this.subsService.getStats();
    this.logger.log(
      `Daily stats — Active: ${stats.activeSubscriptions} | ` +
      `Trials: ${stats.trialSubscriptions} | ` +
      `Revenue: ₹${stats.totalRevenueInr.toFixed(2)}`,
    );
  }
}
