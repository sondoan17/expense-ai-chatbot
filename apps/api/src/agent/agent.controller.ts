import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentChatDto } from './dto/agent-chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PublicUser } from '../users/types/public-user.type';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  chat(@CurrentUser() user: PublicUser, @Body() dto: AgentChatDto) {
    return this.agentService.chat(user, dto.message);
  }
}
