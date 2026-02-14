import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { PreScanSchema, type PreScanDto } from './dto/pre-scan.dto';
import { CreateTransferSchema, type CreateTransferDto } from './dto/create-transfer.dto';

import { PreScanService } from './pre-scan.service';
import { TransfersService } from './transfers.service';
import { ReportService } from './report.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string;
  };
};

@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly transfersService: TransfersService,
    private readonly preScanService: PreScanService,
    private readonly reportService: ReportService,
  ) {}

  @Post(':id/pause')
  pause(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transfersService.pauseTransfer(req.user.id, id);
  }
  @Post(':id/retry-failed')
  async retryFailed(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transfersService.retryFailedItems(req.user.id, id);
  }
  @Post(':id/resume')
  resume(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transfersService.resumeTransfer(req.user.id, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transfersService.cancelTransfer(req.user.id, id);
  }

  @Get(':id/report')
  async downloadReport(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reportService.generateReport(req.user.id, id, res);
  }

  @Post('pre-scan')
  async preScan(@Req() req: AuthenticatedRequest, @Body() body: PreScanDto) {
    const dto = PreScanSchema.parse(body);
    return this.preScanService.runPreScan(req.user.id, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateTransferDto) {
    const dto = CreateTransferSchema.parse(body);
    return this.transfersService.createTransfer(req.user.id, dto);
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.transfersService.listTransfers(req.user.id);
  }

  @Get(':id')
  async getOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transfersService.getTransferById(req.user.id, id);
  }
}
