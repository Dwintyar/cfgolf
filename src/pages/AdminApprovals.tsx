import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Users, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ADMIN_EMAIL = "dwintyar@gmail.com";

const AdminApprovals = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
      setAuthLoading(false);
    });
  }, []);

  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin-pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_approvals")
        .select("id, user_id, email, full_name, requested_at, status")
        .eq("status", "pending")
        .order("requested_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: userEmail === ADMIN_EMAIL,
    refetchInterval: 30000,
  });

  const { data: allApprovals } = useQuery({
    queryKey: ["admin-all-approvals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_approvals")
        .select("id, user_id, email, full_name, requested_at, status, reviewed_at")
        .order("requested_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: userEmail === ADMIN_EMAIL,
    refetchInterval: 30000,
  });

  const handleApprove = async (approval: any) => {
    if (!currentUserId || !approval.user_id) return;
    setActionLoading(approval.id);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: currentUserId,
        })
        .eq("id", approval.user_id);

      if (profileError) throw profileError;

      // Update pending_approvals
      const { error: paError } = await supabase
        .from("pending_approvals")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        } as any)
        .eq("id", approval.id);

      if (paError) throw paError;

      toast.success(`${approval.full_name || approval.email} berhasil disetujui`);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-approvals"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approval: any) => {
    if (!currentUserId) return;
    setActionLoading(approval.id);
    try {
      const { error } = await supabase
        .from("pending_approvals")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        } as any)
        .eq("id", approval.id);

      if (error) throw error;

      toast.success(`${approval.full_name || approval.email} ditolak`);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-approvals"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 w-full max-w-sm px-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (userEmail !== ADMIN_EMAIL) {
    return <Navigate to="/news" replace />;
  }

  const pendingCount = pending?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Persetujuan Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola pendaftaran pengguna baru CFGolf</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {allApprovals?.filter(a => a.status === "approved").length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {allApprovals?.filter(a => a.status === "rejected").length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pending Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : pendingCount === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
              Tidak ada pendaftaran yang menunggu persetujuan
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tanggal Daftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending?.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {a.requested_at
                        ? format(new Date(a.requested_at), "dd MMM yyyy HH:mm", { locale: idLocale })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={actionLoading === a.id}
                          onClick={() => handleApprove(a)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoading === a.id}
                          onClick={() => handleReject(a)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      {allApprovals && allApprovals.filter(a => a.status !== "pending").length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Riwayat</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allApprovals.filter(a => a.status !== "pending").map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "approved" ? "default" : "destructive"} className={a.status === "approved" ? "bg-emerald-600" : ""}>
                        {a.status === "approved" ? "Disetujui" : "Ditolak"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {a.reviewed_at
                        ? format(new Date(a.reviewed_at), "dd MMM yyyy HH:mm", { locale: idLocale })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {a.status === "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
                          disabled={actionLoading === a.id}
                          onClick={() => handleApprove(a)}
                        >
                          {actionLoading === a.id ? "..." : "Setujui"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminApprovals;
