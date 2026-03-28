import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface HoleScore {
  hole_number: number;
  strokes: number | null;
  putts: number | null;
  fairway_hit: boolean | null;
  gir: boolean | null;
}

const ScorecardInput = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<HoleScore[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/login", { replace: true });
      else setUserId(user.id);
    });
  }, [navigate]);

  // Auto-register as contestant + set event playing when scorecard opens
  useEffect(() => {
    if (!event || !eventId || !userId) return;

    // Set event to playing if still scheduled/ready
    if (event.status === "scheduled" || event.status === "ready") {
      supabase.from("events").update({ status: "playing" }).eq("id", eventId);
    }

    // Auto-register as contestant if not yet registered
    const autoRegister = async () => {
      const { data: existing } = await supabase
        .from("contestants")
        .select("id")
        .eq("event_id", eventId)
        .eq("player_id", userId)
        .maybeSingle();

      if (!existing) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("handicap")
          .eq("id", userId)
          .single();

        await supabase.from("contestants").insert({
          event_id: eventId,
          player_id: userId,
          hcp: profile?.handicap ?? 0,
          status: "confirmed",
        });

        // Refresh contestant query
        queryClient.invalidateQueries({ queryKey: ["my-contestant", eventId, userId] });
      }
    };

    autoRegister();
  }, [event, eventId, userId]);

  const { data: event } = useQuery({
    queryKey: ["event-scorecard", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(id, name, par, holes_count, course_holes(*))")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: contestant } = useQuery({
    queryKey: ["my-contestant", eventId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestants")
        .select("*, profiles(full_name, handicap)")
        .eq("event_id", eventId!)
        .eq("player_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!userId,
  });

  const { data: existingScorecard } = useQuery({
    queryKey: ["my-scorecard", eventId, userId],
    queryFn: async () => {
      const { data: rounds } = await supabase
        .from("rounds")
        .select("id")
        .eq("course_id", (event?.courses as any)?.id)
        .eq("created_by", userId!);
      if (!rounds || rounds.length === 0) return null;
      const roundIds = rounds.map(r => r.id);
      const { data: sc } = await supabase
        .from("scorecards")
        .select("*, hole_scores(*)")
        .eq("player_id", userId!)
        .in("round_id", roundIds)
        .maybeSingle();
      return sc;
    },
    enabled: !!event && !!userId,
  });

  const { data: eventHolesData } = useQuery({
    queryKey: ["event-holes-scorecard", eventId],
    queryFn: async () => {
      const { data: eventHoles } = await supabase
        .from("event_holes")
        .select("hole_number, par, distance_yards, stroke_index")
        .eq("event_id", eventId!)
        .order("hole_number");
      if (eventHoles && eventHoles.length > 0) {
        return eventHoles.map(h => ({
          hole_number: h.hole_number,
          par: h.par,
          distance_yards: h.distance_yards,
          handicap_index: h.stroke_index,
        }));
      }
      const courseId = (event?.courses as any)?.id;
      if (!courseId) return [];
      const { data: courseHoles } = await supabase
        .from("course_holes")
        .select("hole_number, par, distance_yards, handicap_index")
        .eq("course_id", courseId)
        .order("hole_number");
      return courseHoles ?? [];
    },
    enabled: !!eventId && !!event,
  });

  const holes = useMemo(() => eventHolesData ?? [], [eventHolesData]);
  const holesCount = (event?.courses as any)?.holes_count ?? 18;

  useEffect(() => {
    if (scores.length > 0) return;
    const initial: HoleScore[] = [];
    for (let i = 1; i <= holesCount; i++) {
      initial.push({ hole_number: i, strokes: null, putts: null, fairway_hit: null, gir: null });
    }
    if (existingScorecard?.hole_scores) {
      const existing = existingScorecard.hole_scores as any[];
      existing.forEach(hs => {
        const idx = initial.findIndex(s => s.hole_number === hs.hole_number);
        if (idx >= 0) {
          initial[idx] = {
            hole_number: hs.hole_number,
            strokes: hs.strokes,
            putts: hs.putts,
            fairway_hit: hs.fairway_hit,
            gir: hs.gir,
          };
        }
      });
    }
    setScores(initial);
  }, [holesCount, existingScorecard]);

  const coursePar = (event?.courses as any)?.par ?? 72;
  const playerHcp = contestant?.hcp ?? (contestant?.profiles as any)?.handicap ?? 0;

  const outScores = scores.slice(0, 9);
  const inScores = scores.slice(9, 18);
  const outStrokes = outScores.reduce((sum, s) => sum + (s.strokes ?? 0), 0);
  const inStrokes = inScores.reduce((sum, s) => sum + (s.strokes ?? 0), 0);
  const outPar = holes.slice(0, 9).reduce((sum, h: any) => sum + (h.par ?? 4), 0);
  const inPar = holes.slice(9, 18).reduce((sum, h: any) => sum + (h.par ?? 4), 0);
  const grossTotal = outStrokes + inStrokes;
  const netTotal = Math.max(0, grossTotal - Number(playerHcp));
  const filledHoles = scores.filter(s => s.strokes !== null).length;
  const allFilled = filledHoles === holesCount;

  const updateStroke = (holeIndex: number, value: string) => {
    const num = parseInt(value);
    if (value === "") {
      setScores(prev => prev.map((s, i) => i === holeIndex ? { ...s, strokes: null } : s));
      return;
    }
    if (isNaN(num) || num < 1 || num > 15) return;
    setScores(prev => prev.map((s, i) => i === holeIndex ? { ...s, strokes: num } : s));
    // Auto-advance to next hole
    if (holeIndex < holesCount - 1) {
      setTimeout(() => inputRefs.current[holeIndex + 1]?.focus(), 100);
    }
  };

  const getDiffColor = (strokes: number | null, par: number) => {
    if (strokes === null) return "";
    const diff = strokes - par;
    if (diff < 0) return "text-primary font-bold";
    if (diff > 0) return "text-destructive font-bold";
    return "text-muted-foreground";
  };

  const getDiffText = (strokes: number | null, par: number) => {
    if (strokes === null) return "";
    const diff = strokes - par;
    if (diff === 0) return "E";
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const handleSubmit = async () => {
    if (!userId || !event) return;
    // Ensure contestant exists
    let activeContestant = contestant;
    if (!activeContestant) {
      const { data: fresh } = await supabase
        .from("contestants")
        .select("*, profiles(full_name, handicap)")
        .eq("event_id", eventId!)
        .eq("player_id", userId)
        .maybeSingle();
      activeContestant = fresh;
      if (!activeContestant) {
        toast.error("Contestant not found. Please try again.");
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(true);
    try {
      const courseId = (event.courses as any)?.id;
      let roundId: string;
      const { data: existingRound } = await supabase
        .from("rounds")
        .select("id")
        .eq("course_id", courseId)
        .eq("created_by", userId)
        .maybeSingle();

      if (existingRound) {
        roundId = existingRound.id;
      } else {
        const { data: newRound, error } = await supabase
          .from("rounds")
          .insert({ course_id: courseId, created_by: userId, status: "playing" })
          .select()
          .single();
        if (error) throw error;
        roundId = newRound.id;
        await supabase.from("round_players").insert({ round_id: roundId, user_id: userId });
      }

      const totalPutts = scores.reduce((s, h) => s + (h.putts ?? 0), 0);

      // Try upsert scorecard
      let scorecardId: string;
      const { data: sc, error: scErr } = await supabase
        .from("scorecards")
        .upsert({
          round_id: roundId,
          player_id: userId,
          course_id: courseId,
          total_score: grossTotal,
          gross_score: grossTotal,
          net_score: netTotal,
          total_putts: totalPutts,
        }, { onConflict: "round_id,player_id" })
        .select()
        .single();

      if (scErr) {
        const { data: existSc } = await supabase
          .from("scorecards")
          .select("id")
          .eq("round_id", roundId)
          .eq("player_id", userId)
          .maybeSingle();

        if (existSc) {
          scorecardId = existSc.id;
          await supabase.from("scorecards").update({
            total_score: grossTotal, gross_score: grossTotal, net_score: netTotal, total_putts: totalPutts,
          }).eq("id", scorecardId);
        } else {
          const { data: newSc, error: insertErr } = await supabase
            .from("scorecards")
            .insert({
              round_id: roundId, player_id: userId, course_id: courseId,
              total_score: grossTotal, gross_score: grossTotal, net_score: netTotal, total_putts: totalPutts,
            })
            .select().single();
          if (insertErr) throw insertErr;
          scorecardId = newSc.id;
        }
      } else {
        scorecardId = sc.id;
      }

      // Save hole scores
      for (const s of scores) {
        if (s.strokes === null) continue;
        const { error: hsErr } = await supabase.from("hole_scores").upsert({
          scorecard_id: scorecardId,
          hole_number: s.hole_number,
          strokes: s.strokes,
          putts: s.putts,
          fairway_hit: s.fairway_hit,
          gir: s.gir,
        }, { onConflict: "scorecard_id,hole_number" });

        if (hsErr) {
          await supabase.from("hole_scores")
            .delete()
            .eq("scorecard_id", scorecardId)
            .eq("hole_number", s.hole_number);
          await supabase.from("hole_scores").insert({
            scorecard_id: scorecardId,
            hole_number: s.hole_number,
            strokes: s.strokes,
            putts: s.putts,
            fairway_hit: s.fairway_hit,
            gir: s.gir,
          });
        }
      }

      if (allFilled) {
        await supabase.from("rounds").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", roundId);
      }

      // === HCP Update (Simple Formula) ===
      const courseRating = (event?.courses as any)?.course_rating ?? (event?.courses as any)?.par ?? 72;
      const oldHcp = (contestant?.profiles as any)?.handicap ?? 36;
      const differential = grossTotal - courseRating;
      const rawNewHcp = Number(oldHcp) + (differential * 0.1);
      const newHcp = Math.min(36, Math.max(0, Math.round(rawNewHcp * 10) / 10));

      if (newHcp !== Number(oldHcp)) {
        await supabase.from("profiles")
          .update({ handicap: newHcp })
          .eq("id", userId);

        await supabase.from("handicap_history").insert({
          player_id: userId,
          old_hcp: oldHcp,
          new_hcp: newHcp,
          gross_score: grossTotal,
          net_score: netTotal,
          event_id: eventId!,
        });
      }
      // === End HCP Update ===

      queryClient.invalidateQueries({ queryKey: ["event-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile-casual"] });
      toast.success(`Scorecard saved! HCP: ${oldHcp} → ${newHcp}`);
      navigate(`/event/${eventId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save scorecard");
    } finally {
      setSubmitting(false);
    }
  };

  const isEventCompleted = event?.status === "done";

  if (!event || scores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading scorecard...</p>
      </div>
    );
  }

  // Completed event — read-only view
  if (isEventCompleted) {
    const myScorecard = existingScorecard;
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold">{event?.name ?? "Event"}</p>
            <p className="text-xs text-muted-foreground">{(event?.courses as any)?.name}</p>
          </div>
          <div className="w-8" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold">Event Completed</p>
            <p className="text-sm text-muted-foreground mt-1">Scorecard is locked and cannot be edited.</p>
          </div>
          {myScorecard && (
            <div className="golf-card w-full max-w-xs p-4 mt-2">
              <p className="text-xs text-muted-foreground mb-3 text-center">Your Final Score</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{myScorecard.gross_score ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">GROSS</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{myScorecard.net_score ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">NET</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{myScorecard.total_putts ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">PUTTS</p>
                </div>
              </div>
            </div>
          )}
          <Button className="mt-2" onClick={() => navigate(`/event/${eventId}`)}>View Leaderboard</Button>
        </div>
      </div>
    );
  }

  // Grid row component
  const HoleRow = ({ holeIndex }: { holeIndex: number }) => {
    const s = scores[holeIndex];
    const holeData = holes.find((h: any) => h.hole_number === holeIndex + 1);
    const par = holeData?.par ?? 4;
    const si = holeData?.handicap_index;
    return (
      <tr className="border-b border-border/30">
        <td className="py-2.5 px-2 text-center text-xs font-bold text-muted-foreground w-10">{holeIndex + 1}</td>
        <td className="py-2.5 px-2 text-center text-xs font-semibold w-10">{par}</td>
        <td className="py-2.5 px-2 text-center text-xs text-muted-foreground w-10">{si ?? "—"}</td>
        <td className="py-2.5 px-1 text-center w-16">
          <input
            ref={(el) => { inputRefs.current[holeIndex] = el; }}
            type="number"
            inputMode="numeric"
            min={1}
            max={15}
            value={s?.strokes ?? ""}
            onChange={(e) => updateStroke(holeIndex, e.target.value)}
            className="w-full h-10 rounded-lg bg-secondary border border-border/50 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="—"
          />
        </td>
        <td className={`py-2.5 px-2 text-center text-xs w-10 ${getDiffColor(s?.strokes ?? null, par)}`}>
          {getDiffText(s?.strokes ?? null, par)}
        </td>
      </tr>
    );
  };

  const SubtotalRow = ({ label, totalStrokes, totalPar }: { label: string; totalStrokes: number; totalPar: number }) => {
    const diff = totalStrokes - totalPar;
    const hasScores = totalStrokes > 0;
    return (
      <tr className="bg-secondary/50 border-b border-border/50">
        <td colSpan={3} className="py-2 px-2 text-xs font-bold uppercase tracking-wider">{label}</td>
        <td className="py-2 px-1 text-center text-sm font-bold">{hasScores ? totalStrokes : "—"}</td>
        <td className={`py-2 px-2 text-center text-xs font-bold ${diff > 0 ? "text-destructive" : diff < 0 ? "text-primary" : "text-muted-foreground"}`}>
          {hasScores ? (diff === 0 ? "E" : diff > 0 ? `+${diff}` : `${diff}`) : ""}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{(event.courses as any)?.name}</p>
            <p className="text-xs text-muted-foreground">
              {event.event_date} · HCP {playerHcp}
            </p>
          </div>
        </div>
      </div>

      {/* Live running total sub-header */}
      <div className="flex items-center justify-around border-b border-border/30 bg-secondary/30 py-2 px-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">OUT</p>
          <p className="text-sm font-bold tabular-nums">{outStrokes || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">IN</p>
          <p className="text-sm font-bold tabular-nums">{inStrokes || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">GROSS</p>
          <p className="text-sm font-bold tabular-nums">{grossTotal || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">NET</p>
          <p className="text-sm font-bold tabular-nums text-primary">{filledHoles > 0 ? netTotal : "—"}</p>
        </div>
      </div>

      {/* Scorecard Grid */}
      <div className="flex-1 overflow-auto px-3 py-2">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-border/50">
              <th className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center w-10">Hole</th>
              <th className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center w-10">Par</th>
              <th className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center w-10">SI</th>
              <th className="py-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground text-center w-16">Score</th>
              <th className="py-2 px-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center w-10">+/−</th>
            </tr>
          </thead>
          <tbody>
            {/* Front 9 */}
            {Array.from({ length: Math.min(9, holesCount) }).map((_, i) => (
              <HoleRow key={i} holeIndex={i} />
            ))}
            {holesCount >= 9 && (
              <SubtotalRow label="OUT" totalStrokes={outStrokes} totalPar={outPar} />
            )}
            {/* Back 9 */}
            {holesCount > 9 && Array.from({ length: Math.min(9, holesCount - 9) }).map((_, i) => (
              <HoleRow key={i + 9} holeIndex={i + 9} />
            ))}
            {holesCount > 9 && (
              <>
                <SubtotalRow label="IN" totalStrokes={inStrokes} totalPar={inPar} />
                <SubtotalRow label="TOTAL" totalStrokes={grossTotal} totalPar={outPar + inPar} />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom section */}
      <div className="border-t border-border/50 bg-background p-4 space-y-3">
        <div className="flex gap-3">
          <div className="golf-card flex-1 p-3 text-center">
            <p className="text-2xl font-bold">{grossTotal || "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross</p>
          </div>
          <div className="golf-card flex-1 p-3 text-center border-primary/30">
            <p className="text-2xl font-bold text-primary">{filledHoles > 0 ? netTotal : "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Net</p>
          </div>
        </div>
        <Button
          className="w-full h-12 text-sm font-bold"
          disabled={!allFilled || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Saving..." : allFilled ? "Save Scorecard" : `Enter all ${holesCount} holes to save (${filledHoles}/${holesCount})`}
        </Button>
      </div>
    </div>
  );
};

export default ScorecardInput;
