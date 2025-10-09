import { Currency, TxnType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsISO8601,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @IsEnum(TxnType)
  type!: TxnType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.VND;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  categoryId?: string;

  @IsOptional()
  meta?: Record<string, unknown>;
}
