import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  desc?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

const EmptyState = ({ icon = "⛳", title, desc, action, children }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
    <div className="h-16 w-16 rounded-full bg-primary/8 flex items-center justify-center mb-4 text-3xl">
      {icon}
    </div>
    <p className="text-base font-semibold text-foreground">{title}</p>
    {desc && <p className="text-sm text-muted-foreground mt-1 max-w-xs leading-relaxed">{desc}</p>}
    {action && (
      <Button className="mt-4" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
    {children}
  </div>
);

export default EmptyState;
