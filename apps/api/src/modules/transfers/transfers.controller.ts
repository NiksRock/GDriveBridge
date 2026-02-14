import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { TransfersService } from './transfers.service';
import { CreateTransferSchema, type CreateTransferDto } from './dto/create-transfer.dto';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * POST /api/transfers
   * Create a new transfer job
   */
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
