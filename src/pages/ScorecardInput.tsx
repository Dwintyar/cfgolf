import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ScorecardInput = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/login", { replace: true });
      else setUserId(user.id);
    });
  }, [navigate]);

  const { data: event } = useQuery({
    queryKey: ["event-scorecard", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(id, name, par, holes_count)")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: holes } = useQuery({
    queryKey: ["event-holes-sc", eventId],
    queryFn: async () => {
      // Try event_holes first
      const { data: eh } = await supabase
        .from("event_holes")
        .select("hole_number, par, stroke_index")
        .eq("event_id", eventId!)
        .order("hole_number");
      if (eh && eh.length > 0) return eh.map(h => ({ hole_number: h.hole_number, par: h.par ?? 4, si: h.stroke_index }));

      // Fallback to course_holes
      const courseId = event ? (event.courses as any)?.id : null;
      if (!courseId) {
        // No holes data — generate default 18 holes par 4
        return Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, par: 4, si: i + 1 }));
      }
      const { data: ch } = await supabase
        .from("course_holes")
        .select("hole_number, par, handicap_index")
        .eq("course_id", courseId)
        .order("hole_number");
      if (ch && ch.length > 0) return ch.map(h => ({ hole_number: h.hole_number, par: h.par ?? 4, si: h.handicap_index }));

      // Absolute fallback
      return Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, par: 4, si: i + 1 }));
    },
    enabled: !!eventId && !!event,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-sc", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("handicap, full_name").eq("id", userId!).single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch existing saved scores
  const { data: existingScores } = useQuery({
    queryKey: ["existing-scores-sc", eventId, userId],
    queryFn: async () => {
      const courseId = (event?.courses as any)?.id;
      if (!courseId || !userId) return null;

      // Find round for this course by this user
      const { data: round } = await supabase
        .from("rounds").select("id")
        .eq("course_id", courseId).eq("created_by", userId)
        .maybeSingle();
      if (!round) return null;

      // Find scorecard
      const { data: sc } = await supabase
        .from("scorecards").select("id")
        .eq("round_id", round.id).eq("player_id", userId)
        .maybeSingle();
      if (!sc) return null;

      // Fetch hole scores
      const { data: hs } = await supabase
        .from("hole_scores").select("hole_number, strokes")
        .eq("scorecard_id", sc.id);
      return hs ?? [];
    },
    enabled: !!event && !!userId,
  });

  // Pre-populate scores from database when loaded
  useEffect(() => {
    if (!existingScores || existingScores.length === 0) return;
    setScores(prev => {
      // Only set if no scores entered yet (don't overwrite user input)
      if (Object.keys(prev).length > 0) return prev;
      const loaded: Record<number, number | null> = {};
      existingScores.forEach((hs: any) => {
        if (hs.strokes !== null) loaded[hs.hole_number] = hs.strokes;
      });
      return loaded;
    });
  }, [existingScores]);

  // Auto-set playing + auto-register contestant
  useEffect(() => {
    if (!event || !eventId || !userId) return;
    if (event.status === "scheduled" || event.status === "ready") {
      supabase.from("events").update({ status: "playing" }).eq("id", eventId);
    }
    const autoRegister = async () => {
      const { data: existing } = await supabase
        .from("contestants").select("id").eq("event_id", eventId).eq("player_id", userId).maybeSingle();
      if (!existing) {
        await supabase.from("contestants").insert({
          event_id: eventId, player_id: userId,
          hcp: profile?.handicap ?? 0, status: "confirmed",
        });
      }
    };
    autoRegister();
  }, [event?.id, userId]);

  const holesCount = holes?.length ?? 18;
  const coursePar = (event?.courses as any)?.par ?? 72;
  const playerHcp = profile?.handicap ?? 0;

  const getStrokes = (hole: number) => scores[hole] ?? null;
  const totalStrokes = Object.values(scores).reduce((s, v) => s + (v ?? 0), 0);
  const netTotal = Math.max(0, totalStrokes - Number(playerHcp));
  const filledCount = Object.values(scores).filter(v => v !== null).length;
  const allFilled = filledCount === holesCount;

  const updateScore = (hole: number, val: string) => {
    const n = parseInt(val);
    if (val === "") { setScores(prev => { const p = { ...prev }; delete p[hole]; return p; }); return; }
    if (isNaN(n) || n < 1 || n > 15) return;
    setScores(prev => ({ ...prev, [hole]: n }));
    if (hole < holesCount) setTimeout(() => inputRefs.current[hole]?.focus(), 80);
  };

  const handleSave = async (finish = false) => {
    if (!userId || !event) return;
    setSubmitting(true);
    try {
      const courseId = (event.courses as any)?.id;

      // Ensure contestant
      let { data: contestant } = await supabase
        .from("contestants").select("id, hcp").eq("event_id", eventId!).eq("player_id", userId).maybeSingle();
      if (!contestant) {
        const { data: newC } = await supabase.from("contestants")
          .insert({ event_id: eventId!, player_id: userId, hcp: playerHcp, status: "confirmed" })
          .select("id, hcp").single();
        contestant = newC;
      }

      // Create/get round
      let { data: round } = await supabase.from("rounds").select("id")
        .eq("course_id", courseId).eq("created_by", userId).maybeSingle();
      if (!round) {
        const { data: nr } = await supabase.from("rounds")
          .insert({ course_id: courseId, created_by: userId, status: "playing" }).select().single();
        round = nr;
        if (round) await supabase.from("round_players").insert({ round_id: round.id, user_id: userId });
      }
      if (!round) throw new Error("Failed to create round");

      const gross = totalStrokes;
      const net = netTotal;
      const totalPutts = 0;

      // Upsert scorecard
      const { data: sc } = await supabase.from("scorecards")
        .upsert({ round_id: round.id, player_id: userId, course_id: courseId, total_score: gross, gross_score: gross, net_score: net, total_putts: totalPutts }, { onConflict: "round_id,player_id" })
        .select().single();

      if (!sc) throw new Error("Failed to save scorecard");

      // Save hole scores
      for (const [holeStr, strokes] of Object.entries(scores)) {
        if (!strokes) continue;
        const holeNum = parseInt(holeStr);
        await supabase.from("hole_scores").upsert({
          scorecard_id: sc.id, hole_number: holeNum, strokes,
        }, { onConflict: "scorecard_id,hole_number" });
      }

      if (finish) {
        // Finish round
        await supabase.from("rounds").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", round.id);
        
        // Finalize event — set to done
        await supabase.from("events").update({ status: "done" }).eq("id", eventId!);

        // Update HCP
        const courseRating = (event?.courses as any)?.par ?? 72;
        const oldHcp = profile?.handicap ?? 36;
        const differential = totalStrokes - courseRating;
        const rawNewHcp = Number(oldHcp) + (differential * 0.1);
        const newHcp = Math.min(36, Math.max(0, Math.round(rawNewHcp * 10) / 10));
        if (newHcp !== Number(oldHcp)) {
          await supabase.from("profiles").update({ handicap: newHcp }).eq("id", userId!);
          await supabase.from("handicap_history").insert({
            player_id: userId!, old_hcp: oldHcp, new_hcp: newHcp,
            gross_score: totalStrokes, net_score: netTotal, event_id: eventId!,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["event-leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        queryClient.invalidateQueries({ queryKey: ["event-scorecard", eventId] });
        toast.success(`Round complete! Gross: ${totalStrokes} · Net: ${netTotal}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["event-leaderboard"] });
        toast.success("Progress saved!");
      }
      navigate(`/event/${eventId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (event.status === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center gap-4">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-lg font-bold">Event Completed</p>
        <p className="text-sm text-muted-foreground">Scorecard is locked.</p>
        <Button onClick={() => navigate(`/event/${eventId}`)}>View Results</Button>
      </div>
    );
  }

  const outHoles = (holes ?? []).slice(0, 9);
  const inHoles = (holes ?? []).slice(9, 18);
  const outPar = outHoles.reduce((s, h) => s + (h.par ?? 4), 0);
  const inPar = inHoles.reduce((s, h) => s + (h.par ?? 4), 0);
  const outStrokes = outHoles.reduce((s, h) => s + (getStrokes(h.hole_number) ?? 0), 0);
  const inStrokes = inHoles.reduce((s, h) => s + (getStrokes(h.hole_number) ?? 0), 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border/50 p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{(event.courses as any)?.name ?? event.name}</p>
          <p className="text-xs text-muted-foreground">{event.event_date} · HCP {playerHcp}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{filledCount}/{holesCount} holes</p>
        </div>
      </div>

      {/* Running totals */}
      <div className="grid grid-cols-4 border-b border-border/30 bg-secondary/30">
        {[
          { label: "OUT", val: outStrokes || "—" },
          { label: "IN", val: inStrokes || "—" },
          { label: "GROSS", val: totalStrokes || "—" },
          { label: "NET", val: filledCount > 0 ? netTotal : "—", primary: true },
        ].map(({ label, val, primary }) => (
          <div key={label} className="py-2 text-center">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className={`text-sm font-bold tabular-nums ${primary ? "text-primary" : ""}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Scorecard table */}
      <div className="flex-1 overflow-auto px-3 py-2">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border/50">
              {["Hole", "Par", "SI", "Score", "+/−"].map(h => (
                <th key={h} className="py-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Front 9 */}
            {(holes ?? Array.from({ length: 9 }, (_, i) => ({ hole_number: i + 1, par: 4, si: i + 1 }))).slice(0, 9).map((h, i) => {
              const strokes = getStrokes(h.hole_number);
              const diff = strokes !== null ? strokes - h.par : null;
              return (
                <tr key={h.hole_number} className="border-b border-border/30">
                  <td className="py-2 px-1 text-center text-xs font-bold text-muted-foreground">{h.hole_number}</td>
                  <td className="py-2 px-1 text-center text-xs font-semibold">{h.par}</td>
                  <td className="py-2 px-1 text-center text-xs text-muted-foreground">{h.si ?? "—"}</td>
                  <td className="py-2 px-1 text-center">
                    <input
                      ref={el => { inputRefs.current[h.hole_number - 1] = el; }}
                      type="number" inputMode="numeric" min={1} max={15}
                      value={strokes ?? ""}
                      onChange={e => updateScore(h.hole_number, e.target.value)}
                      className="w-full h-10 rounded-lg bg-secondary border border-border/50 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="—"
                    />
                  </td>
                  <td className={`py-2 px-1 text-center text-xs ${diff === null ? "" : diff < 0 ? "text-primary font-bold" : diff > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {diff === null ? "" : diff === 0 ? "E" : diff > 0 ? `+${diff}` : `${diff}`}
                  </td>
                </tr>
              );
            })}
            {/* OUT subtotal */}
            <tr className="bg-secondary/50 border-b border-border/50">
              <td colSpan={3} className="py-2 px-2 text-xs font-bold uppercase">OUT</td>
              <td className="py-2 px-1 text-center text-sm font-bold">{outStrokes || "—"}</td>
              <td className={`py-2 px-1 text-center text-xs font-bold ${(outStrokes - outPar) > 0 ? "text-destructive" : (outStrokes - outPar) < 0 ? "text-primary" : "text-muted-foreground"}`}>
                {outStrokes ? ((outStrokes - outPar) === 0 ? "E" : (outStrokes - outPar) > 0 ? `+${outStrokes - outPar}` : `${outStrokes - outPar}`) : ""}
              </td>
            </tr>
            {/* Back 9 */}
            {(holes ?? Array.from({ length: 9 }, (_, i) => ({ hole_number: i + 10, par: 4, si: i + 10 }))).slice(9, 18).map((h, i) => {
              const strokes = getStrokes(h.hole_number);
              const diff = strokes !== null ? strokes - h.par : null;
              return (
                <tr key={h.hole_number} className="border-b border-border/30">
                  <td className="py-2 px-1 text-center text-xs font-bold text-muted-foreground">{h.hole_number}</td>
                  <td className="py-2 px-1 text-center text-xs font-semibold">{h.par}</td>
                  <td className="py-2 px-1 text-center text-xs text-muted-foreground">{h.si ?? "—"}</td>
                  <td className="py-2 px-1 text-center">
                    <input
                      ref={el => { inputRefs.current[h.hole_number - 1] = el; }}
                      type="number" inputMode="numeric" min={1} max={15}
                      value={strokes ?? ""}
                      onChange={e => updateScore(h.hole_number, e.target.value)}
                      className="w-full h-10 rounded-lg bg-secondary border border-border/50 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="—"
                    />
                  </td>
                  <td className={`py-2 px-1 text-center text-xs ${diff === null ? "" : diff < 0 ? "text-primary font-bold" : diff > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {diff === null ? "" : diff === 0 ? "E" : diff > 0 ? `+${diff}` : `${diff}`}
                  </td>
                </tr>
              );
            })}
            {/* IN subtotal */}
            <tr className="bg-secondary/50 border-b border-border/50">
              <td colSpan={3} className="py-2 px-2 text-xs font-bold uppercase">IN</td>
              <td className="py-2 px-1 text-center text-sm font-bold">{inStrokes || "—"}</td>
              <td className={`py-2 px-1 text-center text-xs font-bold ${(inStrokes - inPar) > 0 ? "text-destructive" : (inStrokes - inPar) < 0 ? "text-primary" : "text-muted-foreground"}`}>
                {inStrokes ? ((inStrokes - inPar) === 0 ? "E" : (inStrokes - inPar) > 0 ? `+${inStrokes - inPar}` : `${inStrokes - inPar}`) : ""}
              </td>
            </tr>
            {/* TOTAL */}
            <tr className="bg-secondary border-b border-border">
              <td colSpan={3} className="py-2 px-2 text-xs font-bold uppercase">TOTAL</td>
              <td className="py-2 px-1 text-center text-sm font-bold">{totalStrokes || "—"}</td>
              <td className={`py-2 px-1 text-center text-xs font-bold ${(totalStrokes - coursePar) > 0 ? "text-destructive" : (totalStrokes - coursePar) < 0 ? "text-primary" : "text-muted-foreground"}`}>
                {totalStrokes ? ((totalStrokes - coursePar) === 0 ? "E" : (totalStrokes - coursePar) > 0 ? `+${totalStrokes - coursePar}` : `${totalStrokes - coursePar}`) : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom — sticky, always visible */}
      <div className="shrink-0 border-t border-border/50 bg-background p-4 space-y-3">
        <div className="flex gap-3">
          <div className="golf-card flex-1 p-3 text-center">
            <p className="text-2xl font-bold">{totalStrokes || "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross</p>
          </div>
          <div className="golf-card flex-1 p-3 text-center border-primary/30">
            <p className="text-2xl font-bold text-primary">{filledCount > 0 ? netTotal : "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Save Progress — always available if any score entered */}
          <Button
            variant="outline"
            className="flex-1 h-12 text-sm font-bold"
            disabled={submitting || filledCount === 0}
            onClick={() => handleSave(false)}
          >
            {submitting ? "Saving..." : filledCount === 0 ? "Enter scores" : `Save (${filledCount}/${holesCount})`}
          </Button>
          {/* Save & Finish — finalize round */}
          <Button
            className="flex-1 h-12 text-sm font-bold"
            disabled={submitting || filledCount === 0}
            onClick={() => handleSave(true)}
          >
            {submitting ? "..." : "Save & Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScorecardInput;
