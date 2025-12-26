import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider, RequireAuth } from './hooks/api/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { ProfilePage } from './features/auth/ProfilePage';
import { ChatPage } from './features/chat/ChatPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ManualEntryPage } from './features/manual-entry/ManualEntryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ChangePasswordPage } from './features/settings/ChangePasswordPage';
import { LandingPage } from './features/landing/LandingPage';
import { AppLayout } from './components/AppLayout';
import { ToastContainer } from './components/ToastContainer';
import { muiTheme } from './theme/muiTheme';
import { Suspense } from 'react';

export function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                  <Route
                    path="manual-entry"
                    element={
                      <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải...</div>}>
                        <ManualEntryPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="profile"
                    element={
                      <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải...</div>}>
                        <ProfilePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải...</div>}>
                        <SettingsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="change-password"
                    element={
                      <Suspense fallback={<div style={{ padding: '2rem' }}>Đang tải...</div>}>
                        <ChangePasswordPage />
                      </Suspense>
                    }
                  />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  );
}
