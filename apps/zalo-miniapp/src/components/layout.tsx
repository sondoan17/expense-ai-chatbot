import { getSystemInfo } from "zmp-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";

import { AuthProvider, RedirectIfAuthenticated, RequireAuth } from "../hooks/auth";
import { AppShell } from "../pages/AppShell";
import { ChatPage } from "../pages/ChatPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { ManualEntryPage } from "../pages/ManualEntryPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RegisterPage } from "../pages/RegisterPage";
import { SettingsPage } from "../pages/SettingsPage";
import HomePage from "../pages/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const Layout = () => {
  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <ZMPRouter>
            <AuthProvider>
              <AnimationRoutes>
                <Route
                  path="/"
                  element={
                    <RedirectIfAuthenticated>
                      <HomePage />
                    </RedirectIfAuthenticated>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <RedirectIfAuthenticated>
                      <LoginPage />
                    </RedirectIfAuthenticated>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <RedirectIfAuthenticated>
                      <RegisterPage />
                    </RedirectIfAuthenticated>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <RequireAuth>
                      <AppShell>
                        <ChatPage />
                      </AppShell>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <AppShell>
                        <DashboardPage />
                      </AppShell>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/manual-entry"
                  element={
                    <RequireAuth>
                      <AppShell>
                        <ManualEntryPage />
                      </AppShell>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <AppShell>
                        <ProfilePage />
                      </AppShell>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireAuth>
                      <AppShell>
                        <SettingsPage />
                      </AppShell>
                    </RequireAuth>
                  }
                />
              </AnimationRoutes>
            </AuthProvider>
          </ZMPRouter>
        </SnackbarProvider>
      </QueryClientProvider>
    </App>
  );
};
export default Layout;
