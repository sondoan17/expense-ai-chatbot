import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';

@Module({
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiProviderModule {}
