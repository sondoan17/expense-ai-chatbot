import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { BudgetsService } from "./budgets.service";
import { UpsertBudgetDto } from "./dto/upsert-budget.dto";
import { BudgetIdParamDto } from "./dto/budget-id-param.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PublicUser } from "../users/types/public-user.type";

@Controller("budgets")
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  upsert(@CurrentUser() user: PublicUser, @Body() dto: UpsertBudgetDto) {
    return this.budgetsService.upsert(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.budgetsService.list(user.id);
  }

  @Get(":id/status")
  status(@CurrentUser() user: PublicUser, @Param() params: BudgetIdParamDto) {
    return this.budgetsService.status(user.id, params.id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: PublicUser, @Param() params: BudgetIdParamDto) {
    return this.budgetsService.remove(user.id, params.id);
  }
}
