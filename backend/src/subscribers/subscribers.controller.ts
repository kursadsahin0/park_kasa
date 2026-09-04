import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { SubscriberStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth-user'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { CreateSubscriberDto } from './dto/create-subscriber.dto'
import { UpdateSubscriberDto } from './dto/update-subscriber.dto'
import { SubscribersService } from './subscribers.service'

class QuerySubscribersDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsEnum(SubscriberStatus)
  status?: SubscriberStatus

  @IsOptional()
  @IsUUID()
  parkingLotId?: string
}

@ApiTags('subscribers')
@ApiBearerAuth()
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribers: SubscribersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: QuerySubscribersDto) {
    return this.subscribers.list(user.id, query)
  }

  @Get('payments/:paymentId/receipt')
  paymentReceipt(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string) {
    return this.subscribers.paymentReceipt(user.id, paymentId)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subscribers.get(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubscriberDto) {
    return this.subscribers.create(user.id, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriberDto,
  ) {
    return this.subscribers.update(user.id, id, dto)
  }

  @Post(':id/terminate')
  terminate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.subscribers.terminate(user.id, id)
  }

  @Post(':id/payments')
  addPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.subscribers.addPayment(user.id, id, dto)
  }
}
