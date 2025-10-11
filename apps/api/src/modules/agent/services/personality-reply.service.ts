import { Injectable, Logger } from '@nestjs/common';
import { HyperbolicService } from '../../../integrations/hyperbolic/hyperbolic.service';
import { PersonalityProfile } from '../types/personality.types';
import { AgentLanguage } from '../agent.constants';

@Injectable()
export class PersonalityReplyService {
  private readonly logger = new Logger(PersonalityReplyService.name);

  constructor(private readonly hyperbolicService: HyperbolicService) {}

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

      return rewritten.trim();
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

    return `You are rewriting a chatbot reply to match a specific personality style.

**PERSONALITY PROFILE:**
- Name: ${personality.name}
- Tone: ${personality.tone}
- Interaction Style: ${personality.interactionPolicy}
- Response Length: ${personality.lengthPrefs}

**RULES:**
1. Preserve ALL factual information (numbers, dates, categories, warnings)
2. Keep the same intent and meaning
3. Adjust ONLY the tone, style, and emotional expression
4. ${languageInstruction}
5. Be natural and conversational
${context ? `\n**CONTEXT:** ${context}` : ''}

**ORIGINAL REPLY:**
${originalReply}

**REWRITTEN REPLY (applying ${personality.name} personality):**`;
  }
}
