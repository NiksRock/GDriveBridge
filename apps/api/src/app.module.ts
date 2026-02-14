import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    /**
     * Load environment variables globally
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    /**
     * Database layer
     */
    PrismaModule,

    /**
     * Transfers API module
     */
    TransfersModule,

    /**
     * Future modules:
     * - AuthModule (Google OAuth)
     * - AccountsModule
     * - HistoryModule
     */
  ],
})
export class AppModule {}
