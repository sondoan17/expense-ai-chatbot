import { IsString } from "class-validator";

export class BudgetIdParamDto {
  @IsString()
  id!: string;
}
