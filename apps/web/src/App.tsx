import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import { AnimatePresence, motion, Transition } from 'framer-motion';

const pageTransition: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
};

// Animated page wrapper for auth pages
function AnimatedAuthPage({
  children,
  direction,
}: {
  children: React.ReactNode;
  direction: 'left' | 'right';
}) {
  return (
    <motion.div
      initial={{ x: direction === 'right' ? '100%' : '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'right' ? '-100%' : '100%', opacity: 0 }}
      transition={pageTransition}
      style={{ position: 'absolute', width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

// App routes with AnimatePresence for auth pages
function AppRoutes() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      {/* Auth pages with slide animation */}
      <AnimatePresence mode="wait">
        {location.pathname === '/login' && (
          <AnimatedAuthPage key="login" direction="right">
            <LoginPage />
          </AnimatedAuthPage>
        )}
        {location.pathname === '/register' && (
          <AnimatedAuthPage key="register" direction="left">
            <RegisterPage />
          </AnimatedAuthPage>
        )}
      </AnimatePresence>

      {/* Other routes without animation */}
      {!isAuthPage && (
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
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
      )}
    </>
  );
}

export function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
                <AppRoutes />
              </div>
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  );
}
