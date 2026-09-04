import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional } from 'class-validator'
import { COLLECTABLE_METHODS } from '../../billing/collectable-methods'

export class CheckoutDto {
  @IsOptional()
  @IsIn([...COLLECTABLE_METHODS])
  method?: (typeof COLLECTABLE_METHODS)[number]

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : value === true || value === 'true',
  )
  @IsBoolean()
  lostTicket?: boolean
}
