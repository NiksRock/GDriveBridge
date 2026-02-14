import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SecurityModule, // 🔐 Encryption Layer (DEFT §4.9)

    PrismaModule,
    AuthModule,
    AccountsModule,
    TransfersModule,
  ],
})
export class AppModule {}
