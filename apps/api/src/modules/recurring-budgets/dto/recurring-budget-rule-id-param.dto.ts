import { IsString } from 'class-validator';

export class RecurringBudgetRuleIdParamDto {
  @IsString()
  id!: string;
}
