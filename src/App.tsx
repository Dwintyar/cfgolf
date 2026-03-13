import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import Login from "./pages/Login";
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
import GolfersNearby from "./pages/GolfersNearby";
import Messages from "./pages/Messages";
import GolferProfile from "./pages/GolferProfile";
import Settings from "./pages/Settings";
import ChatList from "./pages/ChatList";
import ChatRoom from "./pages/ChatRoom";
import BookTeeTime from "./pages/BookTeeTime";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

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
        <div className="mx-auto max-w-lg min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/news" element={<NewsFeed />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:id" element={<ClubProfile />} />
            <Route path="/tour" element={<TourList />} />
            <Route path="/tour/:id" element={<TourDetail />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/event/:id/pairings" element={<EventPairings />} />
            <Route path="/event/:id/leaderboard" element={<EventLeaderboard />} />
            <Route path="/profile/:id" element={<PlayerProfile />} />
            <Route path="/venue" element={<VenueList />} />
            <Route path="/venue/:id" element={<Venue />} />
            <Route path="/play" element={<Play />} />
            <Route path="/play/golfers" element={<GolfersNearby />} />
            <Route path="/play/messages" element={<Messages />} />
            <Route path="/profile" element={<GolferProfile />} />
            <Route path="/profile/:id" element={<GolferProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:id" element={<ChatRoom />} />
            <Route path="/book/:courseId" element={<BookTeeTime />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
