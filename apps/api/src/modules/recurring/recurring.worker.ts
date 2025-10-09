import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { RecurringService } from './recurring.service';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

@Injectable()
export class RecurringWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecurringWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly recurringService: RecurringService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, FIVE_MINUTES_IN_MS);

    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    const started = Date.now();
    try {
      await this.recurringService.processDueRules();
      const elapsed = Date.now() - started;
      this.logger.debug(`Processed recurring rules in ${elapsed}ms`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Recurring worker failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
