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

@Module({
  imports: [ConfigModule, TransactionsModule, BudgetsModule, ReportsModule, UsersModule, RecurringModule],
  controllers: [AgentController],
  providers: [AgentService, HyperbolicService],
})
export class AgentModule {}
