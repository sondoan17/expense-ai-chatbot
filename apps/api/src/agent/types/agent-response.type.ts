import { AgentPayload, Intent } from '@expense-ai/shared';

export type AgentIntent = Intent | 'clarify' | 'error';

export interface AgentChatResult {
  reply: string;
  intent: AgentIntent;
  parsed?: AgentPayload;
  data?: unknown;
  meta?: Record<string, unknown>;
  error?: string;
}
