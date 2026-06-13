import { useParams, useLocation } from "wouter";
import { useGetSession } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { CallRoom } from "@/components/CallRoom";

export default function AgentCallRoom() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "";
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useGetSession(sessionId);

  if (!user) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white/50">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white/50">Session not found</p>
      </div>
    );
  }

  return (
    <CallRoom
      sessionId={session.id}
      userId={user.id}
      userName={user.displayName}
      userRole={user.role}
      sessionTitle={session.title}
      isAgent
      onLeave={() => setLocation("/agent")}
      onEndSession={() => setLocation("/agent")}
    />
  );
}
