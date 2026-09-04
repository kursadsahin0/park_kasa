import { Transform, Type } from 'class-transformer'
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

const emptyToUndef = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value

export class UpsertParkingLotDto {
  @IsString()
  @MaxLength(120)
  name!: string

  @IsString()
  @MaxLength(250)
  address!: string

  @IsString()
  @MaxLength(80)
  city!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  district?: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  totalSpots!: number

  @IsOptional()
  @IsString()
  @MaxLength(8)
  spotPrefix?: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRate!: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  nightStartHour?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  nightEndHour?: number

  @IsOptional()
  @Transform(emptyToUndef)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  nightHourlyRate?: number

  @IsOptional()
  @Transform(emptyToUndef)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDailyCap?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  freeMinutes?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lostTicketFee?: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  notifyEmail?: string
}
