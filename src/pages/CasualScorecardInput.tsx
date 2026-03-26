import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface HoleScore {
  hole_number: number;
  strokes: number | null;
  putts: number | null;
  fairway_hit: boolean | null;
  gir: boolean | null;
}

const CasualScorecardInput = () => {
  const { courseId } = useParams<{ courseId: string }>();
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

  const { data: course } = useQuery({
    queryKey: ["course-casual", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, par, holes_count, location")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile-casual", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handicap, full_name")
        .eq("id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const { data: holesData } = useQuery({
    queryKey: ["course-holes-casual", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_holes")
        .select("hole_number, par, distance_yards, handicap_index")
        .eq("course_id", courseId!)
        .order("hole_number");
      return data ?? [];
    },
    enabled: !!courseId,
  });

  const holes = useMemo(() => holesData ?? [], [holesData]);
  const holesCount = course?.holes_count ?? 18;
  const playerHcp = profile?.handicap ?? 0;

  useEffect(() => {
    if (scores.length > 0 || !course) return;
    const initial: HoleScore[] = [];
    for (let i = 1; i <= holesCount; i++) {
      initial.push({ hole_number: i, strokes: null, putts: null, fairway_hit: null, gir: null });
    }
    setScores(initial);
  }, [holesCount, course]);

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
    if (!userId || !courseId) return;
    setSubmitting(true);
    try {
      const { data: newRound, error } = await supabase
        .from("rounds")
        .insert({ course_id: courseId, created_by: userId, status: "completed", finished_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      const roundId = newRound.id;

      await supabase.from("round_players").insert({ round_id: roundId, user_id: userId });

      const totalPutts = scores.reduce((s, h) => s + (h.putts ?? 0), 0);
      const { data: sc, error: scErr } = await supabase
        .from("scorecards")
        .insert({
          round_id: roundId,
          player_id: userId,
          course_id: courseId,
          total_score: grossTotal,
          gross_score: grossTotal,
          net_score: netTotal,
          total_putts: totalPutts,
        })
        .select()
        .single();
      if (scErr) throw scErr;

      for (const s of scores) {
        if (s.strokes === null) continue;
        await supabase.from("hole_scores").insert({
          scorecard_id: sc.id,
          hole_number: s.hole_number,
          strokes: s.strokes,
          putts: s.putts,
          fairway_hit: s.fairway_hit,
          gir: s.gir,
        });
      }

      // === HCP Update (Simple Formula) ===
      // Score Differential = Gross - Course Rating
      // New HCP = Old HCP + (Differential × 0.1), capped 0–36
      const courseRating = course?.course_rating ?? course?.par ?? 72;
      const oldHcp = profile?.handicap ?? 36;
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
          event_id: courseId, // using course_id as reference for casual rounds
        });
      }
      // === End HCP Update ===

      toast.success(`Scorecard saved! HCP: ${oldHcp} → ${newHcp}`);
      navigate("/play");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (!course || scores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Memuat scorecard...</p>
      </div>
    );
  }

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
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{course.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · HCP {playerHcp}
            </p>
          </div>
        </div>
      </div>

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
            {Array.from({ length: Math.min(9, holesCount) }).map((_, i) => (
              <HoleRow key={i} holeIndex={i} />
            ))}
            {holesCount >= 9 && (
              <SubtotalRow label="OUT" totalStrokes={outStrokes} totalPar={outPar} />
            )}
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
          {submitting ? "Saving..." : allFilled ? "Save Scorecard" : `Enter all ${holesCount} holes (${filledHoles}/${holesCount})`}
        </Button>
      </div>
    </div>
  );
};

export default CasualScorecardInput;
