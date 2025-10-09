import { IsIn, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class AgentActionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'set_budget_update',
    'set_budget_increase',
    'recurring_budget_update',
    'recurring_budget_add',
  ])
  actionId!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
