import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { BudgetsModule } from "./budgets/budgets.module";
import { ReportsModule } from "./reports/reports.module";
import { AgentModule } from "./agent/agent.module";
import { RecurringTransactionsModule } from "./recurring-transactions/recurring-transactions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TransactionsModule,
    BudgetsModule,
    ReportsModule,
    AgentModule,
    RecurringTransactionsModule,
  ],
})
export class AppModule {}
