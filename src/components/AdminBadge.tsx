import { Shield, Trophy, Calendar, Settings, Flag } from "lucide-react";

type AdminLevel = "platform" | "club" | "tour" | "event" | "course";

interface Props {
  level: AdminLevel;
  context?: string;       // e.g. club name, tour name, event name
  subContext?: string;    // e.g. course name, date
  extraContext?: string;  // e.g. event date
}

const config: Record<AdminLevel, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  dot: string;
}> = {
  platform: {
    label: "Platform Admin",
    icon: <Settings className="h-3 w-3" />,
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  club: {
    label: "Club Admin",
    icon: <Shield className="h-3 w-3" />,
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  tour: {
    label: "Tour Admin",
    icon: <Trophy className="h-3 w-3" />,
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  event: {
    label: "Event Admin",
    icon: <Calendar className="h-3 w-3" />,
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  course: {
    label: "Course Admin",
    icon: <Flag className="h-3 w-3" />,
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
};

const AdminBadge = ({ level, context, subContext, extraContext }: Props) => {
  const c = config[level];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 mx-4 mb-1 rounded-xl border ${c.bg} ${c.border}`}>
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-60`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`} />
      </span>

      {/* Icon + label */}
      <span className={`flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider ${c.text} shrink-0`}>
        {c.icon}
        {c.label}
      </span>

      {/* Breadcrumb */}
      {context && (
        <>
          <span className={`${c.text} opacity-40 text-xs`}>›</span>
          <span className={`text-[11px] font-medium ${c.text} opacity-80 truncate`}>{context}</span>
        </>
      )}
      {subContext && (
        <>
          <span className={`${c.text} opacity-40 text-xs`}>›</span>
          <span className={`text-[11px] ${c.text} opacity-60 truncate`}>{subContext}</span>
        </>
      )}
      {extraContext && (
        <span className={`ml-auto text-[10px] ${c.text} opacity-50 shrink-0`}>{extraContext}</span>
      )}
    </div>
  );
};

export default AdminBadge;
