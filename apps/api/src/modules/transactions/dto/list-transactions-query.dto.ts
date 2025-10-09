import { Currency, TxnType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TimeRangeQueryDto } from '../../../common/dto/time-range-query.dto';

export class ListTransactionsQueryDto extends TimeRangeQueryDto {
  @IsOptional()
  @IsEnum(TxnType)
  type?: TxnType;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
