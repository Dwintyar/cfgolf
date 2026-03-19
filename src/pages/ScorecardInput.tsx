import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Trophy, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  const [currentHole, setCurrentHole] = useState(1);
  const [scores, setScores] = useState<HoleScore[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Load existing scorecard
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

  // Fetch event_holes snapshot first, fallback to course_holes
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

      // Fallback to course_holes
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

  const holes = useMemo(() => {
    return eventHolesData ?? [];
  }, [eventHolesData]);

  const holesCount = (event?.courses as any)?.holes_count ?? 18;

  // Initialize scores
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

  const currentScore = scores[currentHole - 1];
  const currentHoleData = holes.find((h: any) => h.hole_number === currentHole);
  const holePar = currentHoleData?.par ?? 4;
  const holeYards = currentHoleData?.distance_yards;
  const holeHcp = currentHoleData?.handicap_index;

  const updateScore = (field: keyof HoleScore, value: any) => {
    setScores(prev => prev.map((s, i) => i === currentHole - 1 ? { ...s, [field]: value } : s));
  };

  const filledHoles = scores.filter(s => s.strokes !== null).length;
  const allFilled = filledHoles === holesCount;
  const coursePar = (event?.courses as any)?.par ?? 72;
  const playerHcp = contestant?.hcp ?? (contestant?.profiles as any)?.handicap ?? 0;

  const outStrokes = scores.slice(0, 9).reduce((sum, s) => sum + (s.strokes ?? 0), 0);
  const inStrokes = scores.slice(9).reduce((sum, s) => sum + (s.strokes ?? 0), 0);
  const grossTotal = outStrokes + inStrokes;
  const netTotal = grossTotal - Number(playerHcp);
  const toPar = grossTotal - coursePar;

  const getHoleDotColor = (s: HoleScore, idx: number) => {
    if (s.strokes === null) return "bg-muted text-muted-foreground";
    const par = holes.find((h: any) => h.hole_number === idx + 1)?.par ?? 4;
    const diff = s.strokes - par;
    if (diff <= -2) return "bg-primary text-primary-foreground"; // eagle+
    if (diff === -1) return "bg-primary/70 text-primary-foreground"; // birdie
    if (diff === 0) return "bg-foreground/20 text-foreground"; // par
    if (diff === 1) return "bg-yellow-600 text-white"; // bogey
    return "bg-destructive text-destructive-foreground"; // double+
  };

  const quickScore = (label: string) => {
    const offsets: Record<string, number> = { Eagle: -2, Birdie: -1, Par: 0, Bogey: 1, "Dbl+": 2 };
    const val = holePar + (offsets[label] ?? 0);
    updateScore("strokes", Math.max(1, val));
  };

  const handleSubmit = async () => {
    if (!userId || !event || !contestant) return;
    setSubmitting(true);
    try {
      const courseId = (event.courses as any)?.id;

      // Find or create round
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

        // Add as round player
        await supabase.from("round_players").insert({ round_id: roundId, user_id: userId });
      }

      // Upsert scorecard
      const totalPutts = scores.reduce((s, h) => s + (h.putts ?? 0), 0);
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
        // If conflict not on unique, try insert directly
        const { data: existSc } = await supabase
          .from("scorecards")
          .select("id")
          .eq("round_id", roundId)
          .eq("player_id", userId)
          .maybeSingle();

        let scorecardId: string;
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

        // Save hole scores
        for (const s of scores) {
          if (s.strokes === null) continue;
          await supabase.from("hole_scores").upsert({
            scorecard_id: scorecardId,
            hole_number: s.hole_number,
            strokes: s.strokes,
            putts: s.putts,
            fairway_hit: s.fairway_hit,
            gir: s.gir,
          }, { onConflict: "scorecard_id,hole_number" }).then(async ({ error }) => {
            if (error) {
              // Delete and re-insert
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
          });
        }
      } else {
        const scorecardId = sc.id;
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
      }

      // Update round status
      if (allFilled) {
        await supabase.from("rounds").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", roundId);
      }

      // Check if all contestants have submitted scorecards
      const { data: allContestants } = await supabase
        .from("contestants")
        .select("id")
        .eq("event_id", eventId!)
        .eq("status", "competitor");

      const contestantIds = allContestants?.map(c => c.id) ?? [];
      const totalContestants = contestantIds.length;

      // Count scorecards that exist for these contestants' players
      // We check rounds completed for this course
      let totalSubmitted = 0;
      if (totalContestants > 0) {
        const { count } = await supabase
          .from("rounds")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("status", "completed");
        totalSubmitted = count ?? 0;
      }

      queryClient.invalidateQueries({ queryKey: ["event-leaderboard"] });

      if (allFilled && totalSubmitted >= totalContestants && totalContestants > 0) {
        toast.success(
          `Scorecard tersimpan! Semua ${totalContestants} peserta sudah submit. Event siap di-finalize oleh admin.`,
          { duration: 5000 }
        );
      } else if (allFilled) {
        toast.success(`Scorecard submitted! (${totalSubmitted}/${totalContestants} peserta selesai)`);
      } else {
        toast.success("Scorecard saved!");
      }
      navigate(`/event/${eventId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save scorecard");
    } finally {
      setSubmitting(false);
    }
  };

  const isEventCompleted = event?.status === "completed";

  if (!event || !contestant || scores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading scorecard...</p>
      </div>
    );
  }

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
            <p className="text-xs text-muted-foreground">
              {(event?.courses as any)?.name}
            </p>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-base font-bold">Event Selesai</p>
            <p className="text-sm text-muted-foreground mt-1">
              Event ini sudah di-finalize. Scorecard tidak bisa diubah.
            </p>
          </div>

          {myScorecard && (
            <div className="golf-card w-full max-w-xs p-4 mt-2">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Skor Akhir Anda
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{myScorecard.gross_score ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">GROSS</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {myScorecard.net_score ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">NET</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {myScorecard.total_putts ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">PUTTS</p>
                </div>
              </div>
            </div>
          )}

          <Button
            className="mt-2"
            onClick={() => navigate(`/event/${eventId}`)}
          >
            Lihat Leaderboard
          </Button>
          <Button
            variant="outline"
            className="mt-2 gap-2"
            onClick={async () => {
              try {
                const { data: holeScores } = await supabase
                  .from("hole_scores")
                  .select("*")
                  .eq("scorecard_id", myScorecard?.id ?? "")
                  .order("hole_number");

                const content = document.createElement("div");
                content.style.cssText = `width:800px;padding:40px;background:white;font-family:sans-serif;color:#1a1a1a;`;
                const outScore = holeScores?.slice(0,9).reduce((s,h) => s + (h.strokes ?? 0), 0) ?? 0;
                const inScore = holeScores?.slice(9).reduce((s,h) => s + (h.strokes ?? 0), 0) ?? 0;
                content.innerHTML = `
                  <div style="border-bottom:2px solid #1a6b3c;padding-bottom:16px;margin-bottom:20px">
                    <h1 style="font-size:20px;font-weight:700;color:#1a6b3c;margin:0">${event?.name}</h1>
                    <p style="color:#666;margin:4px 0;font-size:13px">${event?.event_date} · ${(event?.courses as any)?.name}</p>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead><tr style="background:#1a6b3c;color:white">
                      <th style="padding:6px 8px">Hole</th>
                      ${holeScores?.map(h => `<th style="padding:6px 4px;text-align:center">${h.hole_number}</th>`).join('')}
                      <th style="padding:6px 8px">Total</th>
                    </tr></thead>
                    <tbody><tr style="background:#f0f9f4">
                      <td style="padding:6px 8px;font-weight:600">Score</td>
                      ${holeScores?.map(h => `<td style="padding:6px 4px;text-align:center">${h.strokes ?? '-'}</td>`).join('')}
                      <td style="padding:6px 8px;font-weight:700">${myScorecard?.gross_score ?? '-'}</td>
                    </tr></tbody>
                  </table>
                  <div style="display:flex;gap:24px;margin-top:20px;padding:16px;background:#f9f9f9;border-radius:8px">
                    <div><strong>OUT:</strong> ${outScore}</div>
                    <div><strong>IN:</strong> ${inScore}</div>
                    <div><strong>Gross:</strong> ${myScorecard?.gross_score}</div>
                    <div><strong>Net:</strong> ${myScorecard?.net_score}</div>
                    <div><strong>HCP:</strong> ${contestant?.hcp ?? '-'}</div>
                  </div>
                  <p style="font-size:11px;color:#999;text-align:center;margin-top:24px">CFGolf · ${new Date().toLocaleDateString('id-ID')}</p>
                `;
                document.body.appendChild(content);
                const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff' });
                document.body.removeChild(content);
                const link = document.createElement("a");
                link.download = `scorecard-${event?.name}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                toast.success("Scorecard tersimpan!");
              } catch (err: any) {
                toast.error("Gagal: " + err.message);
              }
            }}
          >
            <Download className="h-4 w-4" />
            Simpan Scorecard
          </Button>

          {myScorecard && (
            <Button
              variant="outline"
              className="gap-2 bg-green-600/10 border-green-600/30 text-green-500 hover:bg-green-600/20"
              onClick={() => {
                const text = `🏌️ Baru selesai main golf!\n\n` +
                  `📍 ${(event?.courses as any)?.name}\n` +
                  `📅 ${event?.event_date}\n\n` +
                  `🎯 GROSS: ${myScorecard.gross_score}\n` +
                  `🏆 NET: ${myScorecard.net_score}\n` +
                  `⛳ PUTTS: ${myScorecard.total_putts}\n\n` +
                  `Main bareng? cfgolf.lovable.app`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
              }}
            >
              💬 Share ke WhatsApp
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center flex-1">
            <p className="text-sm font-bold truncate">{event.name}</p>
            <p className="text-xs text-muted-foreground">{(contestant.profiles as any)?.full_name}</p>
          </div>
          <Button size="sm" className="h-8 gap-1 text-xs" onClick={handleSubmit} disabled={submitting}>
            <Check className="h-3 w-3" /> {submitting ? "…" : "Save"}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs">
          <span className={`font-bold ${toPar > 0 ? "text-destructive" : toPar < 0 ? "text-primary" : "text-foreground"}`}>
            {toPar > 0 ? `+${toPar}` : toPar === 0 ? "E" : toPar}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{grossTotal} strokes</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Hole {currentHole} of {holesCount}</span>
        </div>
      </div>

      {/* Hole Navigation Dots */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1 justify-center flex-wrap">
          {scores.slice(0, 9).map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentHole(i + 1)}
              className={`h-7 w-7 rounded-full text-[10px] font-bold transition-all ${
                currentHole === i + 1 ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              } ${getHoleDotColor(s, i)}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {holesCount > 9 && (
          <div className="flex items-center gap-1 justify-center flex-wrap mt-1.5">
            {scores.slice(9, 18).map((s, i) => (
              <button
                key={i + 9}
                onClick={() => setCurrentHole(i + 10)}
                className={`h-7 w-7 rounded-full text-[10px] font-bold transition-all ${
                  currentHole === i + 10 ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                } ${getHoleDotColor(s, i + 9)}`}
              >
                {i + 10}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hole Detail Panel */}
      <div className="flex-1 px-4 space-y-5">
        {/* Hole info */}
        <div className="text-center">
          <p className="text-5xl font-bold text-primary">{currentHole}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Par {holePar}
            {holeYards ? ` · ${holeYards} yd` : ""}
            {holeHcp ? ` · HCP ${holeHcp}` : ""}
          </p>
        </div>

        {/* Stroke Counter */}
        <div className="golf-card p-4">
          <p className="text-xs text-muted-foreground text-center mb-3">Strokes</p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => updateScore("strokes", Math.max(1, (currentScore?.strokes ?? holePar) - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xl font-bold hover:bg-muted transition-colors"
            >
              −
            </button>
            <span className="text-4xl font-bold w-16 text-center">{currentScore?.strokes ?? "—"}</span>
            <button
              onClick={() => updateScore("strokes", Math.min(12, (currentScore?.strokes ?? holePar) + 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xl font-bold hover:bg-muted transition-colors"
            >
              +
            </button>
          </div>

          {/* Quick shortcuts */}
          <div className="flex gap-1.5 mt-4 justify-center">
            {["Eagle", "Birdie", "Par", "Bogey", "Dbl+"].map(label => (
              <button
                key={label}
                onClick={() => quickScore(label)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  currentScore?.strokes === holePar + ({ Eagle: -2, Birdie: -1, Par: 0, Bogey: 1, "Dbl+": 2 }[label] ?? 0)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Putts Counter */}
        <div className="golf-card p-4">
          <p className="text-xs text-muted-foreground text-center mb-2">Putts</p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => updateScore("putts", Math.max(0, (currentScore?.putts ?? 2) - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg font-bold"
            >
              −
            </button>
            <span className="text-2xl font-bold w-12 text-center">{currentScore?.putts ?? "—"}</span>
            <button
              onClick={() => updateScore("putts", Math.min(6, (currentScore?.putts ?? 2) + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-3">
          {holePar >= 4 && (
            <div className="golf-card flex-1 p-3 flex items-center justify-between">
              <span className="text-xs font-medium">Fairway Hit</span>
              <Switch
                checked={currentScore?.fairway_hit ?? false}
                onCheckedChange={(v) => updateScore("fairway_hit", v)}
              />
            </div>
          )}
          <div className="golf-card flex-1 p-3 flex items-center justify-between">
            <span className="text-xs font-medium">GIR</span>
            <Switch
              checked={currentScore?.gir ?? false}
              onCheckedChange={(v) => updateScore("gir", v)}
            />
          </div>
        </div>

        {/* Prev/Next */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
            disabled={currentHole === 1}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => setCurrentHole(Math.min(holesCount, currentHole + 1))}
            disabled={currentHole === holesCount}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      <div className="sticky bottom-0 border-t border-border/50 bg-background/95 backdrop-blur p-3">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">OUT</p>
            <p className="text-sm font-bold">{outStrokes || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">IN</p>
            <p className="text-sm font-bold">{inStrokes || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">GROSS</p>
            <p className="text-sm font-bold">{grossTotal || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">NET</p>
            <p className="text-sm font-bold">{netTotal || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">TO PAR</p>
            <p className={`text-sm font-bold ${toPar > 0 ? "text-destructive" : toPar < 0 ? "text-primary" : ""}`}>
              {filledHoles > 0 ? (toPar > 0 ? `+${toPar}` : toPar === 0 ? "E" : toPar) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardInput;
