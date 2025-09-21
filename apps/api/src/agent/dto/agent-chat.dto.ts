import { IsString, MinLength } from 'class-validator';

export class AgentChatDto {
  @IsString()
  @MinLength(1)
  message!: string;
}
