import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { HyperbolicService } from '../integrations/hyperbolic.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { ReportsModule } from '../reports/reports.module';
import { UsersModule } from '../users/users.module';
import { RecurringModule } from '../recurring/recurring.module';
import { RecurringBudgetsModule } from '../recurring-budgets/recurring-budgets.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  BudgetHandlerService,
  TransactionHandlerService,
  RecurringHandlerService,
  QueryHandlerService,
  CategoryResolverService,
} from './handlers';

@Module({
  imports: [ConfigModule, PrismaModule, TransactionsModule, BudgetsModule, ReportsModule, UsersModule, RecurringModule, RecurringBudgetsModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    HyperbolicService,
    BudgetHandlerService,
    TransactionHandlerService,
    RecurringHandlerService,
    QueryHandlerService,
    CategoryResolverService,
  ],
})
export class AgentModule {}
