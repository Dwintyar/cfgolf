import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { toast } from "sonner";

interface Props {
  eventId: string;
  eventName: string;
  eventStatus: string;
  isOrganizer?: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

const WinnerResultsDialog = ({ eventId, eventName, eventStatus, isOrganizer, open, onOpenChange, onDone }: Props) => {
  const [finalizing, setFinalizing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const queryClient = useQueryClient();

  const { data: results } = useQuery({
    queryKey: ["event-results-dialog", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_results")
        .select("*, contestants(profiles(full_name, handicap)), tournament_winner_categories(category_name, calculation_type)")
        .eq("event_id", eventId)
        .order("rank_position");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Group results by category
  const grouped: Record<string, any[]> = {};
  results?.forEach((r: any) => {
    const catName = r.tournament_winner_categories?.category_name ?? "Unknown";
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(r);
  });

  const handleFinalize = async () => {
    setFinalizing(true);
    const { error } = await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", eventId);
    setFinalizing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event finalized & results published!");
    onDone();
  };

  const rankIcon = (pos: number) => {
    if (pos === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (pos === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (pos === 3) return <Award className="h-4 w-4 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{pos}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" /> Event Results
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{eventName}</p>
        </DialogHeader>

        {(!results || results.length === 0) && (
          <div className="text-center py-6">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No results calculated yet</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Calculate Results" below to calculate</p>
            {isOrganizer && (
              <Button
                className="w-full mt-4 gap-2"
                disabled={calculating}
                onClick={async () => {
                  setCalculating(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    const { data, error } = await supabase.functions.invoke("calculate-event-winners", {
                      body: { event_id: eventId },
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    if (error) { toast.error("Gagal: " + error.message); return; }
                    if (data?.error) { toast.error("Gagal: " + data.error); return; }
                    toast.success(`${data.winners_calculated} pemenang dihitung`);
                    queryClient.invalidateQueries({ queryKey: ["event-results-dialog", eventId] });
                    queryClient.invalidateQueries({ queryKey: ["event-results", eventId] });
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setCalculating(false);
                  }
                }}
              >
                <Trophy className="h-4 w-4" />
                {calculating ? "Calculating…" : "Calculate Results Now"}
              </Button>
            )}
          </div>
        )}

        {Object.entries(grouped).map(([catName, catResults]) => (
          <div key={catName} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1">
              {catName}
            </h3>
            {catResults.sort((a: any, b: any) => a.rank_position - b.rank_position).map((r: any) => (
              <div key={r.id} className="golf-card flex items-center gap-3 p-3">
                <div className="flex items-center justify-center w-6">
                  {rankIcon(r.rank_position)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {r.contestants?.profiles?.full_name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.tournament_winner_categories?.calculation_type === "net" ? "Net" : "Gross"} {r.score_value}
                  </p>
                </div>
                {r.rank_position <= 3 && (
                  <Badge variant="outline" className={`text-[10px] ${
                    r.rank_position === 1 ? "border-yellow-500/50 text-yellow-500" :
                    r.rank_position === 2 ? "border-gray-400/50 text-gray-400" :
                    "border-amber-700/50 text-amber-700"
                  }`}>
                    {r.rank_position === 1 ? "1st" : r.rank_position === 2 ? "2nd" : "3rd"}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ))}

        {results && results.length > 0 && eventStatus !== "completed" && (
          <DialogFooter>
            <Button onClick={handleFinalize} disabled={finalizing} className="w-full gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {finalizing ? "Finalizing…" : "Finalize & Publish Results"}
            </Button>
          </DialogFooter>
        )}

        {eventStatus === "completed" && (
          <p className="text-center text-xs text-primary font-semibold py-2">✅ Results Published</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WinnerResultsDialog;
