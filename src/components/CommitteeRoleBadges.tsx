import { Badge } from "@/components/ui/badge";

const ROLE_STYLES: Record<string, string> = {
  Chairman: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  "Tour Admin": "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
  "Event Admin": "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400",
  "Handicap Committee": "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
  Captain: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400",
  "Tournament Chairman": "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  Secretary: "bg-muted text-muted-foreground border-border",
  "Committee Member": "bg-muted text-muted-foreground border-border",
};

interface CommitteeRoleBadgesProps {
  roles: string[];
  className?: string;
}

const CommitteeRoleBadges = ({ roles, className = "" }: CommitteeRoleBadgesProps) => {
  if (!roles.length) return null;

  const unique = [...new Set(roles)];

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {unique.map((role) => (
        <Badge
          key={role}
          variant="outline"
          className={`text-[9px] px-1.5 py-0 ${ROLE_STYLES[role] ?? ROLE_STYLES["Committee Member"]}`}
        >
          {role}
        </Badge>
      ))}
    </div>
  );
};

export default CommitteeRoleBadges;
