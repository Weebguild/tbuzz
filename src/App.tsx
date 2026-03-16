import { useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ShipLayout from "@/ship/layouts/ShipLayout";
import ShipDiscover from "@/ship/pages/ShipDiscover";
import ShipMatches from "@/ship/pages/ShipMatches";
import ShipProfile from "@/ship/pages/ShipProfile";
import ShipChat from "@/ship/pages/ShipChat";
import ShipOnboarding from "@/ship/pages/ShipOnboarding";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { HaloProvider } from "@/hooks/useHalo";
import { AppLayout } from "@/components/layout/AppLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Feed from "./pages/Feed";
import Gossip from "./pages/Gossip";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import ChatRoom from "./pages/ChatRoom";
import AvatarCrop from "./pages/AvatarCrop";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { session, profile, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const isMobile = useIsMobile();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-foreground mb-4">T</h1>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-black min-h-screen w-full">
        <Routes location={location}>
          <Route path="/auth" element={session ? <Navigate to="/feed" replace /> : <Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={session && !profile ? <Onboarding /> : <Navigate to="/feed" replace />} />
          <Route
            path="/avatar-crop"
            element={
              <ProtectedRoute>
                <AvatarCrop />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/feed" element={<Feed />} />
            <Route path="/gossip" element={<Gossip />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
          </Route>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {isMobile && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <HaloProvider>
            <AppRoutes />
          </HaloProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
