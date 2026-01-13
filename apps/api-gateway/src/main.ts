import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS - with support for school wildcard domains
  const corsOrigins = configService.get('CORS_ORIGINS', '*');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Always allow Peeap domains
      const peeapDomains = [
        'peeap.com',
        'my.peeap.com',
        'plus.peeap.com',
        'checkout.peeap.com',
        'school.peeap.com',
        'api.peeap.com',
        'developer.peeap.com',
      ];

      // Check Peeap domains
      if (peeapDomains.some(domain => origin.includes(domain))) {
        callback(null, true);
        return;
      }

      // School domain wildcard: *.gov.school.edu.sl
      const schoolDomainPattern = /^https?:\/\/[a-zA-Z0-9-]+\.gov\.school\.edu\.sl(:\d+)?$/;
      if (schoolDomainPattern.test(origin)) {
        callback(null, true);
        return;
      }

      // Localhost for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
        return;
      }

      // Vercel preview deployments
      if (origin.includes('vercel.app')) {
        callback(null, true);
        return;
      }

      // Check against configured origins
      if (corsOrigins === '*') {
        callback(null, true);
        return;
      }

      const allowedOrigins = corsOrigins.split(',').map((o: string) => o.trim());
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Deny the request
      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Client-Secret',
      'X-Device-Fingerprint',
      'X-School-ID',
      'X-Peeap-API-Key',
      'X-Peeap-School-ID',
      'Idempotency-Key',
    ],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Payment System API')
    .setDescription('Closed-loop card payment system API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`API Gateway is running on port ${port}`);
}

bootstrap();
