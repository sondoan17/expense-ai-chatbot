// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AgentModule } from './modules/agent/agent.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { RecurringBudgetsModule } from './modules/recurring-budgets/recurring-budgets.module';
import { HealthModule } from './modules/health/health.module';
import { ZaloModule } from './integrations/zalo/zalo.module';

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
    ZaloModule,
  ],
})
export class AppModule {}
