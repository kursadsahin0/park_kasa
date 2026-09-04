import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator'
import { SubscriberStatus } from '@prisma/client'
import { COLLECTABLE_METHODS } from '../../billing/collectable-methods'

export class CreateSubscriberDto {
  @IsUUID()
  parkingLotId!: string

  @IsString()
  @MaxLength(120)
  fullName!: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsString()
  @MaxLength(20)
  plate!: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  spotCode?: string

  @IsDateString()
  startDate!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyFee!: number

  @IsOptional()
  @IsEnum(SubscriberStatus)
  status?: SubscriberStatus

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  @IsIn([...COLLECTABLE_METHODS])
  paymentMethod!: (typeof COLLECTABLE_METHODS)[number]

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  paidAmount?: number
}
