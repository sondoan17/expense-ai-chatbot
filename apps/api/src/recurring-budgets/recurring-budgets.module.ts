import { Module } from '@nestjs/common';
import { RecurringBudgetsService } from './recurring-budgets.service';
import { RecurringBudgetsController } from './recurring-budgets.controller';
import { RecurringBudgetsWorker } from './recurring-budgets.worker';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringBudgetsController],
  providers: [RecurringBudgetsService, RecurringBudgetsWorker],
  exports: [RecurringBudgetsService],
})
export class RecurringBudgetsModule {}
