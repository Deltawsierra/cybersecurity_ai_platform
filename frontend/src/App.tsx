import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient, setTokenGetter, setRefreshHandler, setLogoutHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { NewsTicker } from "@/components/news-ticker";
import { AnimatedBackground } from "@/components/animated-background";
import Dashboard from "@/pages/dashboard";
import AttackPaths from "@/pages/attack-paths";
import Investigations from "@/pages/investigations";
import Pentest from "@/pages/pentest";
import CVEClassifier from "@/pages/cve-classifier";
import MissionView from "@/pages/mission-view";
import GNSSDrone from "@/pages/gnss-drone";
import Compliance from "@/pages/compliance";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/attack-paths">{() => <ProtectedRoute component={AttackPaths} />}</Route>
      <Route path="/pentest">{() => <ProtectedRoute component={Pentest} />}</Route>
      <Route path="/investigations">{() => <ProtectedRoute component={Investigations} />}</Route>
      <Route path="/cve-classifier">{() => <ProtectedRoute component={CVEClassifier} />}</Route>
      <Route path="/mission-view">{() => <ProtectedRoute component={MissionView} />}</Route>
      <Route path="/gnss-drone">{() => <ProtectedRoute component={GNSSDrone} />}</Route>
      <Route path="/compliance">{() => <ProtectedRoute component={Compliance} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const isLoginPage = location === "/login";
  const showChrome = isAuthenticated && !isLoginPage;

  return (
    <div className="min-h-screen bg-background cyber-grid-bg relative">
      <AnimatedBackground />
      <div className="fixed inset-0 z-0 pointer-events-none dark:bg-gradient-to-b dark:from-[rgba(0,230,255,0.02)] dark:via-transparent dark:to-[rgba(255,0,180,0.02)]" />
      <div className="relative z-10">
        {showChrome && <DashboardHeader />}
        {showChrome && <NewsTicker />}
        <main className="flex-1">
          <Router />
        </main>
      </div>
    </div>
  );
}

function TokenSync() {
  const { getAccessToken, refreshAccessToken, logout } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    setTokenGetter(getAccessToken);
    setRefreshHandler(refreshAccessToken);
    setLogoutHandler(() => {
      logout();
      setLocation("/login");
    });
  }, [getAccessToken, refreshAccessToken, logout, setLocation]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TokenSync />
          <AuthenticatedLayout />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
