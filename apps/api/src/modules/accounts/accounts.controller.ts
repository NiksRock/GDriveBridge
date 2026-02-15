import {
  Controller,
  Get,
  Delete,
  Param,
  ForbiddenException,
  NotFoundException,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string;
  };
};

@Controller('accounts')
export class AccountsController {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // LIST CONNECTED ACCOUNTS
  // - Clearly exposes roles (Source / Destination)
  // - No ambiguity
  // ============================================================

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;

    const accounts = await this.prisma.googleAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        isPrimarySource: true,
        isDestination: true,
        createdAt: true,
      },
    });

    return {
      source: accounts.find((a) => a.isPrimarySource) ?? null,
      destination: accounts.find((a) => a.isDestination) ?? null,
      connectedAccounts: accounts,
    };
  }

  // ============================================================
  // DISCONNECT ACCOUNT
  // - Cannot delete Primary Source
  // - Cannot delete active Destination if transfers exist
  // ============================================================

  @Delete(':id')
  async disconnect(@Req() req: AuthenticatedRequest, @Param('id') accountId: string) {
    const userId = req.user.id;

    const account = await this.prisma.googleAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isPrimarySource) {
      throw new ForbiddenException('Primary source account cannot be disconnected');
    }

    const activeTransfers = await this.prisma.transferJob.count({
      where: {
        userId,
        status: {
          in: ['PENDING', 'RUNNING', 'PAUSED', 'AUTO_PAUSED_QUOTA'],
        },
        OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }],
      },
    });

    if (activeTransfers > 0) {
      throw new ForbiddenException('Cannot disconnect account with active transfers');
    }

    await this.prisma.googleAccount.delete({
      where: { id: accountId },
    });

    return { message: 'Account disconnected successfully' };
  }
}
