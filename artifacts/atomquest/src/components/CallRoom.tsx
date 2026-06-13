import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer";
import { getSocket } from "@/lib/socket";
import { VideoTile } from "./VideoTile";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  socketId: string;
  userId: number;
  userName: string;
  role: string;
  stream?: MediaStream;
}

interface CallRoomProps {
  sessionId: string;
  userId: number;
  userName: string;
  userRole: string;
  sessionTitle: string;
  isAgent?: boolean;
  onLeave: () => void;
  onEndSession?: () => void;
}

export function CallRoom({
  sessionId,
  userId,
  userName,
  userRole,
  sessionTitle,
  isAgent,
  onLeave,
  onEndSession,
}: CallRoomProps) {
  const { toast } = useToast();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [unreadCount, setUnreadCount] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());

  const createPeer = useCallback(
    (targetSocketId: string, initiator: boolean, stream: MediaStream): SimplePeer.Instance => {
      const peer = new SimplePeer({
        initiator,
        stream,
        trickle: true,
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        },
      });

      peer.on("signal", (signal) => {
        getSocket().emit("signal", { to: targetSocketId, signal });
      });

      peer.on("stream", (remoteStream) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.socketId === targetSocketId ? { ...p, stream: remoteStream } : p
          )
        );
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
      });

      peer.on("close", () => {
        peersRef.current.delete(targetSocketId);
        setParticipants((prev) => prev.filter((p) => p.socketId !== targetSocketId));
      });

      return peer;
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    const socket = getSocket();

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setConnectionStatus("ready");

        socket.emit("join-room", { sessionId, userId, userName, role: userRole });
      } catch {
        setConnectionStatus("error");
        toast({ title: "Camera/mic access denied", description: "Allow camera and microphone access to join the call.", variant: "destructive" });
      }
    }

    socket.on("user-joined", ({ userId: remoteUserId, userName: remoteUserName, role: remoteRole, socketId: remoteSocketId }: { userId: number; userName: string; role: string; socketId: string }) => {
      if (!mounted || !localStreamRef.current) return;

      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === remoteSocketId)) return prev;
        return [...prev, { socketId: remoteSocketId, userId: remoteUserId, userName: remoteUserName, role: remoteRole }];
      });

      const peer = createPeer(remoteSocketId, true, localStreamRef.current);
      peersRef.current.set(remoteSocketId, peer);
    });

    socket.on("signal", ({ from, signal }: { from: string; signal: SimplePeer.SignalData }) => {
      if (!mounted || !localStreamRef.current) return;

      let peer = peersRef.current.get(from);
      if (!peer) {
        peer = createPeer(from, false, localStreamRef.current);
        peersRef.current.set(from, peer);
      }

      try {
        peer.signal(signal);
      } catch {
        // ignore stale signals
      }
    });

    socket.on("user-left", ({ socketId: leftSocketId }: { socketId: string }) => {
      if (!mounted) return;
      const peer = peersRef.current.get(leftSocketId);
      if (peer) {
        peer.destroy();
        peersRef.current.delete(leftSocketId);
      }
      setParticipants((prev) => prev.filter((p) => p.socketId !== leftSocketId));
    });

    socket.on("new-message", (msg: ChatMessage) => {
      if (!mounted) return;
      setChatMessages((prev) => [...prev, msg]);
      if (!showChat) {
        setUnreadCount((c) => c + 1);
      }
    });

    socket.on("session-ended", () => {
      if (!mounted) return;
      toast({ title: "Session ended by agent" });
      onLeave();
    });

    init();

    return () => {
      mounted = false;
      socket.emit("leave-room", { sessionId });
      socket.off("user-joined");
      socket.off("signal");
      socket.off("user-left");
      socket.off("new-message");
      socket.off("session-ended");
      peersRef.current.forEach((peer) => peer.destroy());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId, userName, userRole]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((v) => !v);
  };

  const handleLeave = () => {
    const socket = getSocket();
    socket.emit("leave-room", { sessionId });
    onLeave();
  };

  const handleEndSession = () => {
    const socket = getSocket();
    socket.emit("end-session", { sessionId });
    onEndSession?.();
    onLeave();
  };

  const handleSendMessage = (content: string) => {
    const socket = getSocket();
    socket.emit("send-message", {
      sessionId,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      content,
    });
  };

  const handleToggleChat = () => {
    setShowChat((v) => !v);
    setUnreadCount(0);
  };

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/join/${sessionId}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast({ title: "Copied to clipboard", description: "Share this link with the customer." });
  };

  const mainParticipant = participants[0];
  const hasRemote = participants.length > 0;

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">AQ</span>
          </div>
          <span className="text-sm font-medium text-white truncate max-w-xs">{sessionTitle}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              connectionStatus === "ready"
                ? "bg-emerald-500/20 text-emerald-400"
                : connectionStatus === "error"
                ? "bg-red-500/20 text-red-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {connectionStatus === "ready" ? (hasRemote ? "Connected" : "Waiting...") : connectionStatus === "error" ? "Error" : "Connecting..."}
          </span>
        </div>
        <span className="text-xs text-white/50">{userName}</span>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">
          {/* Main video (remote or waiting) */}
          <div className="flex-1 min-h-0">
            {hasRemote && mainParticipant ? (
              <VideoTile
                stream={mainParticipant.stream ?? null}
                name={mainParticipant.userName}
                isMain
                className="h-full w-full"
              />
            ) : (
              <div className="h-full w-full rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 mx-auto mb-3 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8h8a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/40">
                    {isAgent ? "Waiting for customer to join..." : "Waiting for agent..."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Local video (small) */}
          <div className="h-28 w-40 shrink-0">
            <VideoTile
              stream={localStream}
              name={userName}
              isLocal
              isVideoOff={isVideoOff}
            />
          </div>
        </div>

        {/* Chat panel */}
        <div
          className={`transition-all duration-200 shrink-0 ${
            showChat ? "w-72" : "w-0 overflow-hidden"
          }`}
        >
          <ChatPanel
            messages={chatMessages}
            currentUserId={userId}
            onSend={handleSendMessage}
            isVisible={showChat}
          />
        </div>
      </div>

      {/* Controls bar */}
      <div className="border-t border-white/10 bg-black/40 px-4 py-3 flex items-center justify-center gap-3">
        <button
          onClick={toggleMute}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
            isMuted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
          <span className="text-xs">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
            isVideoOff ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8h8a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
          </svg>
          <span className="text-xs">{isVideoOff ? "Start Video" : "Stop Video"}</span>
        </button>

        <button
          onClick={handleToggleChat}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors relative ${
            showChat ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {unreadCount > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs">Chat</span>
        </button>

        {isAgent && (
          <button
            onClick={copyInviteLink}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-xs">Invite</span>
          </button>
        )}

        <div className="flex-1" />

        {isAgent ? (
          <button
            onClick={handleEndSession}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            <span className="text-xs">End Session</span>
          </button>
        ) : (
          <button
            onClick={handleLeave}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs">Leave</span>
          </button>
        )}
      </div>
    </div>
  );
}
