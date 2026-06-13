import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ChatMessage {
  id: number | string;
  senderId: number;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: number;
  onSend: (content: string) => void;
  isVisible: boolean;
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    agent: "text-cyan-400",
    customer: "text-emerald-400",
    admin: "text-purple-400",
  };
  return <span className={`text-xs ${colors[role] ?? "text-muted-foreground"}`}>{role}</span>;
}

export function ChatPanel({ messages, currentUserId, onSend, isVisible }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Chat</h3>
        <p className="text-xs text-muted-foreground">{messages.length} messages</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/80">{msg.senderName}</span>
                  <RoleBadge role={msg.senderRole} />
                </div>
                <div
                  className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-sm h-8"
        />
        <Button type="submit" size="sm" className="h-8 px-3" disabled={!input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
