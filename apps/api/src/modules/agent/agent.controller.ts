import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentChatDto } from './dto/agent-chat.dto';
import { AgentActionDto } from './dto/agent-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicUser } from '../users/types/public-user.type';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('history')
  history(
    @CurrentUser() user: PublicUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    const safeLimit = Number.isFinite(parsed) ? parsed : undefined;
    return this.agentService.getHistory(user, safeLimit, cursor);
  }

  @Post('chat')
  chat(@CurrentUser() user: PublicUser, @Body() dto: AgentChatDto) {
    return this.agentService.chat(user, dto.message);
  }

  @Post('action')
  action(@CurrentUser() user: PublicUser, @Body() dto: AgentActionDto) {
    return this.agentService.handleAction(user, dto);
  }
}
