import { useEffect, useRef } from "react";

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isMain?: boolean;
  className?: string;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);
  return (
    <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
      <span className="text-xl font-semibold text-primary">{initials.toUpperCase()}</span>
    </div>
  );
}

export function VideoTile({ stream, name, isLocal, isMuted, isVideoOff, isMain, className }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = stream && !isVideoOff;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center ${isMain ? "video-tile-active" : ""} ${className ?? ""}`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Initials name={name} />
          {isVideoOff && (
            <span className="text-xs text-muted-foreground">Camera off</span>
          )}
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-xs font-medium bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-white">
          {name}{isLocal ? " (You)" : ""}
        </span>
        {isMuted && !isLocal && (
          <span className="text-xs bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-red-400">Muted</span>
        )}
      </div>
    </div>
  );
}
