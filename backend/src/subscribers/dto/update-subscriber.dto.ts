import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateSubscriberDto } from './create-subscriber.dto'

export class UpdateSubscriberDto extends PartialType(
  OmitType(CreateSubscriberDto, ['parkingLotId', 'paymentMethod', 'paidAmount'] as const),
) {}
