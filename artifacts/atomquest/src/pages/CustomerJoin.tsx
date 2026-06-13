import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useJoinByToken } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CustomerJoin() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [, setLocation] = useLocation();
  const { data: session, isLoading, isError } = useJoinByToken(token);
  const [displayName, setDisplayName] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !session) return;
    localStorage.setItem("atomquest_customer_name", displayName.trim());
    localStorage.setItem("atomquest_customer_session", session.id);
    setLocation(`/room/${session.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading session info...</p>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-medium">Invalid or expired invite link</p>
            <p className="text-muted-foreground text-sm mt-2">This link may have been revoked or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground font-medium">This session has ended</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-bold text-xs text-primary-foreground">AQ</span>
            </div>
            <span className="text-lg font-semibold">AtomQuest</span>
          </div>
          <h1 className="text-2xl font-bold">Join Video Call</h1>
          <p className="text-muted-foreground text-sm mt-1">You've been invited to a support session</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Title</span>
              <span className="text-sm font-medium">{session.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Agent</span>
              <span className="text-sm font-medium">{session.agentName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                session.status === "active"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-yellow-500/15 text-yellow-400"
              }`}>
                {session.status === "active" ? "In Progress" : "Waiting"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enter your name</CardTitle>
            <CardDescription className="text-sm">This will be shown to the agent during the call</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Your Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!displayName.trim()}>
                Join Call
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
