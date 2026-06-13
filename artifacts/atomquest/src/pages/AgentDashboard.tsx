import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListSessions,
  useCreateSession,
  useGenerateInvite,
  useEndSession,
  getListSessionsQueryKey,
  type Session,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

function SessionCard({ session }: { session: Session }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const generateInvite = useGenerateInvite();
  const endSession = useEndSession();
  const queryClient = useQueryClient();

  const handleGenerateInvite = async () => {
    try {
      const result = await generateInvite.mutateAsync({ sessionId: session.id });
      await navigator.clipboard.writeText(result.inviteUrl ?? "");
      toast({ title: "Invite link copied to clipboard" });
    } catch {
      toast({ title: "Failed to generate invite", variant: "destructive" });
    }
  };

  const handleEnd = async () => {
    try {
      await endSession.mutateAsync({ sessionId: session.id });
      await queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      toast({ title: "Session ended" });
    } catch {
      toast({ title: "Failed to end session", variant: "destructive" });
    }
  };

  const formattedDate = new Date(session.createdAt).toLocaleString();

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={session.status} />
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            <h3 className="font-semibold text-sm truncate">{session.title}</h3>
            {session.customerName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer: {session.customerName}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {session.status !== "ended" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setLocation(`/agent/sessions/${session.id}`)}
                >
                  Join Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleGenerateInvite}
                  disabled={generateInvite.isPending}
                >
                  Copy Invite
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={handleEnd}
                  disabled={endSession.isPending}
                >
                  End
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: sessions, isLoading } = useListSessions();
  const createSession = useCreateSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const session = await createSession.mutateAsync({ data: { title: newTitle.trim() } });
      await queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      setNewTitle("");
      setDialogOpen(false);
      setLocation(`/agent/sessions/${session.id}`);
    } catch {
      toast({ title: "Failed to create session", variant: "destructive" });
    }
  };

  const mySessions = sessions?.filter(s => s.agentId === user?.id) ?? [];
  const activeSessions = mySessions.filter(s => s.status === "active");
  const waitingSessions = mySessions.filter(s => s.status === "waiting");
  const endedSessions = mySessions.filter(s => s.status === "ended");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">AQ</span>
            </div>
            <span className="font-semibold">AtomQuest</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.displayName}</span>
            <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Sessions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your video call sessions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="session-title">Session Title</Label>
                  <Input
                    id="session-title"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Technical Support - Issue #1234"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createSession.isPending || !newTitle.trim()}>
                    {createSession.isPending ? "Creating..." : "Create & Join"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active</p>
              <p className="text-3xl font-bold mt-1 text-emerald-400">{activeSessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Waiting</p>
              <p className="text-3xl font-bold mt-1 text-yellow-400">{waitingSessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ended</p>
              <p className="text-3xl font-bold mt-1 text-muted-foreground">{endedSessions.length}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading sessions...</div>
        ) : mySessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sessions yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first session to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...activeSessions, ...waitingSessions, ...endedSessions].map(s => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
