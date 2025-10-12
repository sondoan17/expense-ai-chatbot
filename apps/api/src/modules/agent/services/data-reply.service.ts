import { Injectable, Logger } from '@nestjs/common';
import { HyperbolicService } from '../../../integrations/hyperbolic/hyperbolic.service';
import { PersonalityProfile } from '../types/personality.types';
import { AgentLanguage } from '../agent.constants';
import { AgentPayload } from '@expense-ai/shared';

export interface DataContext {
  summary?: {
    totals?: {
      expense: number;
      income: number;
      net: number;
    };
    range?: {
      start: string;
      end: string;
    };
    byCategory?: Array<{
      categoryName: string;
      amount: number;
    }>;
  };
  transactions?: Array<{
    occurredAt: string;
    amount: number;
    category?: { name: string };
    type: string;
    note?: string;
  }>;
  budgetStatus?: {
    categoryName: string;
    spent: number;
    budget: number;
    remaining: number;
    percentage: number;
    isOverBudget: boolean;
  };
  insights?: Array<{
    message: string;
    type: string;
  }>;
}

@Injectable()
export class DataReplyService {
  private readonly logger = new Logger(DataReplyService.name);

  constructor(private readonly hyperbolicService: HyperbolicService) {}

  async generateReplyWithData(
    payload: AgentPayload,
    dataContext: DataContext,
    personality: PersonalityProfile,
    language: AgentLanguage,
  ): Promise<string> {
    const prompt = this.buildDataReplyPrompt(payload, dataContext, personality, language);

    try {
      const response = await this.hyperbolicService.complete([{ role: 'user', content: prompt }], {
        max_tokens: 400,
        temperature: 0.3, // Low temperature for accuracy
        response_format: { type: 'text' },
      });

      return response.trim();
    } catch (error) {
      this.logger.error('Failed to generate reply with data', error);
      throw error;
    }
  }

  private buildDataReplyPrompt(
    payload: AgentPayload,
    dataContext: DataContext,
    personality: PersonalityProfile,
    language: AgentLanguage,
  ): string {
    const languageInstruction =
      language === 'vi' ? 'Trả lời bằng tiếng Việt.' : 'Respond in English.';

    // Format data context based on intent
    const dataText = this.formatDataContext(dataContext);

    // Word limit based on personality
    const wordLimit = this.getWordLimitForPersonality(personality);
    const wordLimitInstruction =
      language === 'vi'
        ? `Giới hạn: Tối đa ${wordLimit} từ.`
        : `Word limit: Maximum ${wordLimit} words.`;

    return `You are a financial assistant with a specific personality. Generate a natural reply based on real financial data.

**PERSONALITY PROFILE:**
- Name: ${personality.name}
- Tone: ${personality.tone}
- Interaction Style: ${personality.interactionPolicy}
- Response Length: ${personality.lengthPrefs}

**CRITICAL RULES:**
1. **MUST PRESERVE ALL NUMERICAL DATA** - Never omit, change, or approximate amounts, dates, percentages
2. **MUST INCLUDE ALL KEY INFORMATION** - All numbers, categories, time periods from the data
3. **FOR QUERY_TOTAL INTENT**: MUST mention BOTH expense AND income AND net difference
4. **FOR QUERY_BY_CATEGORY INTENT**: MUST mention the specific category amount
5. **FOR LIST_RECENT INTENT**: MUST list all transactions with amounts and dates
6. **Apply personality tone** - Use the specified tone and style
7. **Be natural and conversational** - Don't sound robotic
8. ${languageInstruction}
9. ${wordLimitInstruction}
10. **NEVER fabricate data** - Only use information provided in the data context

**USER REQUEST:** ${payload.note || 'Financial query'}

**REAL DATA CONTEXT:**
${dataText}

**EXAMPLES OF GOOD REPLIES:**
- For query_total: "Tháng này bạn đã chi 2.500.000₫ và thu 5.000.000₫. Còn dư 2.500.000₫ nè! 🎉"
- For query_by_category: "Chi tiêu ăn uống tháng này là 800.000₫"
- For list_recent: "Giao dịch gần đây: 1. 15/12 - Chi tiêu: 50.000 VND (Ăn uống)"

**GENERATE REPLY (with ${personality.name} personality):**`;
  }

  private formatDataContext(dataContext: DataContext): string {
    let dataText = '';

    // Summary data (for query_total, query_by_category)
    if (dataContext.summary) {
      const { totals, range, byCategory } = dataContext.summary;

      if (totals) {
        dataText += `TỔNG QUAN CHI TIÊU:\n`;
        dataText += `- Tổng chi tiêu: ${totals.expense.toLocaleString('vi-VN')} VND\n`;
        dataText += `- Tổng thu nhập: ${totals.income.toLocaleString('vi-VN')} VND\n`;
        dataText += `- Chênh lệch (thu - chi): ${totals.net.toLocaleString('vi-VN')} VND\n`;
        dataText += `\n⚠️ QUAN TRỌNG: Phải mention CẢ 3 số liệu trên trong reply!\n`;
      }

      if (range) {
        dataText += `\nTHỜI GIAN: ${range.start} đến ${range.end}\n`;
      }

      if (byCategory && byCategory.length > 0) {
        dataText += `\nCHI TIẾT THEO DANH MỤC:\n`;
        byCategory.forEach((item) => {
          dataText += `- ${item.categoryName}: ${item.amount.toLocaleString('vi-VN')} VND\n`;
        });
      }
    }

    // Transaction data (for list_recent)
    if (dataContext.transactions && dataContext.transactions.length > 0) {
      dataText += `\nCÁC GIAO DỊCH GẦN ĐÂY:\n\n`;
      dataContext.transactions.forEach((tx, index) => {
        const date = new Date(tx.occurredAt).toLocaleDateString('vi-VN');
        const amount = tx.amount.toLocaleString('vi-VN');
        const category = tx.category?.name || 'Khác';
        const type = tx.type === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập';

        dataText += `${index + 1}. ${date} - ${type}: ${amount} VND (${category})\n`;
        if (tx.note) {
          dataText += `   Ghi chú: ${tx.note}\n`;
        }
        dataText += '\n';
      });
    }

    // Budget status data (for get_budget_status)
    if (dataContext.budgetStatus) {
      const { categoryName, spent, budget, remaining, percentage, isOverBudget } =
        dataContext.budgetStatus;
      dataText += `\nTRẠNG THÁI NGÂN SÁCH:\n`;
      dataText += `- Danh mục: ${categoryName}\n`;
      dataText += `- Đã chi: ${spent.toLocaleString('vi-VN')} VND\n`;
      dataText += `- Ngân sách: ${budget.toLocaleString('vi-VN')} VND\n`;
      dataText += `- Còn lại: ${remaining.toLocaleString('vi-VN')} VND\n`;
      dataText += `- Tỷ lệ: ${percentage.toFixed(1)}%\n`;
      dataText += `- Trạng thái: ${isOverBudget ? 'Vượt ngân sách' : 'Trong ngân sách'}\n`;
    }

    // Insights data
    if (dataContext.insights && dataContext.insights.length > 0) {
      dataText += `\nPHÂN TÍCH:\n`;
      dataContext.insights.forEach((insight) => {
        dataText += `- ${insight.message}\n`;
      });
    }

    return dataText || 'Không có dữ liệu để hiển thị.';
  }

  private getWordLimitForPersonality(personality: PersonalityProfile): number {
    // Word limits based on personality type
    switch (personality.name) {
      case 'PROFESSIONAL':
        return 30; // Concise and professional
      case 'CASUAL':
        return 40; // More relaxed
      case 'FRIENDLY':
        return 35; // Friendly but not too long
      case 'HUMOROUS':
        return 45; // Can be longer for jokes
      case 'INSULTING':
        return 35; // Sarcastic but not too long
      case 'ENTHUSIASTIC':
        return 40; // Enthusiastic but controlled
      default:
        return 35; // Default
    }
  }
}
