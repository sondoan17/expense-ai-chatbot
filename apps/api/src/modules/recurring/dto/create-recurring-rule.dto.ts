import { Currency, RecurringFreq, TxnType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsISO8601,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRecurringRuleDto {
  @IsEnum(RecurringFreq)
  freq!: RecurringFreq;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  timeOfDay?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsISO8601()
  startDate!: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

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
  @MaxLength(191)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
