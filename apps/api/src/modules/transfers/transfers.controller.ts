import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { TransfersService } from './transfers.service';
import {
  CreateTransferSchema,
  type CreateTransferDto,
} from './dto/create-transfer.dto';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * Create a new transfer job
   *
   * POST /api/transfers
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateTransferDto) {
    /**
     * Validate request using Zod
     * (Throws 400 automatically if invalid)
     */
    const dto = CreateTransferSchema.parse(body);

    return this.transfersService.createTransfer(dto);
  }
}
