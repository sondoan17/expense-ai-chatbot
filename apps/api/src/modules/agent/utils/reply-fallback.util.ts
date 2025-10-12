import { AgentPayload } from '@expense-ai/shared';
import { AgentLanguage } from '../agent.constants';

// Extended type to include reply field
type AgentPayloadWithReply = AgentPayload & { reply?: string };

/**
 * Determines if an intent should use LLM reply or AI service reply
 * @param intent - The intent to check
 * @returns true if should use LLM reply, false if should use AI service reply
 *
 * @deprecated This function is no longer used in the new architecture.
 * All intents now use LLM replies:
 * - Query intents: Classification-only + Data injection approach
 * - Transaction intents: 1-shot approach with personality
 */
export function shouldUseLLMReply(): boolean {
  // All intents now use LLM replies in the new architecture
  return true;
}

/**
 * Utility function to get reply with fallback logic
 * @param payload - Agent payload from LLM
 * @param fallbackReply - Template reply to use if LLM didn't generate one
 * @param _language - Language for logging (unused but kept for API consistency)
 * @returns Reply string (either from LLM or fallback)
 */
export function getReplyWithFallback(
  payload: AgentPayload,
  fallbackReply: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _language: AgentLanguage,
): string {
  const payloadWithReply = payload as AgentPayloadWithReply;
  if (payloadWithReply.reply && payloadWithReply.reply.trim().length > 0) {
    // LLM đã generate reply sẵn
    return payloadWithReply.reply.trim();
  } else {
    // Fallback về template cứng
    return fallbackReply;
  }
}

/**
 * Logs which reply source was used (for debugging)
 * @param payload - Agent payload from LLM
 * @param logger - Logger instance
 */
export function logReplySource(
  payload: AgentPayload,
  logger: { debug: (message: string) => void },
): void {
  const payloadWithReply = payload as AgentPayloadWithReply;
  if (payloadWithReply.reply && payloadWithReply.reply.trim().length > 0) {
    logger.debug('Using LLM-generated reply');
  } else {
    logger.debug('Fallback to template reply');
  }
}
