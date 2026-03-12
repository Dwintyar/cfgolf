import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import Login from "./pages/Login";
import NewsFeed from "./pages/NewsFeed";
import Clubs from "./pages/Clubs";
import ClubProfile from "./pages/ClubProfile";
import Tournaments from "./pages/Tournaments";
import Venue from "./pages/Venue";
import Play from "./pages/Play";
import GolfersNearby from "./pages/GolfersNearby";
import Messages from "./pages/Messages";
import GolferProfile from "./pages/GolferProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="mx-auto max-w-lg min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/news" element={<NewsFeed />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:id" element={<ClubProfile />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/venue" element={<Venue />} />
            <Route path="/play" element={<Play />} />
            <Route path="/play/golfers" element={<GolfersNearby />} />
            <Route path="/play/messages" element={<Messages />} />
            <Route path="/play/profile" element={<GolferProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
