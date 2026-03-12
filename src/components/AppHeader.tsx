import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import logo from "@/assets/logo.png";

interface AppHeaderProps {
  title: string;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
}

const AppHeader = ({ title, icon, rightContent }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <img src={logo} alt="CloudFairway" className="h-8 w-8" />
        {icon}
        <h1 className="font-display text-2xl font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
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
