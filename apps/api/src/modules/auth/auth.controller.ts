import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CryptoService } from '../../security/crypto.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { Public } from '../../auth/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly googleOAuth: GoogleOAuthService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Step 1: Start Google OAuth Flow
   *
   * GET /api/auth/google?userId=demo-user
   */
  @Public()
  @Get('google')
  async connect(@Query('userId') userId: string, @Res() res: Response) {
    if (!userId) {
      throw new BadRequestException('Missing userId');
    }

    const url = this.googleOAuth.getConsentUrl(userId);
    return res.redirect(url);
  }

  /**
   * Step 2: Google OAuth Callback
   *
   * Google redirects back with:
   * - code (auth code)
   * - state (userId)
   */
  @Public()
  @Get('google/callback')
  async callback(@Query('code') code: string, @Query('state') userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing userId in OAuth state');
    }

    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    // 1. Exchange code → tokens
    const tokens = await this.googleOAuth.getTokens(code);

    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Missing refresh token. Reconnect account with prompt=consent.',
      );
    }

    // 2. Fetch Google profile using tokens
    const profile = await this.googleOAuth.getDriveUser(tokens);

    if (!profile.email) {
      throw new BadRequestException('Google account email not found');
    }

    /**
     * TEMP MVP:
     * Ensure user exists.
     * Later: userId must come from session/JWT, not query/state.
     */
    const user = await this.prisma.user.upsert({
      where: { email: profile.email },
      update: {},
      create: {
        email: profile.email,
      },
    });

    // 3. Save connected Google account in DB
    const account = await this.prisma.googleAccount.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: profile.email,
        },
      },
      update: {
        refreshTokenEncrypted: this.cryptoService.encrypt(tokens.refresh_token),
        avatarUrl: profile.picture,
      },
      create: {
        userId: user.id,
        email: profile.email,
        avatarUrl: profile.picture,
        refreshTokenEncrypted: this.cryptoService.encrypt(tokens.refresh_token),
      },
    });

    const token = this.authService.signToken({
      id: user.id,
      email: user.email,
    });

    return {
      message: '✅ Google Account Connected Successfully',
      accountId: account.id,
      accessToken: token,
    };
  }
}
