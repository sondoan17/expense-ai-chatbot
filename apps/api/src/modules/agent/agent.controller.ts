import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentChatDto } from './dto/agent-chat.dto';
import { AgentActionDto } from './dto/agent-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicUser } from '../users/types/public-user.type';
import { InsightsService } from './services/insights.service';
import { Currency } from '@prisma/client';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly insightsService: InsightsService,
  ) {}

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

  @Get('insights')
  async getInsights(
    @CurrentUser() user: PublicUser,
    @Query('period') period?: string,
    @Query('category') category?: string,
    @Query('currency') currency?: string,
  ) {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    // Determine time range based on period
    switch (period) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = lastMonth;
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case '3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default:
        // Default to current month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const currencyEnum = currency === 'USD' ? Currency.USD : Currency.VND;

    try {
      const insights = await this.insightsService.generateInsights(
        user.id,
        { start, end },
        currencyEnum,
      );

      const trends = await this.insightsService.analyzeSpendingTrends(
        user.id,
        { start, end },
        currencyEnum,
      );

      const recommendations = await this.insightsService.generateRecommendations(
        user.id,
        insights,
        currencyEnum,
      );

      return {
        insights,
        trends,
        recommendations,
        timeRange: { start, end },
        currency: currencyEnum,
      };
    } catch (error) {
      throw new Error('Failed to generate insights');
    }
  }
}
