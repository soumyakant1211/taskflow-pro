import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1', { exclude: ['/'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('TaskFlow Pro API')
    .setDescription('Enterprise project & task management REST API. Log in via POST /auth/login, then click Authorize and paste the accessToken.')
    .setVersion(process.env.APP_VERSION ?? '1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 4000);
  // Keep idle connections open longer than clients / load balancers do (Render, AWS ALB use 60s).
  // Node's default 5s causes random "socket hang up" errors on reused keep-alive connections.
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 API on http://localhost:${port}/api/v1  ·  Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
