import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecurringBudgetsService } from './recurring-budgets.service';
import { CreateRecurringBudgetRuleDto } from './dto/create-recurring-budget-rule.dto';
import { RecurringBudgetRuleIdParamDto } from './dto/recurring-budget-rule-id-param.dto';

@Controller('recurring-budgets')
@UseGuards(JwtAuthGuard)
export class RecurringBudgetsController {
  constructor(private readonly recurringBudgetsService: RecurringBudgetsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createRecurringBudgetRuleDto: CreateRecurringBudgetRuleDto,
  ) {
    const input = {
      ...createRecurringBudgetRuleDto,
      startDate: new Date(createRecurringBudgetRuleDto.startDate),
      endDate: createRecurringBudgetRuleDto.endDate
        ? new Date(createRecurringBudgetRuleDto.endDate)
        : undefined,
    };

    return this.recurringBudgetsService.createRule(userId, input);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.recurringBudgetsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param() params: RecurringBudgetRuleIdParamDto) {
    return this.recurringBudgetsService.findOne(userId, params.id);
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param() params: RecurringBudgetRuleIdParamDto) {
    return this.recurringBudgetsService.remove(userId, params.id);
  }
}
