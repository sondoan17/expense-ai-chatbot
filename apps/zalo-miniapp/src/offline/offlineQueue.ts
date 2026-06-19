import localforage from 'localforage';

const QUEUE_KEY = 'agent-message-queue';

export interface AgentQueueItem {
  id: string;
  message: string;
  createdAt: string;
  attempts?: number;
}

const store = localforage.createInstance({ name: 'mimi-zalo', storeName: 'offline-queue' });

export async function enqueueAgentMessage(item: AgentQueueItem): Promise<void> {
  const queue = await peekAgentMessages();
  await store.setItem(QUEUE_KEY, [...queue, item]);
}

export async function peekAgentMessages(): Promise<AgentQueueItem[]> {
  const queue = await store.getItem<AgentQueueItem[]>(QUEUE_KEY);
  return queue ?? [];
}

export async function removeAgentMessage(id: string): Promise<void> {
  const queue = await peekAgentMessages();
  await store.setItem(
    QUEUE_KEY,
    queue.filter((item) => item.id !== id),
  );
}
