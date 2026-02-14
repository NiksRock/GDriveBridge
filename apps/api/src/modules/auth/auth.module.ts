import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { GoogleOAuthService } from './google-oauth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [GoogleOAuthService],
  exports: [GoogleOAuthService],
})
export class AuthModule {}
