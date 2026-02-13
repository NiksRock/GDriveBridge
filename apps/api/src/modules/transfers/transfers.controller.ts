import { Body, Controller, Post } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import {
  CreateTransferSchema,
  type CreateTransferDto,
} from './dto/create-transfer.dto';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(@Body() body: CreateTransferDto) {
    // Validate request using Zod
    const dto = CreateTransferSchema.parse(body);

    return this.transfersService.createTransfer(dto);
  }
}
