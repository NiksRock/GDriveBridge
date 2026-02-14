import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { PreScanService } from './pre-scan.service';
import { TransferExpansionService } from './transfer-expansion.service';

import { TransferGateway } from './transfer.gateway';
import { TransferProgressListener } from './transfer.progress.listener';

@Module({
  imports: [PrismaModule],
  controllers: [TransfersController],
  providers: [
    TransfersService,
    TransferExpansionService,
    PreScanService,
    TransferGateway,
    TransferProgressListener,
  ],
  exports: [TransferGateway],
})
export class TransfersModule {}
