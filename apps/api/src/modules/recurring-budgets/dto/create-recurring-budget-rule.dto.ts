import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, Min, Max } from 'class-validator';
import { Currency, RecurringFreq } from '@prisma/client';

export class CreateRecurringBudgetRuleDto {
  @IsEnum(RecurringFreq)
  freq!: RecurringFreq;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @IsString()
  timeOfDay?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
