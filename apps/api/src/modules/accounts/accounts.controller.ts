import { Controller, Get, Query } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all connected Google accounts for a user
   *
   * GET /api/accounts?userId=demo-user
   */
  @Get()
  async list(@Query('userId') userId: string) {
    const accounts = await this.prisma.googleAccount.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return accounts;
  }
}
