import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import type { Response, Request } from 'express';

import { Public } from '../../auth/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../security/crypto.service';
import { GoogleOAuthService } from './google-oauth.service';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {}

  // ============================================================
  // LOGIN — Start Google OAuth
  // ============================================================

  @Public()
  @Get('google')
  async connect(@Res() res: Response) {
    const url = this.googleOAuth.getConsentUrl('login');
    return res.redirect(url);
  }

  // ============================================================
  // OAuth Callback — Issue JWT + Set Primary Source
  // ============================================================

  @Public()
  @Get('google/callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    const tokens = await this.googleOAuth.getTokens(code);
    const profile = await this.googleOAuth.getDriveUser(tokens);

    if (!profile.email) {
      throw new UnauthorizedException('Google email missing');
    }

    // ------------------------------------------------------------
    // Find or create user
    // ------------------------------------------------------------

    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email: profile.email },
      });
    }

    // ------------------------------------------------------------
    // Always set login account as Primary Source
    // ------------------------------------------------------------

    await this.prisma.googleAccount.updateMany({
      where: { userId: user.id, isPrimarySource: true },
      data: { isPrimarySource: false },
    });

    await this.prisma.googleAccount.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: profile.email,
        },
      },
      update: {
        refreshTokenEncrypted: this.cryptoService.encrypt(tokens.refresh_token!),
        avatarUrl: profile.picture ?? null,
        isPrimarySource: true,
      },
      create: {
        userId: user.id,
        email: profile.email,
        avatarUrl: profile.picture ?? null,
        refreshTokenEncrypted: this.cryptoService.encrypt(tokens.refresh_token!),
        isPrimarySource: true,
        isDestination: false,
      },
    });

    // ------------------------------------------------------------
    // Issue JWT
    // ------------------------------------------------------------

    const jwt = this.authService.signToken({
      id: user.id,
      email: user.email,
    });

    // ------------------------------------------------------------
    // Set HttpOnly cookie
    // ------------------------------------------------------------

    res.cookie('access_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:5173');
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token');
    return res.json({ message: 'Logged out successfully' });
  }

  // ============================================================
  // SESSION CHECK
  // ============================================================

  @Get('session')
  async session(@Req() req: Request & { user: { id: string; email: string } }) {
    return {
      user: req.user,
    };
  }

  // ============================================================
  // SET DESTINATION ACCOUNT
  // ============================================================

  @Post('set-destination')
  async setDestination(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { accountId: string },
  ) {
    const userId = req.user.id;

    const account = await this.prisma.googleAccount.findFirst({
      where: { id: body.accountId, userId },
    });

    if (!account) {
      throw new ForbiddenException('Invalid account');
    }

    if (account.isPrimarySource) {
      throw new ForbiddenException('Primary source account cannot be destination');
    }

    await this.prisma.googleAccount.updateMany({
      where: { userId, isDestination: true },
      data: { isDestination: false },
    });

    await this.prisma.googleAccount.update({
      where: { id: account.id },
      data: { isDestination: true },
    });

    return { message: 'Destination account set successfully' };
  }
}
