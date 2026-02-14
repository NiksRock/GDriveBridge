import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { PreScanSchema, type PreScanDto } from './dto/pre-scan.dto';
import { PreScanService } from './pre-scan.service';
import { TransfersService } from './transfers.service';
import { CreateTransferSchema, type CreateTransferDto } from './dto/create-transfer.dto';

@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly transfersService: TransfersService,
    private readonly preScanService: PreScanService,
  ) {}

  @Post('pre-scan')
  async preScan(
    @Req() req: Request & { user: { id: string } },
    @Body() body: PreScanDto,
  ) {
    const dto = PreScanSchema.parse(body);
    return this.preScanService.runPreScan(req.user.id, dto);
  }
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request & { user: { id: string } },
    @Body() body: CreateTransferDto,
  ) {
    const dto = CreateTransferSchema.parse(body);
    return this.transfersService.createTransfer(req.user.id, dto);
  }

  /**
   * GET /api/transfers
   * List all transfers (latest first)
   */
  @Get()
  async list(@Req() req: Request & { user: { id: string } }) {
    return this.transfersService.listTransfers(req.user.id);
  }

  /**
   * GET /api/transfers/:id
   * Fetch transfer status + progress
   */
  @Get(':id')
  async getOne(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.transfersService.getTransferById(req.user.id, id);
  }
}
