import { useNavigate } from "react-router-dom";
import { Settings, UserCircle, MessageCircle, Bell } from "lucide-react";
import logo from "@/assets/logo.png";

interface AppHeaderProps {
  title: string;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
}

const AppHeader = ({ title, icon, rightContent }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="CloudFairway" className="h-7 w-7 rounded-md" />
        <h1 className="font-display text-xl font-bold leading-none">{title}</h1>
        {icon}
      </div>
      <div className="flex items-center gap-1">
        {rightContent}
        <button
          onClick={() => navigate("/notifications")}
          className="relative rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
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
