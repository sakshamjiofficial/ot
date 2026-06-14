import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // ─── Security Middleware ──────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", 'data:', 'https:'],
          mediaSrc:   ["'self'", 'https:'],
          // Allow connections from Codespace domains and localhost
          connectSrc: ["'self'", 'https:', 'wss:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // In development: allow all origins (includes Codespaces *.app.github.dev)
      if (nodeEnv === 'development') {
        callback(null, true);
        return;
      }
      const allowedOrigins = [
        `https://${configService.get('DOMAIN')}`,
        `https://www.${configService.get('DOMAIN')}`,
        `https://admin.${configService.get('DOMAIN')}`,
      ];
      if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith('.app.github.dev')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-App-Version'],
    credentials: true,
  });

  // ─── HTTP Logging ─────────────────────────────────────────
  app.use(
    morgan(':method :url :status :response-time ms - :res[content-length]', {
      skip: (req) => req.url === '/health',
    }),
  );

  // ─── Global Prefix ────────────────────────────────────────
  app.setGlobalPrefix('api/v1', { exclude: ['/health', '/metrics'] });

  // ─── Global Pipes ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // ─── Global Filters ───────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global Interceptors ──────────────────────────────────
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );

  // ─── Swagger (development only) ───────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('OTT Platform API')
      .setDescription('Production OTT streaming platform REST API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('content', 'Movies and series')
      .addTag('streaming', 'Video streaming')
      .addTag('subscriptions', 'Subscription and payments')
      .addTag('search', 'Search engine')
      .addTag('admin', 'Admin operations')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }

  // ─── Graceful Shutdown ────────────────────────────────────
  app.enableShutdownHooks();

  // Bind to 0.0.0.0 so the port is reachable on all interfaces
  // (required for GitHub Codespaces port forwarding to work correctly)
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port} [${nodeEnv}]`);
}

bootstrap();
