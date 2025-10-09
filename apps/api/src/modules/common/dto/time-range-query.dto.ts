import { IsOptional, IsString } from 'class-validator';
import { TimePeriod } from '@expense-ai/shared';

export class TimeRangeQueryDto {
  @IsOptional()
  period?: TimePeriod;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
