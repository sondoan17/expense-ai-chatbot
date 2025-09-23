import localforage from 'localforage';

const QUEUE_KEY = 'agent-message-queue';

interface AgentQueueItem {
  id: string;
  message: string;
  createdAt: string;
}

const store = localforage.createInstance({
  name: 'expense-ai',
  storeName: 'offline-queue',
});

export async function enqueueAgentMessage(item: AgentQueueItem) {
  const queue = await getQueue();
  queue.push(item);
  await store.setItem(QUEUE_KEY, queue);
}

export async function dequeueAgentMessages(): Promise<AgentQueueItem[]> {
  const queue = await getQueue();
  await store.setItem(QUEUE_KEY, []);
  return queue;
}

export async function peekAgentMessages(): Promise<AgentQueueItem[]> {
  return getQueue();
}

async function getQueue(): Promise<AgentQueueItem[]> {
  const queue = await store.getItem<AgentQueueItem[]>(QUEUE_KEY);
  return queue ?? [];
}

export type { AgentQueueItem };
