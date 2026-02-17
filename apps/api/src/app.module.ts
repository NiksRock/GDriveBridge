import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { baseEnvSchema } from '@repo/config';

import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { HealthController } from './health.controller.js';
import { AppService } from './app.service.js';
console.log('NODE_ENV =', JSON.stringify(process.env.NODE_ENV));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validate: (config) => baseEnvSchema.parse(config),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true },
              }
            : undefined,
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
