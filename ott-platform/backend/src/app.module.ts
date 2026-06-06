import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContentModule } from './content/content.module';
import { StreamingModule } from './streaming/streaming.module';
import { UploadModule } from './upload/upload.module';
import { TranscodingModule } from './transcoding/transcoding.module';
import { SearchModule } from './search/search.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

import { DeviceFingerprintMiddleware } from './common/middleware/device-fingerprint.middleware';
import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    // ─── Config (global, loads .env) ──────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env'],
      cache: true,
    }),

    // ─── TypeORM (PostgreSQL) ──────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
        synchronize: false,                         // never true in production
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
        extra: {
          max: 20,                                  // connection pool size
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
      inject: [ConfigService],
    }),

    // ─── BullMQ / Redis queues ─────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'redis'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
      inject: [ConfigService],
    }),

    // ─── Throttler (rate limiting) ────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000,  limit: 5  },    // 5 req/sec burst
      { name: 'medium', ttl: 60000, limit: 100 },   // 100 req/min
    ]),

    // ─── Terminus (health checks) ─────────────────────────
    TerminusModule,

    // ─── Feature Modules ──────────────────────────────────
    AuthModule,
    UsersModule,
    ContentModule,
    StreamingModule,
    UploadModule,
    TranscodingModule,
    SearchModule,
    SubscriptionsModule,
    AnalyticsModule,
    RecommendationsModule,
    AdminModule,
    NotificationsModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    // Global throttler guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DeviceFingerprintMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
