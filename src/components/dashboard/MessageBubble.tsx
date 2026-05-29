import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

interface MessageBubbleProps {
  content: string;
  time: string;
  direction: "inbound" | "outbound";
  isAi?: boolean;
}

export default function MessageBubble({
  content,
  time,
  direction,
  isAi = false,
}: MessageBubbleProps) {
  const isOutbound = direction === "outbound";

  return (
    <div
      className={cn("flex mb-3", isOutbound ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isOutbound
            ? "bg-primary text-white rounded-br-md"
            : "bg-gray-100 text-text-primary rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed">{content}</p>
        <div
          className={cn(
            "flex items-center gap-1.5 mt-1",
            isOutbound ? "justify-end" : "justify-start"
          )}
        >
          {isAi && <Badge variant="info">AI</Badge>}
          <span
            className={cn(
              "text-[10px]",
              isOutbound ? "text-white/70" : "text-text-muted"
            )}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
