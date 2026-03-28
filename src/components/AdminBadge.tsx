import { Shield, Trophy, Calendar, Settings, Flag } from "lucide-react";

type AdminLevel = "platform" | "club" | "tour" | "event" | "course";

interface Props {
  level: AdminLevel;
  context?: string;
  subContext?: string;
  extraContext?: string;
}

const AdminBadge = ({ level, context, subContext, extraContext }: Props) => {
  const isAmber = level === "club" || level === "tour" || level === "event";
  const isBlue = level === "course";
  const isRed = level === "platform";

  const colorClass = isRed
    ? "bg-red-500/15 border-red-500/40 text-red-400"
    : isBlue
    ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
    : "bg-amber-500/15 border-amber-500/40 text-amber-400";

  const dotClass = isRed ? "bg-red-400" : isBlue ? "bg-blue-400" : "bg-amber-400";

  const label =
    level === "platform" ? "Platform Admin" :
    level === "club" ? "Club Admin" :
    level === "tour" ? "Tour Admin" :
    level === "event" ? "Event Admin" : "Course Admin";

  const Icon =
    level === "platform" ? Settings :
    level === "club" ? Shield :
    level === "tour" ? Trophy :
    level === "event" ? Calendar : Flag;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 mx-4 mb-2 rounded-xl border ${colorClass}`}>
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotClass} opacity-60`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </span>

      {/* Icon + label */}
      <span className="flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider shrink-0">
        <Icon className="h-3 w-3" />
        {label}
      </span>

      {/* Breadcrumb */}
      {context && (
        <>
          <span className="opacity-40 text-xs">›</span>
          <span className="text-[11px] font-medium opacity-80 truncate">{context}</span>
        </>
      )}
      {subContext && (
        <>
          <span className="opacity-40 text-xs">›</span>
          <span className="text-[11px] opacity-60 truncate">{subContext}</span>
        </>
      )}
      {extraContext && (
        <span className="ml-auto text-[10px] opacity-50 shrink-0">{extraContext}</span>
      )}
    </div>
  );
};

export default AdminBadge;
