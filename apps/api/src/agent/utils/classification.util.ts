import { SYSTEM_PROMPT_TEMPLATE } from '../agent.constants';

export function buildClassificationPrompt(now: Date, timezone: string): string {
  return SYSTEM_PROMPT_TEMPLATE.replace('{{NOW_ISO}}', now.toISOString()).replace('{{TIMEZONE}}', timezone);
}
