import { useEffect, createContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import AdminRoute from "@/components/AdminRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useChatNotifications } from "@/hooks/use-chat-notifications";
import PushNotifBanner from "@/components/PushNotifBanner";

export const ChatNotifContext = createContext<{ unreadCount: number }>({ unreadCount: 0 });
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ResetPassword from "./pages/ResetPassword";
import NewsFeed from "./pages/NewsFeed";
import Lounge from "./pages/Lounge";
import Rounds from "./pages/Rounds";
import Clubs from "./pages/Clubs";
import ClubProfile from "./pages/ClubProfile";
import TourList from "./pages/TourList";
import TourDetail from "./pages/TourDetail";
import EventDetail from "./pages/EventDetail";
import EventPairings from "./pages/EventPairings";
import EventLeaderboard from "./pages/EventLeaderboard";
import PlayerProfile from "./pages/PlayerProfile";
import VenueList from "./pages/VenueList";
import Venue from "./pages/Venue";
import Play from "./pages/Play";
import Messages from "./pages/Messages";
import GolferProfile from "./pages/GolferProfile";
import Settings from "./pages/Settings";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";
import PlatformAdminDashboard from "./pages/PlatformAdminDashboard";
import ClubAdminDashboard from "./pages/ClubAdminDashboard";
import ExportQueries from "./pages/ExportQueries";
import ScorecardInput from "./pages/ScorecardInput";
import Notifications from "./pages/Notifications";
import CourseAdminDashboard from "./pages/CourseAdminDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PublicProfile from "./pages/PublicProfile";
import LiveDisplay from "./pages/LiveDisplay";
import AdminApprovals from "./pages/AdminApprovals";

const queryClient = new QueryClient();

const noLayoutPaths = [
  "/login", "/onboarding", "/reset-password", "/privacy-policy", "/p/", "/live/"
];

const leftSidebarOnlyPaths = [
  "/admin", "/export-queries"
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isNoLayout = noLayoutPaths.some(p => location.pathname.startsWith(p));
  const isLeftOnly = leftSidebarOnlyPaths.some(p => location.pathname.startsWith(p));

  if (isNoLayout) return <>{children}</>;

  return (
    <DesktopLayout sidebarRightHidden={isLeftOnly}>
      {children}
    </DesktopLayout>
  );
};

const App = () => {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.add("light");
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const AppInner = () => {
  const { unreadCount } = useChatNotifications();

  return (
    <ChatNotifContext.Provider value={{ unreadCount }}>
      <div className="min-h-screen">
        <PushNotifBanner />
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/lounge" replace />} />
            {/* Public routes — no auth needed */}
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/p/:username" element={<PublicProfile />} />
            <Route path="/live/:eventId" element={<LiveDisplay />} />

            {/* Protected routes — require approved session */}
            <Route path="/admin" element={<ProtectedRoute><AdminRoute requirePlatformAdmin><PlatformAdminDashboard /></AdminRoute></ProtectedRoute>} />
            <Route path="/admin/approvals" element={<ProtectedRoute><AdminApprovals /></ProtectedRoute>} />
            <Route path="/admin/club/:clubId" element={<ProtectedRoute><AdminRoute><ClubAdminDashboard /></AdminRoute></ProtectedRoute>} />
            <Route path="/admin/course/:courseId" element={<ProtectedRoute><CourseAdminDashboard /></ProtectedRoute>} />
            <Route path="/export-queries" element={<ProtectedRoute><ExportQueries /></ProtectedRoute>} />
            <Route path="/news" element={<ProtectedRoute><NewsFeed /></ProtectedRoute>} />
            <Route path="/lounge" element={<ProtectedRoute><Lounge /></ProtectedRoute>} />
            <Route path="/rounds" element={<ProtectedRoute><Rounds /></ProtectedRoute>} />
            {/* Redirects from old URLs */}
            <Route path="/news" element={<Navigate to="/lounge" replace />} />
            <Route path="/tour" element={<Navigate to="/rounds" replace />} />
            <Route path="/venue" element={<Navigate to="/rounds" replace />} />
            <Route path="/chat" element={<Navigate to="/lounge" replace />} />
            <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
            <Route path="/clubs/:id" element={<ProtectedRoute><ClubProfile /></ProtectedRoute>} />
            <Route path="/tour" element={<ProtectedRoute><TourList /></ProtectedRoute>} />
            <Route path="/tour/:id" element={<ProtectedRoute><TourDetail /></ProtectedRoute>} />
            <Route path="/event/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
            <Route path="/event/:id/pairings" element={<ProtectedRoute><EventPairings /></ProtectedRoute>} />
            <Route path="/event/:id/leaderboard" element={<ProtectedRoute><EventLeaderboard /></ProtectedRoute>} />
            <Route path="/event/:id/scorecard" element={<ProtectedRoute><ScorecardInput /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
            <Route path="/venue" element={<ProtectedRoute><VenueList /></ProtectedRoute>} />
            <Route path="/venue/:id" element={<ProtectedRoute><Venue /></ProtectedRoute>} />
            <Route path="/play" element={<ProtectedRoute><Play /></ProtectedRoute>} />
            <Route path="/play/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><GolferProfile /></ProtectedRoute>} />
            <Route path="/golfer/:id" element={<ProtectedRoute><GolferProfile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
        <BottomNav />
      </div>
    </ChatNotifContext.Provider>
  );
};

export default App;
