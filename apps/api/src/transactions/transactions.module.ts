import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";

@Module({
  imports: [ConfigModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
