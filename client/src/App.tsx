import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Interviewers from "@/pages/interviewers";
import Questions from "@/pages/questions";
import Sessions from "@/pages/sessions";
import Interview from "@/pages/interview";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      {/* Admin routes with sidebar */}
      <Route path="/">
        <AdminLayout>
          <Dashboard />
        </AdminLayout>
      </Route>
      <Route path="/interviewers">
        <AdminLayout>
          <Interviewers />
        </AdminLayout>
      </Route>
      <Route path="/questions">
        <AdminLayout>
          <Questions />
        </AdminLayout>
      </Route>
      <Route path="/sessions">
        <AdminLayout>
          <Sessions />
        </AdminLayout>
      </Route>
      
      {/* Interview route (no sidebar) */}
      <Route path="/interview/:sessionUrl">
        <Interview />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
