// External libraries
import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AnimatePresence, motion, Transition } from 'framer-motion';

// Providers and contexts
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider, RequireAuth, useAuth } from './hooks/api/useAuth';
import { ToastProvider } from './contexts/ToastContext';

// Theme
import { muiTheme } from './theme/muiTheme';

// Components
import { AppLayout } from './components/AppLayout';
import { ToastContainer } from './components/ToastContainer';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PageLoader } from './components/PageLoader';

// Pages
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

// Types
interface AnimatedAuthPageProps {
  children: React.ReactNode;
  direction: 'left' | 'right';
}

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

// Constants
const PAGE_TRANSITION: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
};

const AUTH_ROUTES = ['/login', '/register'];

// Redirect authenticated users to the app
function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/app/chat" replace />;
  }

  return <>{children}</>;
}

// Animated page wrapper for auth pages
function AnimatedAuthPage({ children, direction }: AnimatedAuthPageProps) {
  return (
    <motion.div
      initial={{ x: direction === 'right' ? '100%' : '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'right' ? '-100%' : '100%', opacity: 0 }}
      transition={PAGE_TRANSITION}
      className="absolute w-full h-full"
    >
      {children}
    </motion.div>
  );
}

// App routes with AnimatePresence for auth pages
function AppRoutes() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

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
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated>
                <LandingPage />
              </RedirectIfAuthenticated>
            }
          />
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
                <Suspense fallback={<PageLoader />}>
                  <ChatPage />
                </Suspense>
              }
            />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="manual-entry"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ManualEntryPage />
                </Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="change-password"
              element={
                <Suspense fallback={<PageLoader />}>
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

// Main App Component
export function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <div className="relative min-h-screen overflow-hidden">
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
