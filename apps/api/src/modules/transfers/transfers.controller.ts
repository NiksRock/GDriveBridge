import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
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
  async preScan(@Body() body: PreScanDto) {
    const dto = PreScanSchema.parse(body);
    return this.preScanService.runPreScan(dto);
  }
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateTransferDto) {
    const dto = CreateTransferSchema.parse(body);
    return this.transfersService.createTransfer(dto);
  }

  /**
   * GET /api/transfers
   * List all transfers (latest first)
   */
  @Get()
  async list() {
    return this.transfersService.listTransfers();
  }

  /**
   * GET /api/transfers/:id
   * Fetch transfer status + progress
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.transfersService.getTransferById(id);
  }
}
