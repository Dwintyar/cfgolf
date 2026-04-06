import GBLogoImg from "@/components/GBLogoImg";
import { useNavigate } from "react-router-dom";
import { Settings, UserCircle, MessageCircle, Bell } from "lucide-react";
import { usePendingApprovals } from "@/hooks/use-pending-approvals";

interface AppHeaderProps {
  title: string;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
}

const AppHeader = ({ title, icon, rightContent }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { pendingCount, isAdmin } = usePendingApprovals();

  return (
    <div className="flex items-center justify-between px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2.5">
        <GBLogoImg alt="GolfBuana" className="h-9 w-9 object-contain" />
        <h1 className="font-display text-xl font-bold leading-none">{title}</h1>
        {icon}
      </div>
      <div className="flex items-center gap-1">
        {rightContent}
        <button
          onClick={() => navigate(isAdmin ? "/admin/approvals" : "/notifications")}
          className="relative rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {isAdmin && pendingCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate("/chat")}
          className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Messages"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Profile"
        >
          <UserCircle className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default AppHeader;
