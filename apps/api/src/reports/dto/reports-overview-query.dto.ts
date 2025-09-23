import { Currency } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { TimeRangeQueryDto } from "../../common/dto/time-range-query.dto";

export class ReportsOverviewQueryDto extends TimeRangeQueryDto {
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  recent = 5;
}
