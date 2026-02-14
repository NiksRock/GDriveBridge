import { Controller, Get, Req } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Request } from 'express';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request & { user: { id: string } }) {
    const userId = req.user.id;

    const accounts = await this.prisma.googleAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
