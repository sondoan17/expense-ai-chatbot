import { IsISO8601, IsOptional, IsEnum } from "class-validator";
import { TimePeriodEnum, TimePeriod } from "@expense-ai/shared";

export class TimeRangeQueryDto {
  @IsOptional()
  @IsEnum(TimePeriodEnum)
  period?: TimePeriod;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
