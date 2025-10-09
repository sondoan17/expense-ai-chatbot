import { Module } from '@nestjs/common';
import { HyperbolicService } from './hyperbolic.service';

@Module({
  providers: [HyperbolicService],
  exports: [HyperbolicService],
})
export class HyperbolicModule {}
