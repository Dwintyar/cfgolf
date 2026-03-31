import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const VenueStaffTab = ({ clubId }: { clubId: string }) => {

  const { data: course } = useQuery({
    queryKey: ["venue-course", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses").select("id, name").eq("club_id", clubId).single();
      return data;
    },
    enabled: !!clubId,
  });

  const { data: admins, isLoading: loadingAdmins } = useQuery({
    queryKey: ["venue-admins", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("id, staff_role, profiles(full_name, avatar_url, email)")
        .eq("club_id", clubId).eq("status", "active");
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const { data: caddies, isLoading: loadingCaddies } = useQuery({
    queryKey: ["venue-caddies", course?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_caddies").select("*").eq("course_id", course!.id).order("name");
      return data ?? [];
    },
    enabled: !!course?.id,
  });

  if (loadingAdmins || loadingCaddies) return (
    <div className="space-y-0">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
        </div>
      ))}
    </div>
  );

  if (!admins?.length && !caddies?.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
      <Users className="h-10 w-10 opacity-30" />
      <p className="text-sm font-semibold">No staff yet</p>
      <p className="text-xs">Course admins and caddies will appear here</p>
    </div>
  );

  return (
    <div>
      {(admins?.length ?? 0) > 0 && (
        <>
          <div className="px-4 py-2 bg-secondary/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Course Admin</p>
          </div>
          {admins!.map((s: any) => {
            const profile = s.profiles as any;
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{profile?.full_name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{profile?.full_name ?? "—"}</p>
                  <p className="text-[13px] text-muted-foreground truncate">{profile?.email ?? ""}</p>
                </div>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">Admin</Badge>
              </div>
            );
          })}
        </>
      )}
      {(caddies?.length ?? 0) > 0 && (
        <>
          <div className="px-4 py-2 bg-secondary/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Caddies ({caddies!.length})</p>
          </div>
          {caddies!.map((caddy: any) => (
            <div key={caddy.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-muted-foreground">{caddy.caddy_number ? `#${caddy.caddy_number}` : caddy.name?.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{caddy.name}</p>
                {caddy.notes && <p className="text-[13px] text-muted-foreground truncate">{caddy.notes}</p>}
              </div>
              {caddy.caddy_number && <Badge variant="outline" className="text-xs shrink-0">#{caddy.caddy_number}</Badge>}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default VenueStaffTab;
