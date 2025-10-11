import { IsEnum } from 'class-validator';
import { AiPersonality } from '@prisma/client';

export class UpdatePersonalityDto {
  @IsEnum(AiPersonality)
  personality!: AiPersonality;
}
