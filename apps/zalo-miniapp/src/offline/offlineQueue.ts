import { getNativeJson, setNativeJson } from '../storage/nativeStorage';

const QUEUE_KEY = 'agent-message-queue';

export interface AgentQueueItem {
  id: string;
  message: string;
  createdAt: string;
  attempts?: number;
}

export async function enqueueAgentMessage(item: AgentQueueItem): Promise<void> {
  const queue = await peekAgentMessages();
  setNativeJson(QUEUE_KEY, [...queue, item]);
}

export async function peekAgentMessages(): Promise<AgentQueueItem[]> {
  return getNativeJson<AgentQueueItem[]>(QUEUE_KEY, []);
}

export async function removeAgentMessage(id: string): Promise<void> {
  const queue = await peekAgentMessages();
  setNativeJson(
    QUEUE_KEY,
    queue.filter((item) => item.id !== id),
  );
}
