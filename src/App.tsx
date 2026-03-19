import { useEffect, createContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import DesktopLayout from "@/components/DesktopLayout";
import AdminRoute from "@/components/AdminRoute";
import { useChatNotifications } from "@/hooks/use-chat-notifications";

export const ChatNotifContext = createContext<{ unreadCount: number }>({ unreadCount: 0 });
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ResetPassword from "./pages/ResetPassword";
import NewsFeed from "./pages/NewsFeed";
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
import BookTeeTime from "./pages/BookTeeTime";
import NotFound from "./pages/NotFound";
import PlatformAdminDashboard from "./pages/PlatformAdminDashboard";
import ClubAdminDashboard from "./pages/ClubAdminDashboard";
import ExportQueries from "./pages/ExportQueries";
import ScorecardInput from "./pages/ScorecardInput";
import Notifications from "./pages/Notifications";
import CourseAdminDashboard from "./pages/CourseAdminDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PublicProfile from "./pages/PublicProfile";

const queryClient = new QueryClient();

const noLayoutPaths = [
  "/login", "/onboarding", "/reset-password",
  "/admin", "/export-queries", "/privacy-policy", "/p/"
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const needsLayout = !noLayoutPaths.some(p => location.pathname.startsWith(p));

  if (needsLayout) {
    return <DesktopLayout>{children}</DesktopLayout>;
  }
  return <>{children}</>;
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
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<AdminRoute requirePlatformAdmin><PlatformAdminDashboard /></AdminRoute>} />
            <Route path="/admin/club/:clubId" element={<AdminRoute><ClubAdminDashboard /></AdminRoute>} />
            <Route path="/admin/course/:courseId" element={<CourseAdminDashboard />} />
            <Route path="/export-queries" element={<ExportQueries />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/news" element={<NewsFeed />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:id" element={<ClubProfile />} />
            <Route path="/tour" element={<TourList />} />
            <Route path="/tour/:id" element={<TourDetail />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/event/:id/pairings" element={<EventPairings />} />
            <Route path="/event/:id/leaderboard" element={<EventLeaderboard />} />
            <Route path="/event/:id/scorecard" element={<ScorecardInput />} />
            <Route path="/profile/:id" element={<PlayerProfile />} />
            <Route path="/venue" element={<VenueList />} />
            <Route path="/venue/:id" element={<Venue />} />
            <Route path="/play" element={<Play />} />
            <Route path="/play/messages" element={<Messages />} />
            <Route path="/profile" element={<GolferProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:id" element={<ChatRoom />} />
            <Route path="/book/:courseId" element={<BookTeeTime />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/p/:username" element={<PublicProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
        <BottomNav />
      </div>
    </ChatNotifContext.Provider>
  );
};

export default App;
