import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, UserCheck, ChevronDown, ChevronUp, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { lazy, Suspense } from "react";
const InvoiceModal = lazy(() => import("@/components/invoice/InvoiceModal"));
import type { InvoiceData } from "@/components/invoice/InvoiceModal";

function parseNotesCount(notes: string | null, key: string): number {
  if (!notes) return 1;
  const match = notes.match(new RegExp(`${key}:\\s*(\\d+)`, "i"));
  return match ? parseInt(match[1]) : 1;
}

function parseNotesPairs(notes: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!notes) return result;
  notes.split("|").forEach(segment => {
    const idx = segment.indexOf(":");
    if (idx > -1) {
      const k = segment.slice(0, idx).trim();
      const v = segment.slice(idx + 1).trim();
      if (k) result[k] = v;
    }
  });
  return result;
}

const VenueScheduleTab = ({ clubId }: { clubId: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scheduleTab, setScheduleTab] = useState<"upcoming" | "completed">("upcoming");
  const [expandedAssign, setExpandedAssign] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [assignForm, setAssignForm] = useState<Record<string, { caddies: string[]; cartNumbers: string }>>({});
  const [savingAssign, setSavingAssign] = useState<string | null>(null);

  const { data: courses } = useQuery({
    queryKey: ["venue-courses-list", clubId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name").eq("club_id", clubId);
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const courseIds = (courses ?? []).map((c: any) => c.id);

  const { data: allCaddies } = useQuery({
    queryKey: ["venue-caddies", courseIds.join(",")],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const { data } = await supabase
        .from("course_caddies")
        .select("id, name, caddy_number, course_id")
        .in("course_id", courseIds)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    enabled: courseIds.length > 0,
  });

  const { data: pendingBookings, refetch: refetchPending } = useQuery({
    queryKey: ["venue-pending-bookings", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("venue_bookings")
        .select("*, courses(name), profiles!requested_by(full_name, avatar_url), clubs!organizer_club_id(name, logo_url)")
        .eq("venue_club_id", clubId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const { data: confirmedBookings, refetch: refetchConfirmed } = useQuery({
    queryKey: ["venue-confirmed-bookings", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("venue_bookings")
        .select("*, courses(name), profiles!requested_by(full_name, avatar_url), clubs!organizer_club_id(name, logo_url)")
        .eq("venue_club_id", clubId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const handleBookingAction = async (bookingId: string, action: "confirmed" | "declined" | "ready") => {
    await supabase.from("venue_bookings").update({ status: action }).eq("id", bookingId);
    const { data: booking } = await supabase
      .from("venue_bookings").select("requested_by, courses(name)").eq("id", bookingId).single();
    if (booking?.requested_by) {
      const messages: Record<string, string> = {
        confirmed: `Your booking at ${(booking.courses as any)?.name} has been confirmed! ✅`,
        declined:  `Your booking at ${(booking.courses as any)?.name} was declined.`,
        ready:     `Your booking at ${(booking.courses as any)?.name} is READY! 🏌️ Everything is set for your round.`,
      };
      await supabase.from("notifications").insert({
        user_id: booking.requested_by,
        title: action === "confirmed" ? "Booking Confirmed" : action === "declined" ? "Booking Declined" : "Ready to Play!",
        message: messages[action],
        type: "booking",
      });
    }
    refetchPending();
    refetchConfirmed();
  };

  const handleSaveAssignment = async (bookingId: string) => {
    const form = assignForm[bookingId];
    if (!form) return;
    setSavingAssign(bookingId);
    const { error } = await supabase.from("venue_bookings").update({
      assigned_caddies: form.caddies.filter(Boolean).join(", ") || null,
      assigned_cart_numbers: form.cartNumbers.trim() || null,
    }).eq("id", bookingId);
    setSavingAssign(null);
    if (error) {
      toast({ title: "Failed to save assignment", variant: "destructive" });
    } else {
      toast({ title: "Assignment saved ✓" });
      setExpandedAssign(null);
      refetchConfirmed();
    }
  };

  const initAssignForm = (booking: any) => {
    if (expandedAssign === booking.id) { setExpandedAssign(null); return; }
    const caddyCount = parseNotesCount(booking.notes, "Caddies");
    const existingCaddies = (booking.assigned_caddies ?? "").split(",").map((s: string) => s.trim());
    const caddies = Array.from({ length: Math.max(caddyCount, 1) }, (_, i) => existingCaddies[i] ?? "");
    setAssignForm(prev => ({
      ...prev,
      [booking.id]: { caddies, cartNumbers: booking.assigned_cart_numbers ?? "" },
    }));
    setExpandedAssign(booking.id);
  };

  const { data: events, isLoading } = useQuery({
    queryKey: ["venue-schedule", clubId, courseIds.join(",")],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const { data } = await supabase
        .from("events")
        .select(`id, name, event_date, status, course_id, courses(name),
          tours(name, organizer_club_id, clubs!tours_organizer_club_id_fkey(name, logo_url)),
          contestants(count)`)
        .in("course_id", courseIds)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
    enabled: courseIds.length > 0,
  });

  const upcomingEvents  = (events ?? []).filter((e: any) => ["scheduled","ready","playing"].includes(e.status));
  const completedEvents = (events ?? []).filter((e: any) => e.status === "done");
  const displayEvents   = scheduleTab === "upcoming" ? upcomingEvents : completedEvents;

  const statusColor: Record<string, string> = {
    scheduled: "border-blue-400/40 text-blue-400 bg-blue-400/5",
    ready:     "border-accent/40 text-accent bg-accent/5",
    playing:   "border-green-500/40 text-green-400 bg-green-500/5",
    done:      "border-primary/40 text-primary bg-primary/5",
  };

  return (
    <>
      <div>
      {/* ── PENDING ── */}
      {(pendingBookings?.length ?? 0) > 0 && (
        <div>
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              🔔 Pending Requests ({pendingBookings!.length})
            </p>
          </div>
          {pendingBookings!.map((booking: any) => {
            const pairs = parseNotesPairs(booking.notes);
            return (
              <div key={booking.id} className="px-4 py-3 border-b border-border/30 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                    {booking.clubs?.logo_url
                      ? <img src={booking.clubs.logo_url} className="h-full w-full object-cover" />
                      : <span className="text-lg">🏌️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{booking.clubs?.name ?? booking.profiles?.full_name ?? "Unknown"}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {["Date","Time","Players","Caddies","Carts"].map(k => pairs[k] && (
                        <span key={k} className="text-[11px] text-muted-foreground">
                          {k}: <span className="text-foreground font-medium">{pairs[k]}</span>
                        </span>
                      ))}
                    </div>
                    {pairs["Notes"] && <p className="text-xs text-muted-foreground mt-1 italic">"{pairs["Notes"]}"</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1 h-8 text-xs"
                    onClick={() => handleBookingAction(booking.id, "confirmed")}>✓ Confirm</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleBookingAction(booking.id, "declined")}>✗ Decline</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CONFIRMED ── */}
      {(confirmedBookings?.length ?? 0) > 0 && (
        <div>
          <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20">
            <p className="text-xs font-bold text-green-500 uppercase tracking-wider">
              ✅ Confirmed — Assign & Set Ready ({confirmedBookings!.length})
            </p>
          </div>
          {confirmedBookings!.map((booking: any) => {
            const pairs        = parseNotesPairs(booking.notes);
            const caddyCount   = parseNotesCount(booking.notes, "Caddies");
            const isExpanded   = expandedAssign === booking.id;
            const form         = assignForm[booking.id];
            const hasAssign    = booking.assigned_caddies || booking.assigned_cart_numbers;
            const courseCaddies = (allCaddies ?? []).filter((c: any) => c.course_id === booking.course_id);

            return (
              <div key={booking.id} className="border-b border-border/30 bg-green-500/5">
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {booking.clubs?.logo_url
                        ? <img src={booking.clubs.logo_url} className="h-full w-full object-cover" />
                        : <span className="text-lg">🏌️</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{booking.clubs?.name ?? booking.profiles?.full_name ?? "Guest"}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {["Date","Time","Players","Caddies","Carts"].map(k => pairs[k] && (
                          <span key={k} className="text-[11px] text-muted-foreground">
                            {k}: <span className="text-foreground font-medium">{pairs[k]}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Assignment summary */}
                  {hasAssign && !isExpanded && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 space-y-0.5">
                      {booking.assigned_caddies && (
                        <p className="text-xs text-green-300"><span className="font-semibold">Caddies:</span> {booking.assigned_caddies}</p>
                      )}
                      {booking.assigned_cart_numbers && (
                        <p className="text-xs text-green-300"><span className="font-semibold">Carts:</span> {booking.assigned_cart_numbers}</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline"
                      className={`flex-1 h-8 text-xs gap-1 ${isExpanded ? "border-primary/40 text-primary" : ""}`}
                      onClick={() => initAssignForm(booking)}>
                      <UserCheck className="h-3.5 w-3.5" />
                      {hasAssign ? "Edit" : "Assign"}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleBookingAction(booking.id, "ready")}>
                      🏁 Set Ready
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0"
                      title="Invoice"
                      onClick={() => setInvoiceData({
                        type: "venue",
                        bookingId: booking.id,
                        venueName: booking.clubs?.name ?? booking.profiles?.full_name,
                        courseName: (booking.courses as any)?.name,
                        organizerClub: booking.clubs?.name,
                        requesterName: booking.profiles?.full_name,
                        bookingNotes: booking.notes,
                        assignedCaddies: booking.assigned_caddies,
                        assignedCarts: booking.assigned_cart_numbers,
                        greenFeeAgreed: booking.green_fee_agreed,
                        status: booking.status,
                        createdAt: booking.created_at,
                      })}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Assign form */}
                {isExpanded && form && (
                  <div className="px-4 pb-4 space-y-3 border-t border-green-500/20 pt-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Caddies ({caddyCount} needed)
                      </p>
                      {form.caddies.map((val, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14 shrink-0">#{i + 1}</span>
                          {courseCaddies.length > 0 ? (
                            <select
                              value={val}
                              onChange={e => {
                                const updated = [...form.caddies];
                                updated[i] = e.target.value;
                                setAssignForm(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], caddies: updated } }));
                              }}
                              className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">— Pilih caddy —</option>
                              {courseCaddies.map((c: any) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}{c.caddy_number ? ` (#${c.caddy_number})` : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input type="text" value={val} placeholder="Nama caddy"
                              onChange={e => {
                                const updated = [...form.caddies];
                                updated[i] = e.target.value;
                                setAssignForm(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], caddies: updated } }));
                              }}
                              className="flex-1 h-8 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cart Numbers</p>
                      <input type="text" value={form.cartNumbers} placeholder="e.g. 1, 3, 5"
                        onChange={e => setAssignForm(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], cartNumbers: e.target.value } }))}
                        className="w-full h-8 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <Button size="sm" className="w-full h-8 text-xs gap-1.5"
                      disabled={savingAssign === booking.id}
                      onClick={() => handleSaveAssignment(booking.id)}>
                      <Save className="h-3.5 w-3.5" />
                      {savingAssign === booking.id ? "Saving..." : "Save Assignment"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex border-b border-border/50">
        {[
          { id: "upcoming",  label: `Upcoming${upcomingEvents.length   ? ` (${upcomingEvents.length})`   : ""}` },
          { id: "completed", label: `Completed${completedEvents.length ? ` (${completedEvents.length})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setScheduleTab(t.id as any)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              scheduleTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── EVENT LIST ── */}
      {isLoading ? (
        <div>
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
          <Calendar className="h-10 w-10 opacity-30" />
          <p className="text-sm font-semibold">{scheduleTab === "upcoming" ? "No upcoming events" : "No completed events"}</p>
          <p className="text-xs">Events booked at this venue will appear here</p>
        </div>
      ) : (
        displayEvents.map((event: any) => {
          const organizer  = (event.tours as any)?.clubs;
          const playerCount = (event.contestants as any)?.[0]?.count ?? 0;
          return (
            <button key={event.id} onClick={() => navigate(`/event/${event.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {organizer?.logo_url
                  ? <img src={organizer.logo_url} className="h-full w-full object-cover" />
                  : <Calendar className="h-5 w-5 text-primary/60" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{event.name}</p>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                  {event.event_date}{organizer?.name && ` · ${organizer.name}`}
                </p>
                {playerCount > 0 && (
                  <p className="text-[13px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" />{playerCount} players
                  </p>
                )}
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 capitalize ${statusColor[event.status] ?? ""}`}>
                {event.status}
              </span>
            </button>
          );
        })
      )}
    </div>

      {invoiceData && (
        <Suspense fallback={null}>
          <InvoiceModal
            open={!!invoiceData}
            onOpenChange={(v) => { if (!v) setInvoiceData(null); }}
            data={invoiceData}
          />
        </Suspense>
      )}
    </>
  );
};

export default VenueScheduleTab;
