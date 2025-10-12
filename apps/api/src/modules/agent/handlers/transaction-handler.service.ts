import { Injectable, Logger } from '@nestjs/common';
import { Currency, TxnType } from '@prisma/client';
import { AgentPayload } from '@expense-ai/shared';

import { TransactionsService } from '../../transactions/transactions.service';
import { PublicUser } from '../../users/types/public-user.type';
import { AgentChatResult } from '../types/agent-response.type';
import { AgentLanguage } from '../agent.constants';
import {
  buildMissingAmountReply,
  buildTransactionSavedReply,
  formatCurrency,
} from '../utils/agent-response.utils';
import { getReplyWithFallback, logReplySource } from '../utils/reply-fallback.util';
import { CategoryResolverService } from './category-resolver.service';

@Injectable()
export class TransactionHandlerService {
  private readonly logger = new Logger(TransactionHandlerService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly categoryResolver: CategoryResolverService,
  ) {}

  async handleAddTransaction(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    if (!payload.amount || payload.amount <= 0) {
      return {
        reply: buildMissingAmountReply(language),
        intent: 'clarify',
        parsed: payload,
      };
    }

    const type = payload.intent === 'add_income' ? TxnType.INCOME : TxnType.EXPENSE;
    const currency: Currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;

    const categoryName = payload.category
      ? this.categoryResolver.resolveCategory(payload.category)
      : null;
    const category = categoryName
      ? await this.categoryResolver.findCategoryByName(categoryName)
      : null;

    const dto = {
      type,
      amount: payload.amount,
      currency,
      note: payload.note ?? originalMessage,
      occurredAt: payload.occurred_at,
      categoryId: category?.id,
      meta: {
        source: 'agent',
        intent: payload.intent,
        confidence: payload.confidence,
        raw: payload,
      } as Record<string, unknown>,
    };

    const transaction = await this.transactionsService.create(user.id, dto);

    // 🆕 Transaction intents có thể dùng LLM reply (personality-focused, không có rủi ro data)
    const amountLabel = formatCurrency(transaction.amount, transaction.currency, language);
    const categoryLabel = transaction.category?.name ?? categoryName ?? null;
    const fallbackReply = buildTransactionSavedReply(language, {
      type,
      amount: amountLabel,
      category: categoryLabel,
    });

    const reply = getReplyWithFallback(payload, fallbackReply, language);
    logReplySource(payload, this.logger);

    return {
      reply,
      intent: payload.intent,
      parsed: payload,
      data: { transaction },
    };
  }
}
