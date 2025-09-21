import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BudgetsService } from "./budgets.service";
import { BudgetsController } from "./budgets.controller";

@Module({
  imports: [ConfigModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
