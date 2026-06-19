import localforage from 'localforage';

const QUEUE_KEY = 'agent-message-queue';
const DEAD_LETTER_KEY = 'agent-message-dead-letter-queue';

interface AgentQueueItem {
  id: string;
  message: string;
  createdAt: string;
  attempts?: number;
}

interface DeadLetterAgentQueueItem extends AgentQueueItem {
  failedAt: string;
  error: string;
}

const store = localforage.createInstance({
  name: 'mimi',
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

export async function removeAgentMessage(id: string): Promise<void> {
  const queue = await getQueue();
  await store.setItem(
    QUEUE_KEY,
    queue.filter((item) => item.id !== id),
  );
}

export async function incrementAgentMessageAttempts(id: string): Promise<void> {
  const queue = await getQueue();
  await store.setItem(
    QUEUE_KEY,
    queue.map((item) =>
      item.id === id ? { ...item, attempts: (item.attempts ?? 0) + 1 } : item,
    ),
  );
}

export async function deadLetterAgentMessage(item: AgentQueueItem, error: string): Promise<void> {
  const [queue, deadLetters] = await Promise.all([getQueue(), getDeadLetterQueue()]);

  await Promise.all([
    store.setItem(
      QUEUE_KEY,
      queue.filter((queuedItem) => queuedItem.id !== item.id),
    ),
    store.setItem(DEAD_LETTER_KEY, [
      ...deadLetters,
      {
        ...item,
        failedAt: new Date().toISOString(),
        error,
      },
    ]),
  ]);
}

export async function peekAgentMessages(): Promise<AgentQueueItem[]> {
  return getQueue();
}

async function getQueue(): Promise<AgentQueueItem[]> {
  const queue = await store.getItem<AgentQueueItem[]>(QUEUE_KEY);
  return queue ?? [];
}

async function getDeadLetterQueue(): Promise<DeadLetterAgentQueueItem[]> {
  const queue = await store.getItem<DeadLetterAgentQueueItem[]>(DEAD_LETTER_KEY);
  return queue ?? [];
}

export type { AgentQueueItem };
