// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ReportsModule } from './reports/reports.module';
import { AgentModule } from './agent/agent.module';
import { RecurringModule } from './recurring/recurring.module';
import { RecurringBudgetsModule } from './recurring-budgets/recurring-budgets.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'), // apps/api/.env (ưu tiên khi dev)
        path.resolve(process.cwd(), '../../.env'), // root/.env (khi để .env ở root)
        path.resolve(__dirname, '../../../.env'), // dist runtime (sau khi build)
      ],
      expandVariables: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TransactionsModule,
    BudgetsModule,
    ReportsModule,
    AgentModule,
    RecurringModule,
    RecurringBudgetsModule,
    HealthModule,
  ],
})
export class AppModule {}
