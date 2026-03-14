import { useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { HaloProvider } from "@/hooks/useHalo";
import { AppLayout } from "@/components/layout/AppLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { DatingLayout } from "@/components/dating/DatingLayout";
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
import DatingOnboarding from "./pages/dating/DatingOnboarding";
import DatingDiscover from "./pages/dating/DatingDiscover";
import DatingCrushes from "./pages/dating/DatingCrushes";
import DatingProfile from "./pages/dating/DatingProfile";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const isDating = location.pathname.startsWith('/dating');
  const layoutKey = isDating ? 'dating' : 'main';

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
    // BottomNav MUST be outside the AnimatePresence/motion.div.
    // If it is inside a parent with transform/filter CSS, `position: fixed`
    // gets trapped in that stacking context on mobile — nav scrolls with the page.
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={layoutKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={isDating ? "min-h-screen w-full" : "bg-black min-h-screen w-full"}
        >
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
          
          {/* ── DATING ECOSYSTEM — Separate Layout ── */}
          <Route
            element={
              <ProtectedRoute>
                <DatingLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dating" element={<Navigate to="/dating/discover" replace />} />
            <Route path="/dating/onboarding" element={<DatingOnboarding />} />
            <Route path="/dating/discover" element={<DatingDiscover />} />
            <Route path="/dating/matches" element={<DatingCrushes />} />
            <Route path="/dating/crushes" element={<Navigate to="/dating/matches" replace />} />
            <Route path="/dating/profile" element={<DatingProfile />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* BottomNav lives here — outside any transform/filter parent — so
          position:fixed correctly anchors to the viewport on iOS Safari */}
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
