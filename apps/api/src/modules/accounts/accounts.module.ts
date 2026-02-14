import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AccountsController } from './accounts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
})
export class AccountsModule {}
