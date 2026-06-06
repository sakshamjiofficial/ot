import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

export interface AuthResult {
  user:   Omit<UserEntity, 'passwordHash'>;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService:   JwtService,
    private configService: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────

  async register(dto: RegisterDto, deviceInfo: any): Promise<AuthResult> {
    const user = await this.usersService.create({
      email:       dto.email,
      password:    dto.password,
      displayName: dto.displayName,
      phone:       dto.phone,
    });

    const tokens = await this.generateTokens(user, deviceInfo);

    // Persist refresh token hash to device record
    await this.usersService.upsertDevice(user.id, {
      ...deviceInfo,
      refreshTokenHash: await this.hashToken(tokens.refreshToken),
    });

    this.logger.log(`New user registered: ${user.email}`);
    return { user: this.sanitizeUser(user), tokens };
  }

  // ─── Login ────────────────────────────────────────────────

  async login(dto: LoginDto, deviceInfo: any): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      // Timing-safe: hash even for not-found users
      await bcrypt.hash('dummy', 12);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.usersService.validatePassword(user, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user, deviceInfo);

    // Store refresh token hash on device
    await this.usersService.upsertDevice(user.id, {
      ...deviceInfo,
      refreshTokenHash: await this.hashToken(tokens.refreshToken),
    });

    await this.usersService.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${user.email} | device: ${deviceInfo.fingerprint}`);
    return { user: this.sanitizeUser(user), tokens };
  }

  // ─── Refresh Token Rotation ───────────────────────────────

  async refresh(dto: RefreshTokenDto, deviceInfo: any): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify this token exists in DB (prevents replay after rotation)
    const tokenHash = await this.hashToken(dto.refreshToken);
    const device    = await this.usersService.findDeviceByRefreshToken(
      user.id,
      tokenHash,
    );

    if (!device) {
      // Possible token reuse attack — revoke all sessions
      this.logger.warn(
        `Refresh token reuse detected for user ${user.id}. Revoking all sessions.`,
      );
      await this.usersService.revokeAllDevices(user.id);
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    // Rotate: generate new pair, invalidate old token
    const tokens    = await this.generateTokens(user, deviceInfo);
    const newHash   = await this.hashToken(tokens.refreshToken);

    await this.usersService.upsertDevice(user.id, {
      ...deviceInfo,
      fingerprint:      device.deviceFingerprint,
      refreshTokenHash: newHash,
    });

    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────

  async logout(userId: string, deviceFingerprint: string): Promise<void> {
    const devices = await this.usersService.getUserDevices(userId);
    const device  = devices.find(
      (d) => d.deviceFingerprint === deviceFingerprint,
    );

    if (device) {
      await this.usersService.revokeDevice(userId, device.id);
    }
  }

  // ─── Token Generation ─────────────────────────────────────

  private async generateTokens(
    user: UserEntity,
    deviceInfo: any,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub:               user.id,
      email:             user.email,
      role:              user.role,
      deviceFingerprint: deviceInfo?.fingerprint || 'unknown',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    this.configService.get<string>('app.jwt.secret'),
        expiresIn: this.configService.get<string>('app.jwt.accessExpires', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret:    this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('app.jwt.refreshExpires', '30d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,   // 15 minutes in seconds
    };
  }

  private async hashToken(token: string): Promise<string> {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: UserEntity): Omit<UserEntity, 'passwordHash'> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  // ─── Validate user (for local strategy, if needed) ────────

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isValid = await this.usersService.validatePassword(user, password);
    return isValid ? user : null;
  }
}
