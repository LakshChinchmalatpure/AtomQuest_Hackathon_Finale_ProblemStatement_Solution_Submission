import { useAdminListSessions, useGetAdminStats, useAdminEndSession, getAdminListSessionsQueryKey, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    waiting: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ended: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[status] ?? variants.ended}`}>
      {status}
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { data: sessions, isLoading } = useAdminListSessions();
  const { data: stats } = useGetAdminStats();
  const adminEndSession = useAdminEndSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleForceEnd = async (sessionId: string) => {
    try {
      await adminEndSession.mutateAsync({ sessionId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getAdminListSessionsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() }),
      ]);
      toast({ title: "Session ended" });
    } catch {
      toast({ title: "Failed to end session", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">AQ</span>
            </div>
            <span className="font-semibold">AtomQuest</span>
            <span className="text-xs text-muted-foreground ml-2 border border-border px-1.5 py-0.5 rounded">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.displayName}</span>
            <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor and manage all sessions</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Sessions</p>
                <p className="text-3xl font-bold mt-1">{stats.totalSessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active</p>
                <p className="text-3xl font-bold mt-1 text-emerald-400">{stats.activeSessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Waiting</p>
                <p className="text-3xl font-bold mt-1 text-yellow-400">{stats.waitingSessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ended</p>
                <p className="text-3xl font-bold mt-1 text-muted-foreground">{stats.endedSessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Messages</p>
                <p className="text-3xl font-bold mt-1 text-primary">{stats.totalMessages}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !sessions?.length ? (
              <div className="text-center py-8 text-muted-foreground">No sessions found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Title</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Agent</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Customer</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Messages</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Duration</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Created</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium max-w-[180px] truncate">{s.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{s.agentName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.customerName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.messageCount}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{formatDuration(s.durationSeconds)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {s.status !== "ended" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs text-destructive hover:text-destructive border-destructive/30"
                              onClick={() => handleForceEnd(s.id)}
                              disabled={adminEndSession.isPending}
                            >
                              Force End
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
