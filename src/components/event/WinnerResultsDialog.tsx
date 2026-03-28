import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
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
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: results } = useQuery({
    queryKey: ["event-results-dialog", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_results")
        .select(`
          id, score_value, rank_position, category_id, contestant_id,
          tournament_winner_categories(id, category_name, calculation_type, flight_id, display_order,
            tournament_flights(id, flight_name, display_order)
          ),
          contestants(player_id, profiles(full_name, avatar_url, handicap))
        `)
        .eq("event_id", eventId)
        .order("rank_position");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Group: Overall (no flight) then by flight
  const sections: { title: string; flightId: string | null; colorCls: string; items: any[] }[] = [];

  if (results?.length) {
    const overallItems: any[] = [];
    const flightGroups: Record<string, { name: string; order: number; colorCls: string; items: any[] }> = {};

    for (const r of results) {
      const cat = r.tournament_winner_categories as any;
      const flightId = cat?.flight_id;
      const flight = cat?.tournament_flights;

      if (!flightId) {
        overallItems.push(r);
      } else {
        if (!flightGroups[flightId]) {
          const flightName = flight?.flight_name ?? "Flight";
          // Determine color based on flight name
          const nameLower = flightName.toLowerCase();
          const colorCls = nameLower.includes("a") || nameLower.includes("level a")
            ? "text-blue-600 border-blue-500/30 bg-blue-500/5"
            : nameLower.includes("b") || nameLower.includes("level b")
              ? "text-amber-600 border-amber-500/30 bg-amber-500/5"
              : "text-muted-foreground border-border bg-muted/30";
          flightGroups[flightId] = {
            name: flightName,
            order: flight?.display_order ?? 99,
            colorCls,
            items: [],
          };
        }
        flightGroups[flightId].items.push(r);
      }
    }

    if (overallItems.length) {
      sections.push({ title: "OVERALL", flightId: null, colorCls: "text-primary border-primary/30 bg-primary/5", items: overallItems });
    }

    Object.values(flightGroups)
      .sort((a, b) => a.order - b.order)
      .forEach(fg => {
        sections.push({ title: fg.name.toUpperCase(), flightId: null, colorCls: fg.colorCls, items: fg.items });
      });

    // Sort items within each section by display_order of category, then rank_position
    sections.forEach(s => {
      s.items.sort((a: any, b: any) => {
        const catA = a.tournament_winner_categories as any;
        const catB = b.tournament_winner_categories as any;
        const orderA = catA?.display_order ?? 99;
        const orderB = catB?.display_order ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.rank_position - b.rank_position;
      });
    });
  }

  const handleFinalize = async () => {
    setFinalizing(true);
    const { error } = await supabase
      .from("events")
      .update({ status: "done" })
      .eq("id", eventId);
    setFinalizing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event finalized & results published!");
    onDone();
  };

  const handleExport = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement("a");
      const safeName = eventName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
      link.download = `${safeName}-Results.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Results exported!");
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  const rankIcon = (pos: number) => {
    if (pos === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (pos === 2) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (pos === 3) return <Award className="h-4 w-4 text-amber-700" />;
    return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{pos}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" /> Event Results
            </DialogTitle>
            {results && results.length > 0 && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Export PNG
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{eventName}</p>
        </DialogHeader>

        {(!results || results.length === 0) && (
          <div className="text-center py-6">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No results calculated yet</p>
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

        {sections.length > 0 && (
          <div ref={contentRef} className="space-y-4">
            {sections.map((section, si) => (
              <div key={si} className="space-y-2">
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${section.colorCls}`}>
                  <Trophy className="h-3.5 w-3.5" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">{section.title}</h3>
                </div>
                {section.items.map((r: any) => {
                  const cat = r.tournament_winner_categories as any;
                  const profile = r.contestants?.profiles;
                  const catName = cat?.category_name ?? "";
                  const calcType = cat?.calculation_type === "net" ? "Net" : "Gross";
                  return (
                    <div key={r.id} className="golf-card flex items-center gap-3 p-3">
                      <div className="flex items-center justify-center w-6 shrink-0">
                        {rankIcon(r.rank_position)}
                      </div>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={profile?.avatar_url ?? ""} />
                        <AvatarFallback className="bg-secondary text-[9px] font-bold">
                          {(profile?.full_name ?? "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{profile?.full_name ?? "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{catName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{r.score_value}</p>
                        <p className="text-[9px] text-muted-foreground">{calcType}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {results && results.length > 0 && eventStatus !== "done" && (
          <DialogFooter>
            <Button onClick={handleFinalize} disabled={finalizing} className="w-full gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {finalizing ? "Finalizing…" : "Finalize & Publish Results"}
            </Button>
          </DialogFooter>
        )}

        {eventStatus === "done" && (
          <p className="text-center text-xs text-primary font-semibold py-2">✅ Results Published</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WinnerResultsDialog;
