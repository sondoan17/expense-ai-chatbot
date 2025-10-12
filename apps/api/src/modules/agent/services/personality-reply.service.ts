import { Injectable, Logger } from '@nestjs/common';
import { HyperbolicService } from '../../../integrations/hyperbolic/hyperbolic.service';
import { PersonalityProfile } from '../types/personality.types';
import { AgentLanguage } from '../agent.constants';

/**
 * @deprecated No longer used for query intents (now using data injection approach)
 * and transaction intents (now using one-shot reply generation)
 * Keep for potential future use with other intents
 */
@Injectable()
export class PersonalityReplyService {
  private readonly logger = new Logger(PersonalityReplyService.name);

  constructor(private readonly hyperbolicService: HyperbolicService) {}

  /**
   * @deprecated No longer used - replaced by DataReplyService for query intents
   * and 1-shot generation for transaction intents
   */
  async rewriteWithPersonality(
    originalReply: string,
    personality: PersonalityProfile,
    language: AgentLanguage,
    context?: string,
  ): Promise<string> {
    const prompt = this.buildRewritePrompt(originalReply, personality, language, context);

    try {
      const rewritten = await this.hyperbolicService.complete(
        [
          { role: 'system', content: prompt },
          { role: 'user', content: originalReply },
        ],
        {
          max_tokens: 200,
          temperature: 0.7,
          response_format: { type: 'text' },
        },
      );

      const trimmedReply = rewritten.trim();
      return trimmedReply;
    } catch (error) {
      this.logger.error('Failed to rewrite reply with personality', error);
      // Fallback to original reply if rewrite fails
      return originalReply;
    }
  }

  private buildRewritePrompt(
    originalReply: string,
    personality: PersonalityProfile,
    language: AgentLanguage,
    context?: string,
  ): string {
    const languageInstruction =
      language === 'vi' ? 'Respond in Vietnamese.' : 'Respond in English.';

    // Giới hạn số từ dựa trên personality
    const wordLimit = this.getWordLimitForPersonality(personality);
    const wordLimitInstruction =
      language === 'vi'
        ? `Giới hạn: Tối đa ${wordLimit} từ.`
        : `Word limit: Maximum ${wordLimit} words.`;

    return `You are rewriting a chatbot reply to match a specific personality style.

**PERSONALITY PROFILE:**
- Name: ${personality.name}
- Tone: ${personality.tone}
- Interaction Style: ${personality.interactionPolicy}
- Response Length: ${personality.lengthPrefs}

**RULES:**
1. **CRITICAL**: Preserve ALL factual information (numbers, dates, categories, warnings, amounts, percentages, time ranges)
2. **MUST INCLUDE**: All numerical data, currency amounts, time periods, category names, budget status
3. Keep the same intent and meaning
4. Adjust ONLY the tone, style, and emotional expression
5. ${languageInstruction}
6. Be natural and conversational
7. ${wordLimitInstruction}
8. **NEVER omit**: Specific numbers, amounts, dates, or factual details from the original reply
${context ? `\n**CONTEXT:** ${context}` : ''}

**ORIGINAL REPLY:**
${originalReply}

**REWRITTEN REPLY (applying ${personality.name} personality):**`;
  }

  private getWordLimitForPersonality(personality: PersonalityProfile): number {
    // Giới hạn số từ dựa trên personality type
    switch (personality.name) {
      case 'PROFESSIONAL':
        return 30; // Ngắn gọn, súc tích
      case 'CASUAL':
        return 40; // Thoải mái hơn
      case 'FRIENDLY':
        return 35; // Thân thiện nhưng không dài dòng
      case 'HUMOROUS':
        return 45; // Có thể dài hơn để chứa joke
      case 'INSULTING':
        return 35; // Sarcastic nhưng không quá dài
      case 'ENTHUSIASTIC':
        return 40; // Nhiệt tình nhưng có giới hạn
      default:
        return 35; // Default
    }
  }
}
