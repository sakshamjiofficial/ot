import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity, UserRole } from './entities/user.entity';
import { DeviceEntity, DeviceType } from './entities/device.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, AdminCreateUserDto, AdminUpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
  ) {}

  // ─── Create ──────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = this.userRepo.create({
      email:       dto.email.toLowerCase().trim(),
      phone:       dto.phone,
      displayName: dto.displayName || dto.email.split('@')[0],
      passwordHash,
      role:        UserRole.USER,
    });

    return this.userRepo.save(user);
  }

  // ─── Find ─────────────────────────────────────────────────

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 20, search } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.where(
        'user.email ILIKE :search OR user.displayName ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await qb.getManyAndCount();

    const totalActive = await this.userRepo.count({ where: { isActive: true } });
    const totalAdmins = await this.userRepo.count({
      where: { role: In([UserRole.ADMIN, UserRole.SUPERADMIN]) },
    });

    return {
      items: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalActive,
        totalAdmins,
      },
    };
  }

  // ─── Update ───────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (dto.displayName) user.displayName = dto.displayName;
    if (dto.phone)       user.phone       = dto.phone;
    if (dto.avatarUrl)   user.avatarUrl   = dto.avatarUrl;
    if (dto.fcmToken)    user.fcmToken    = dto.fcmToken;

    return this.userRepo.save(user);
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(id);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.userRepo.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepo.update(id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.userRepo.update(id, { isActive: false });
  }

  // ─── Password Verification ────────────────────────────────

  async validatePassword(user: UserEntity, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  // ─── Device Management ────────────────────────────────────

  async upsertDevice(
    userId: string,
    deviceInfo: {
      fingerprint: string;
      deviceType:  string;
      deviceName:  string;
      ipAddress:   string;
      userAgent:   string;
      refreshTokenHash?: string;
    },
  ): Promise<DeviceEntity> {
    let device = await this.deviceRepo.findOne({
      where: { deviceFingerprint: deviceInfo.fingerprint },
    });

    if (device) {
      device.lastSeenAt      = new Date();
      device.ipAddress       = deviceInfo.ipAddress;
      device.isActive        = true;
      device.userId          = userId;
      if (deviceInfo.refreshTokenHash) {
        device.refreshTokenHash = deviceInfo.refreshTokenHash;
      }
    } else {
      device = this.deviceRepo.create({
        userId,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceType:        deviceInfo.deviceType as DeviceType,
        deviceName:        deviceInfo.deviceName,
        ipAddress:         deviceInfo.ipAddress,
        userAgent:         deviceInfo.userAgent,
        refreshTokenHash:  deviceInfo.refreshTokenHash,
      });
    }

    return this.deviceRepo.save(device);
  }

  async getUserDevices(userId: string): Promise<DeviceEntity[]> {
    return this.deviceRepo.find({
      where: { userId, isActive: true },
      order: { lastSeenAt: 'DESC' },
    });
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId, userId },
    });
    if (!device) throw new NotFoundException('Device not found');

    device.isActive        = false;
    device.refreshTokenHash = null;
    await this.deviceRepo.save(device);
  }

  async revokeAllDevices(userId: string): Promise<void> {
    await this.deviceRepo.update(
      { userId, isActive: true },
      { isActive: false, refreshTokenHash: null },
    );
  }

  async findDeviceByRefreshToken(
    userId: string,
    refreshTokenHash: string,
  ): Promise<DeviceEntity | null> {
    return this.deviceRepo.findOne({
      where: { userId, refreshTokenHash, isActive: true },
    });
  }

  // ─── Stats ────────────────────────────────────────────────

  async getStats(): Promise<Record<string, number>> {
    const total  = await this.userRepo.count();
    const active = await this.userRepo.count({ where: { isActive: true } });
    const today  = new Date();
    today.setHours(0, 0, 0, 0);

    const newToday = await this.userRepo
      .createQueryBuilder('u')
      .where('u.createdAt >= :today', { today })
      .getCount();

    return { total, active, newToday };
  }

  // ─── Admin Methods ────────────────────────────────────────

  async adminCreate(dto: AdminCreateUserDto): Promise<UserEntity> {
    const exists = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = this.userRepo.create({
      email:       dto.email.toLowerCase().trim(),
      phone:       dto.phone,
      displayName: dto.displayName || dto.email.split('@')[0],
      passwordHash,
      role:        dto.role,
      isActive:    true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    return this.userRepo.save(user);
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.phone !== undefined)       user.phone       = dto.phone;
    if (dto.role !== undefined)        user.role        = dto.role;
    if (dto.isActive !== undefined)    user.isActive    = dto.isActive;

    return this.userRepo.save(user);
  }

  async adminChangePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.userRepo.save(user);
  }
}
