import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import * as admin from 'firebase-admin';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  private firebaseInitialized = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccountStr = this.configService.get<string>('app.firebase.serviceAccount');
      if (serviceAccountStr && serviceAccountStr.trim() !== '') {
        const serviceAccount = typeof serviceAccountStr === 'string'
          ? JSON.parse(serviceAccountStr)
          : serviceAccountStr;

        if (serviceAccount && serviceAccount.project_id && !admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          this.firebaseInitialized = true;
          this.logger.log('Firebase Admin initialized successfully');
        }
      }
    } catch (err) {
      this.logger.warn(`Firebase Admin init skipped/failed (local mock mode): ${err.message}`);
    }
  }

  // ─── Config Endpoints ─────────────────────────────────────

  @Get('config')
  async getAllConfig() {
    const rows = await this.dataSource.query('SELECT key, value FROM app_config');
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  }

  @Post('config')
  async setConfig(@Body() body: { key: string; value: string }) {
    await this.dataSource.query(
      `INSERT INTO app_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE
       SET value = $2, updated_at = NOW()`,
      [body.key, body.value],
    );
    return { success: true };
  }

  // ─── Notification Endpoints ───────────────────────────────

  @Post('notifications/send')
  async sendNotification(
    @Body() body: {
      title: string;
      body: string;
      type: string;
      topic?: string;
      userIds?: string[];
    },
  ) {
    this.logger.log(`Received notification request: ${JSON.stringify(body)}`);

    if (this.firebaseInitialized && admin.apps.length > 0) {
      try {
        const messagePayload = {
          notification: {
            title: body.title,
            body: body.body,
          },
          data: {
            type: body.type,
          },
        };

        if (body.topic) {
          await admin.messaging().send({
            ...messagePayload,
            topic: body.topic,
          });
          this.logger.log(`Notification sent to topic: ${body.topic}`);
        } else if (body.userIds && body.userIds.length > 0) {
          const users = await this.dataSource.query(
            'SELECT fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL',
            [body.userIds],
          );
          const tokens = users.map((u) => u.fcm_token).filter(Boolean);
          if (tokens.length > 0) {
            await admin.messaging().sendEachForMulticast({
              ...messagePayload,
              tokens,
            });
            this.logger.log(`Notification sent to ${tokens.length} users`);
          } else {
            this.logger.log('No valid FCM tokens found for specified user IDs');
          }
        } else {
          await admin.messaging().send({
            ...messagePayload,
            topic: 'general',
          });
          this.logger.log('Notification sent to default topic: general');
        }
      } catch (err) {
        this.logger.error(`Failed to send FCM push notification: ${err.message}`);
      }
    } else {
      this.logger.log('Firebase is not initialized. Notification printed to server console only.');
    }

    return { success: true };
  }
}
