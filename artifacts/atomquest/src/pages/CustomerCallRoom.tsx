import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSession } from "@workspace/api-client-react";
import { CallRoom } from "@/components/CallRoom";

export default function CustomerCallRoom() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "";
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useGetSession(sessionId);
  const [customerName] = useState(() => localStorage.getItem("atomquest_customer_name") ?? "Customer");

  useEffect(() => {
    const storedSession = localStorage.getItem("atomquest_customer_session");
    if (!storedSession || storedSession !== sessionId) {
      setLocation(`/join/${sessionId}`);
    }
  }, [sessionId, setLocation]);

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

  if (session.status === "ended") {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-center p-4">
        <div>
          <p className="text-white text-lg font-medium mb-2">Session Ended</p>
          <p className="text-white/50 text-sm">Thank you for using AtomQuest support.</p>
        </div>
      </div>
    );
  }

  const customerId = Math.abs(
    customerName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  ) + 10000;

  return (
    <CallRoom
      sessionId={session.id}
      userId={customerId}
      userName={customerName}
      userRole="customer"
      sessionTitle={session.title}
      isAgent={false}
      onLeave={() => {
        localStorage.removeItem("atomquest_customer_session");
        localStorage.removeItem("atomquest_customer_name");
        setLocation("/");
      }}
    />
  );
}
