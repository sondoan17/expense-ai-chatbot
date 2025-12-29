# GEMINI.md - Web Frontend (React + Vite PWA)

This document provides context for AI assistants working on the React frontend.

## Overview

The web app is a React + Vite Progressive Web App (PWA) with a chat-first experience for expense tracking. It supports offline mode, TanStack Query for data fetching, and Zustand for client state.

## Directory Structure

```
apps/web/src/
├── main.tsx                # App entry point
├── App.tsx                 # Root component with routing
├── index.css               # Global styles
├── vite-env.d.ts           # Vite type definitions
├── api/                    # API client
│   └── client.ts           # Axios instance with interceptors
├── components/             # Shared UI components
│   ├── Layout.tsx          # App shell with navigation
│   ├── ProtectedRoute.tsx  # Auth guard component
│   └── ui/                 # Reusable UI primitives
├── contexts/               # React contexts
│   └── AuthContext.tsx     # Authentication state
├── features/               # Feature-based modules
│   ├── auth/               # Login/register screens
│   ├── chat/               # Chat interface
│   ├── dashboard/          # Analytics dashboard
│   ├── landing/            # Landing page
│   ├── manual-entry/       # Manual transaction entry
│   └── settings/           # User settings
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Authentication hook
│   ├── useOnlineStatus.ts  # Network status
│   └── useOfflineAgentSync.ts # Offline queue sync
├── offline/                # Offline support
│   └── queue.ts            # localforage queue management
├── providers/              # Provider components
│   └── QueryProvider.tsx   # TanStack Query setup
├── store/                  # Zustand stores
│   └── chatStore.ts        # Chat state management
├── theme/                  # Theme configuration
└── utils/                  # Utility functions
    ├── format.ts           # Number/date formatting
    └── storage.ts          # localStorage helpers
```

## Feature Structure

Each feature follows this pattern:

```
features/{feature}/
├── index.ts                # Public exports
├── {Feature}Page.tsx       # Main page component
├── components/             # Feature-specific components
│   ├── {Component}.tsx
│   └── {Component}.tsx
├── hooks/                  # (optional) Feature-specific hooks
└── types.ts                # (optional) Type definitions
```

## Key Features

### Chat (`features/chat/`)

- **Purpose**: AI-powered chat interface for expense tracking
- **Components**: `ChatPage.tsx`, `ChatBubble.tsx`, `ChatInput.tsx`, `SuggestionChips.tsx`
- **State**: Zustand store for messages, TanStack Query for history
- **Offline**: Messages queued in IndexedDB, synced when online

### Dashboard (`features/dashboard/`)

- **Purpose**: Analytics and expense overview
- **Components**: `DashboardPage.tsx`, `CategoryDonut.tsx`, `CashflowChart.tsx`, `BudgetProgress.tsx`
- **Data**: TanStack Query fetches from `/reports/overview`

### Auth (`features/auth/`)

- **Purpose**: Login and registration
- **Components**: `LoginPage.tsx`, `RegisterPage.tsx`
- **Flow**: JWT stored in localStorage, AuthContext provides user state

### Manual Entry (`features/manual-entry/`)

- **Purpose**: Form-based transaction entry (fallback to chat)
- **Components**: `ManualEntryPage.tsx`, `TransactionForm.tsx`

## Code Conventions

### Import Organization

Organize imports in the following order, separated by blank lines:

```tsx
// 1. External libraries (React, third-party)
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Providers and contexts
import { QueryProvider } from './providers/QueryProvider';

// 3. Theme
import { muiTheme } from './theme/muiTheme';

// 4. Components
import { AppLayout } from './components/AppLayout';

// 5. Pages (for routing files)
import { ChatPage } from './features/chat/ChatPage';
```

### Component File Structure

```tsx
// 1. Imports (organized as above)

// 2. Types/Interfaces
interface ComponentProps {
  amount: number;
  category: string;
}

// 3. Constants (config values, non-style)
const ANIMATION_DURATION = 0.35;

// 4. Component
export function ComponentName({ amount, category }: ComponentProps) {
  // 4.1 Hooks first
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading } = useQuery({ ... });

  // 4.2 Event handlers
  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  // 4.3 Early returns
  if (isLoading) return <Skeleton />;

  // 4.4 Main render
  return (
    <div className="p-4 rounded-lg bg-white shadow-sm" onClick={handleClick}>
      <span className="font-medium text-gray-900">{formatCurrency(amount)}</span>
      <span className="text-sm text-gray-500">{category}</span>
    </div>
  );
}
```

### Shared Components (`components/`)

Reusable UI components go in `components/` directory:

- `LoadingSpinner.tsx` - Full-page loading spinner with gradient background
- `PageLoader.tsx` - Suspense fallback for lazy-loaded pages
- `AppLayout.tsx` - App shell with navigation
- `ToastContainer.tsx` - Toast notification container

### Styling Convention (TailwindCSS)

- **Prefer TailwindCSS classes** over inline styles or CSS modules
- Use `cn()` utility from `clsx` + `tailwind-merge` for conditional classes:

  ```tsx
  import { clsx } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }

  // Usage
  <button
    className={cn(
      'px-4 py-2 rounded-lg',
      isActive && 'bg-indigo-500 text-white',
      isDisabled && 'opacity-50 cursor-not-allowed',
    )}
  >
    Click me
  </button>;
  ```

- **Fallback to inline styles** only for dynamic values that can't use Tailwind (e.g., calculated positions)
- Use `UPPER_SNAKE_CASE` for non-style constant values (e.g., `ANIMATION_DURATION`)

### Hooks

```typescript
// Custom hooks prefixed with 'use'
export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.getTransactions(filters),
  });
}
```

### API Calls

```typescript
// api/client.ts
const api = {
  async getTransactions(filters: TransactionFilters) {
    const { data } = await axios.get('/transactions', { params: filters });
    return data;
  },

  async createTransaction(dto: CreateTransactionDto) {
    const { data } = await axios.post('/transactions', dto);
    return data;
  },
};
```

## State Management

### Server State (TanStack Query)

```typescript
// Fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions'],
  queryFn: api.getTransactions,
});

// Mutations
const mutation = useMutation({
  mutationFn: api.createTransaction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});
```

### Client State (Zustand)

```typescript
// store/chatStore.ts
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),
  clearMessages: () => set({ messages: [] }),
}));
```

## Offline Support

```typescript
// hooks/useOfflineAgentSync.ts
export function useOfflineAgentSync() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      syncPendingMessages();
    }
  }, [isOnline]);
}

// offline/queue.ts
export async function queueMessage(message: ChatMessage) {
  const queue = (await localforage.getItem<ChatMessage[]>('pendingMessages')) || [];
  await localforage.setItem('pendingMessages', [...queue, message]);
}
```

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Styling

- Global styles in `index.css`
- CSS variables for theming (light/dark mode ready)
- Component-scoped styles using CSS modules or inline styles

## PWA Features

- Vite PWA plugin for service worker
- Installable on mobile/desktop
- Offline caching for static assets
- Background sync for API calls

## Testing

```bash
# Run from project root
pnpm test --filter=web
```
