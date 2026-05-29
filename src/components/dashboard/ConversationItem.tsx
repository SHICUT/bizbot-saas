import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";

interface ConversationItemProps {
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  isAiReplied?: boolean;
}

export default function ConversationItem({
  name,
  lastMessage,
  time,
  unread = 0,
  isAiReplied = false,
}: ConversationItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
      <Avatar name={name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary truncate">
            {name}
          </p>
          <span className="text-xs text-text-muted flex-shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-text-secondary truncate">{lastMessage}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isAiReplied && (
              <Badge variant="info">AI</Badge>
            )}
            {unread > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
