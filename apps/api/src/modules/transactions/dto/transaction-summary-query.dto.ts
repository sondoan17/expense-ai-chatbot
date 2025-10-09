import { TimeRangeQueryDto } from '../../../common/dto/time-range-query.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Currency, TxnType } from '@prisma/client';

export class TransactionSummaryQueryDto extends TimeRangeQueryDto {
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(TxnType)
  type?: TxnType;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
