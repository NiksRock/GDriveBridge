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
import * as crypto from 'crypto';

import { Public } from '../../auth/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../security/crypto.service';
import { GoogleOAuthService } from './google-oauth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================
  // STEP 1 — Initiate Google OAuth
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
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const state = Buffer.from(JSON.stringify({ payload, signature })).toString(
      'base64url',
    );

    const url = this.googleOAuth.getConsentUrl(state);

    return res.redirect(url);
  }

  // ============================================================
  // STEP 2 — OAuth Callback (Option A Enforcement)
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
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(decoded.payload)
      .digest('hex');

    if (expectedSignature !== decoded.signature) {
      throw new UnauthorizedException('OAuth state verification failed');
    }

    const parsed = JSON.parse(decoded.payload);

    // 🔥 Enforce 10-minute expiry
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

    // ============================================================
    // OPTION A LOGIC
    // First connected account becomes Primary Source
    // ============================================================

    const existingAccounts = await this.prisma.googleAccount.findMany({
      where: { userId: user.id },
    });

    const isFirstAccount = existingAccounts.length === 0;

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
        isPrimarySource: isFirstAccount, // 🔥 First login = Source
        isDestination: false,
      },
    });

    return {
      message: 'Google account connected successfully',
      accountId: account.id,
      isPrimarySource: account.isPrimarySource,
      isDestination: account.isDestination,
    };
  }

  // ============================================================
  // OPTION A — SET DESTINATION ACCOUNT
  // Exactly one destination allowed
  // ============================================================

  @Post('set-destination')
  async setDestination(
    @Req() req: Request & { user: { id: string } },
    @Body() body: { accountId: string },
  ) {
    const userId = req.user.id;

    const account = await this.prisma.googleAccount.findFirst({
      where: {
        id: body.accountId,
        userId,
      },
    });

    if (!account) {
      throw new ForbiddenException('Invalid account');
    }

    if (account.isPrimarySource) {
      throw new ForbiddenException('Primary source account cannot be destination');
    }

    // Demote any existing destination
    await this.prisma.googleAccount.updateMany({
      where: {
        userId,
        isDestination: true,
      },
      data: {
        isDestination: false,
      },
    });

    // Promote selected account
    await this.prisma.googleAccount.update({
      where: { id: account.id },
      data: {
        isDestination: true,
      },
    });

    return {
      message: 'Destination account set successfully',
    };
  }

  // ============================================================
  // GET CONNECTED ACCOUNTS
  // ============================================================

  @Get('accounts')
  async listAccounts(@Req() req: Request & { user: { id: string } }) {
    return this.prisma.googleAccount.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        isPrimarySource: true,
        isDestination: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
