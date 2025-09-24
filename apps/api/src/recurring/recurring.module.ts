import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RecurringService } from './recurring.service';
import { RecurringWorker } from './recurring.worker';

@Module({
  imports: [ConfigModule],
  providers: [RecurringService, RecurringWorker],
  exports: [RecurringService],
})
export class RecurringModule {}
