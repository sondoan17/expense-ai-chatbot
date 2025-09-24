import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { Currency, RecurringFrequency, TxnType } from "@prisma/client";

export class CreateRecurringTransactionDto {
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
  @IsString()
  @MaxLength(191)
  categoryId?: string;

  @IsEnum(RecurringFrequency)
  frequency!: RecurringFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  @ValidateIf((dto) => dto.frequency === RecurringFrequency.MONTHLY)
  dayOfMonth?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  @ValidateIf((dto) => dto.frequency === RecurringFrequency.WEEKLY)
  weekday?: number;

  @IsISO8601()
  @IsNotEmpty()
  startDate!: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
