import 'dotenv/config';
import { JwtAuthGuard } from './auth/jwt.guard';
import { JwtService } from '@nestjs/jwt';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const jwtService = app.get(JwtService);
  app.useGlobalGuards(new JwtAuthGuard(jwtService));
  /**
   * Enable CORS for frontend access
   */
  app.enableCors({
    origin: ['http://localhost:5173'], // Vite dev server
    credentials: true,
  });

  /**
   * Global validation for DTOs
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * Prefix all routes
   */
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  console.log(`🚀 API running at http://localhost:${port}/api`);
}

bootstrap();
