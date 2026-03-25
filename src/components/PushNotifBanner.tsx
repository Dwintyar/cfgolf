import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const NO_BANNER_PATHS = ["/login", "/onboarding", "/reset-password", "/privacy-policy"];

/**
 * Shown once to logged-in users who haven't granted push permission yet.
 * Dismissed permanently via localStorage.
 */
export default function PushNotifBanner() {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  const isAuthPage = NO_BANNER_PATHS.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    const wasDismissed = localStorage.getItem("push-banner-dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("push-banner-dismissed", "1");
    setDismissed(true);
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      localStorage.setItem("push-banner-dismissed", "1");
      setDismissed(true);
    }
  };

  // Hide if: already dismissed, already granted/denied/unsupported, or already subscribed
  if (isAuthPage) return null;
  if (dismissed) return null;
  if (permission === "granted" || permission === "denied" || permission === "unsupported") return null;
  if (isSubscribed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-[#1D9E75] text-white px-4 py-3 shadow-lg">
      <Bell className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">
        Aktifkan notifikasi agar tidak ketinggalan update klub & tournament
      </p>
      <button
        onClick={handleEnable}
        disabled={isLoading}
        className="shrink-0 rounded-full bg-white text-[#1D9E75] text-xs font-semibold px-3 py-1 disabled:opacity-60"
      >
        {isLoading ? "..." : "Aktifkan"}
      </button>
      <button onClick={handleDismiss} className="shrink-0 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
