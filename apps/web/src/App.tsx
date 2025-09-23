import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider, RequireAuth } from './hooks/useAuth';
import { LoginPage } from './features/auth/LoginPage';
import { ChatPage } from './features/chat/ChatPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AppLayout } from './components/AppLayout';
import { Suspense } from 'react';

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="chat" replace />} />
              <Route
                path="chat"
                element={
                  <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải...</div>}>
                    <ChatPage />
                  </Suspense>
                }
              />
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải...</div>}>
                    <DashboardPage />
                  </Suspense>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  );
}
