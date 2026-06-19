import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderService } from '../../../integrations/ai-provider/ai-provider.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicUser } from '../../users/types/public-user.type';
import { AgentLanguage } from '../agent.constants';
import { InsightResult } from '../types/internal.types';
import {
  QUERY_RESPONSE_PROMPT,
  BUDGET_STATUS_PROMPT,
  RECENT_TRANSACTIONS_PROMPT,
} from '../prompts/response-generation.prompts';

@Injectable()
export class AIResponseService {
  private readonly logger = new Logger(AIResponseService.name);

  constructor(
    private readonly aiProviderService: AiProviderService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateQueryResponse(params: {
    intent: string;
    language: AgentLanguage;
    data: unknown;
    insights?: InsightResult[];
    chatHistory?: Array<{ role: string; content: string }>;
    user: PublicUser;
    userQuestion: string;
  }): Promise<string> {
    const { intent, language, data, insights = [], chatHistory = [], user, userQuestion } = params;

    try {
      // Lấy chat history nếu chưa có
      const recentMessages =
        chatHistory.length > 0 ? chatHistory : await this.getRecentChatHistory(user.id, 5);

      // Chọn prompt phù hợp
      let systemPrompt: string;
      let contextData: string;

      switch (intent) {
        case 'query_total':
        case 'query_by_category':
          systemPrompt = QUERY_RESPONSE_PROMPT;
          contextData = this.formatSummaryData(data);
          break;
        case 'get_budget_status':
          systemPrompt = BUDGET_STATUS_PROMPT;
          contextData = this.formatBudgetStatusData(data);
          break;
        case 'list_recent':
          systemPrompt = RECENT_TRANSACTIONS_PROMPT;
          contextData = this.formatTransactionsData(data);
          break;
        default:
          systemPrompt = QUERY_RESPONSE_PROMPT;
          contextData = JSON.stringify(data, null, 2);
      }

      // Build prompt với context
      const fullPrompt = this.buildPrompt({
        systemPrompt,
        intent,
        language,
        data: contextData,
        insights,
        chatHistory: recentMessages,
        userQuestion,
      });

      // Gọi LLM
      const response = await this.aiProviderService.complete(
        [{ role: 'user', content: fullPrompt }],
        {
          max_tokens: 1000,
          temperature: 0.7,
          response_format: { type: 'text' },
        },
      );

      // Append insights nếu có
      if (insights.length > 0) {
        const insightsText = this.formatInsightsForResponse(insights, language);
        return `${response}\n\n${insightsText}`;
      }

      return response;
    } catch (error) {
      this.logger.error('Error generating AI response', error);

      // Fallback to template response
      return this.getFallbackResponse(intent, language);
    }
  }

  private async getRecentChatHistory(
    userId: string,
    limit: number,
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          role: true,
          content: true,
        },
      });

      return messages.reverse().map((msg) => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      }));
    } catch (error) {
      this.logger.error('Error fetching chat history', error);
      return [];
    }
  }

  private buildPrompt(params: {
    systemPrompt: string;
    intent: string;
    language: AgentLanguage;
    data: string;
    insights: InsightResult[];
    chatHistory: Array<{ role: string; content: string }>;
    userQuestion: string;
  }): string {
    const { systemPrompt, intent, language, data, insights, chatHistory, userQuestion } = params;

    const chatHistoryText = chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    const insightsText = insights.map((insight) => `- ${insight.message}`).join('\n');

    return systemPrompt
      .replace('{intent}', intent)
      .replace('{language}', language)
      .replace('{data}', data)
      .replace('{chatHistory}', chatHistoryText || 'Chưa có lịch sử chat')
      .replace('{insights}', insightsText || 'Không có insights đặc biệt')
      .replace('{userQuestion}', userQuestion);
  }

  private formatSummaryData(data: unknown): string {
    try {
      const summary = data as {
        totals?: {
          expense: number;
          income: number;
          net: number;
        };
        range?: {
          start: string;
          end: string;
        };
      };
      if (summary?.totals) {
        return `Tổng chi tiêu: ${summary.totals.expense}
Tổng thu nhập: ${summary.totals.income}
Chênh lệch: ${summary.totals.net}
Khoảng thời gian: ${summary.range?.start} đến ${summary.range?.end}`;
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return JSON.stringify(data, null, 2);
    }
  }

  private formatBudgetStatusData(data: unknown): string {
    try {
      const status = data as {
        budget?: {
          limitAmount: number;
          currency: string;
          category?: {
            name: string;
          };
        };
        spent: number;
        percentage: number;
        remaining: number;
      };
      if (status?.budget) {
        return `Ngân sách: ${status.budget.limitAmount} ${status.budget.currency}
Đã chi: ${status.spent} ${status.budget.currency}
Phần trăm: ${status.percentage}%
Còn lại: ${status.remaining} ${status.budget.currency}
Danh mục: ${status.budget.category?.name || 'Tổng thể'}`;
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return JSON.stringify(data, null, 2);
    }
  }

  private formatTransactionsData(data: unknown): string {
    try {
      const result = data as {
        data?: Array<{
          occurredAt: string;
          amount: number;
          currency: string;
          category?: {
            name: string;
          };
        }>;
      };
      if (result?.data) {
        const transactions = result.data
          .map(
            (tx) =>
              `${tx.occurredAt}: ${tx.amount} ${tx.currency} - ${tx.category?.name || 'Khác'}`,
          )
          .join('\n');
        return `Các giao dịch gần đây:\n${transactions}`;
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return JSON.stringify(data, null, 2);
    }
  }

  private formatInsightsForResponse(insights: InsightResult[], language: AgentLanguage): string {
    if (insights.length === 0) return '';

    // Chỉ hiển thị insights quan trọng nhất
    const criticalInsights = insights.filter((i) => i.severity === 'critical');
    const warningInsights = insights.filter((i) => i.severity === 'warning');

    const topInsights = [...criticalInsights.slice(0, 2), ...warningInsights.slice(0, 2)].slice(
      0,
      3,
    ); // Tối đa 3 insights

    if (topInsights.length === 0) return '';

    const header = language === 'vi' ? '💡 Gợi ý từ Mimi:' : '💡 Insights from Mimi:';
    const insightTexts = topInsights.map((insight) => `• ${insight.message}`).join('\n');

    return `${header}\n${insightTexts}`;
  }

  private getFallbackResponse(intent: string, language: AgentLanguage): string {
    // Fallback responses khi AI generation fail
    switch (intent) {
      case 'query_total':
        return language === 'vi'
          ? 'Mình đã phân tích dữ liệu chi tiêu của bạn. Bạn có muốn xem chi tiết hơn không?'
          : "I've analyzed your spending data. Would you like to see more details?";

      case 'get_budget_status':
        return language === 'vi'
          ? 'Đây là tình trạng ngân sách hiện tại của bạn.'
          : "Here's your current budget status.";

      case 'list_recent':
        return language === 'vi'
          ? 'Đây là các giao dịch gần đây của bạn.'
          : 'Here are your recent transactions.';

      default:
        return language === 'vi'
          ? 'Mình đã xử lý yêu cầu của bạn.'
          : "I've processed your request.";
    }
  }
}
