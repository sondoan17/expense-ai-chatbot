import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RecurringTransactionsController } from "./recurring-transactions.controller";
import { RecurringTransactionsService } from "./recurring-transactions.service";
import { TransactionsModule } from "../transactions/transactions.module";

@Module({
  imports: [ConfigModule, TransactionsModule],
  controllers: [RecurringTransactionsController],
  providers: [RecurringTransactionsService],
  exports: [RecurringTransactionsService],
})
export class RecurringTransactionsModule {}
