import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DeviceEntity }        from '../../users/entities/device.entity';
import {
  SubscriptionEntity,
  SubscriptionStatus,
} from '../../subscriptions/entities/subscription.entity';

@Injectable()
export class DeviceLimitGuard implements CanActivate {
  private readonly logger        = new Logger(DeviceLimitGuard.name);
  private readonly DEFAULT_LIMIT = 3;

  constructor(
    @InjectRepository(DeviceEntity)
    private deviceRepo: Repository<DeviceEntity>,

    @InjectRepository(SubscriptionEntity)
    private subRepo: Repository<SubscriptionEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user    = request.user;
    if (!user) return true;  // Auth guard handles missing user

    // Get plan's device limit
    const sub = await this.subRepo.findOne({
      where: {
        userId:    user.id,
        status:    SubscriptionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['plan'],
    });

    const limit = sub?.plan?.maxDevices ?? this.DEFAULT_LIMIT;

    // Count active devices for this user
    const activeDevices = await this.deviceRepo.count({
      where: { userId: user.id, isActive: true },
    });

    // Current device fingerprint from request
    const currentFingerprint = request.deviceInfo?.fingerprint;

    if (currentFingerprint) {
      // Check if this device is already registered — if yes, allow it regardless of limit
      const existingDevice = await this.deviceRepo.findOne({
        where: { userId: user.id, deviceFingerprint: currentFingerprint, isActive: true },
      });
      if (existingDevice) return true;
    }

    if (activeDevices >= limit) {
      this.logger.warn(
        `Device limit reached for user ${user.id}: ${activeDevices}/${limit}`,
      );
      throw new ForbiddenException(
        JSON.stringify({
          code:         'DEVICE_LIMIT_REACHED',
          message:      `Maximum ${limit} devices allowed on your plan. Please remove a device to continue.`,
          currentCount: activeDevices,
          maxAllowed:   limit,
        }),
      );
    }

    return true;
  }
}
