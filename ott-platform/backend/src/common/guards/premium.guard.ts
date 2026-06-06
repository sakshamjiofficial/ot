import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { Reflector }          from '@nestjs/core';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  SubscriptionEntity,
  SubscriptionStatus,
} from '../../subscriptions/entities/subscription.entity';

export const REQUIRE_PREMIUM_KEY = 'requirePremium';

/**
 * Usage on any route:
 *   @SetMetadata(REQUIRE_PREMIUM_KEY, true)
 *   @UseGuards(JwtAuthGuard, PremiumGuard)
 *
 * Or define a decorator:
 *   export const Premium = () => SetMetadata(REQUIRE_PREMIUM_KEY, true);
 */
@Injectable()
export class PremiumGuard implements CanActivate {
  private readonly logger = new Logger(PremiumGuard.name);

  constructor(
    private reflector: Reflector,

    @InjectRepository(SubscriptionEntity)
    private subRepo: Repository<SubscriptionEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresPremium = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_PREMIUM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresPremium) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    // Admins always have access
    if (user.role === 'admin' || user.role === 'superadmin') return true;

    // Check active subscription in DB (not just JWT claim — always authoritative)
    const sub = await this.subRepo.findOne({
      where: {
        userId:    user.id,
        status:    SubscriptionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!sub) {
      throw new ForbiddenException(
        JSON.stringify({
          code:    'SUBSCRIPTION_REQUIRED',
          message: 'An active subscription is required to access this content.',
        }),
      );
    }

    // Attach subscription to request for downstream use
    context.switchToHttp().getRequest().subscription = sub;
    return true;
  }
}
