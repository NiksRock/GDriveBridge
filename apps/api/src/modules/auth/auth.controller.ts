import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { CryptoService } from '../../security/crypto.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/public.decorator';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly googleOAuth: GoogleOAuthService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================
  // Step 1: Generate Signed OAuth State
  // ============================================================

  @Get('google')
  async connect(@Req() req: Request & { user?: { id: string } }, @Res() res: Response) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const payloadObject = {
      userId: req.user.id,
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(payloadObject);

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET not configured');

    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const state = Buffer.from(JSON.stringify({ payload, signature })).toString(
      'base64url',
    );

    const url = this.googleOAuth.getConsentUrl(state);

    return res.redirect(url);
  }

  // ============================================================
  // Step 2: Validate Signed State + Expiry
  // ============================================================

  @Public()
  @Get('google/callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    if (!code || !state) {
      throw new BadRequestException('Missing OAuth parameters');
    }

    let decoded: { payload: string; signature: string };

    try {
      decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET not configured');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(decoded.payload)
      .digest('hex');

    if (expectedSignature !== decoded.signature) {
      throw new UnauthorizedException('OAuth state verification failed');
    }

    const parsed = JSON.parse(decoded.payload);

    // 🔥 EXPIRY CHECK (10 MINUTES)
    if (Date.now() - parsed.timestamp > 10 * 60 * 1000) {
      throw new UnauthorizedException('OAuth state expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsed.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const tokens = await this.googleOAuth.getTokens(code);

    if (!tokens.refresh_token) {
      throw new BadRequestException('Missing refresh token');
    }

    const profile = await this.googleOAuth.getDriveUser(tokens);

    const account = await this.prisma.googleAccount.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: profile.email!,
        },
      },
      update: {
        refreshTokenEncrypted: this.cryptoService.encrypt(tokens.refresh_token),
        avatarUrl: profile.picture,
      },
      create: {
        userId: user.id,
        email: profile.email!,
        avatarUrl: profile.picture,
        refreshTokenEncrypted: this.cryptoService.encrypt(tokens.refresh_token),
      },
    });

    return {
      message: 'Google Account Connected Successfully',
      accountId: account.id,
    };
  }
}
