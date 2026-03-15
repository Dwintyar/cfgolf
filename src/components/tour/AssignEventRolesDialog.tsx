import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "tournament_director", label: "Tournament Director", desc: "Full access, equivalent to club admin" },
  { value: "event_coordinator", label: "Event Coordinator", desc: "Manage pairings, check-in, cart, caddy" },
  { value: "score_recorder", label: "Score Recorder", desc: "Input scores for contestants" },
  { value: "hcp_officer", label: "HCP Officer", desc: "Approve/reject HCP corrections after event" },
  { value: "club_liaison", label: "Club Liaison", desc: "Club representative, manages club tickets" },
] as const;

interface Props {
  eventId: string;
  clubId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AssignEventRolesDialog = ({ eventId, clubId, open, onOpenChange }: Props) => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Club members for selection
  const { data: clubMembers } = useQuery({
    queryKey: ["club-members-for-roles", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("user_id, profiles(full_name)")
        .eq("club_id", clubId);
      return data ?? [];
    },
    enabled: !!clubId && open,
  });

  // Current roles
  const { data: currentRoles } = useQuery({
    queryKey: ["event-roles", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_roles")
        .select("*")
        .eq("event_id", eventId);
      return data ?? [];
    },
    enabled: !!eventId && open,
  });

  useEffect(() => {
    if (currentRoles) {
      const map: Record<string, string> = {};
      currentRoles.forEach((r: any) => { map[r.role] = r.user_id; });
      setAssignments(map);
    }
  }, [currentRoles]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // Delete existing roles for this event
      await supabase.from("event_roles").delete().eq("event_id", eventId);

      // Insert new assignments
      const inserts = Object.entries(assignments)
        .filter(([_, uid]) => uid)
        .map(([role, uid]) => ({
          event_id: eventId,
          user_id: uid,
          role,
          assigned_by: userId,
        }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("event_roles").insert(inserts);
        if (error) throw error;
      }

      toast.success("Event roles updated");
      queryClient.invalidateQueries({ queryKey: ["event-roles", eventId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Manage Event Roles</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {ROLE_OPTIONS.map((role) => (
            <div key={role.value}>
              <Label className="text-xs font-medium">{role.label}</Label>
              <p className="text-[10px] text-muted-foreground mb-1">{role.desc}</p>
              <Select
                value={assignments[role.value] || ""}
                onValueChange={(v) => setAssignments((prev) => ({ ...prev, [role.value]: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {clubMembers?.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name || "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save Roles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignEventRolesDialog;
