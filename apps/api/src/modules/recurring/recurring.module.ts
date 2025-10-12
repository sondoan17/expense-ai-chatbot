import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RecurringService } from './recurring.service';
import { RecurringWorker } from './recurring.worker';
import { RecurringController } from './recurring.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringWorker],
  exports: [RecurringService],
})
export class RecurringModule {}
