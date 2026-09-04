import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { COLLECTABLE_METHODS } from '../../billing/collectable-methods'

export class CreatePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycleNumber?: number

  @IsOptional()
  @IsIn([...COLLECTABLE_METHODS])
  method?: (typeof COLLECTABLE_METHODS)[number]

  @IsOptional()
  @IsString()
  notes?: string
}
