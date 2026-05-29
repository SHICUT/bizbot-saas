"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Bot, Phone, MessageSquare, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import MessageBubble from "@/components/dashboard/MessageBubble";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isAi: boolean;
  phone: string;
  channel: "whatsapp" | "instagram";
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Array<{ content: string; time: string; direction: "inbound" | "outbound"; isAi: boolean }>>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch real conversations from API
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.recentConversations && data.recentConversations.length > 0) {
          const convs: Conversation[] = data.recentConversations.map((c: { id: string; last_message_text: string; last_message_at: string; unread_count: number; channel: string; is_ai_active: boolean; leads: { name: string; phone: string } }) => ({
            id: c.id,
            name: c.leads?.name || c.leads?.phone || "Unknown",
            lastMessage: c.last_message_text || "",
            time: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
            unread: c.unread_count || 0,
            isAi: c.is_ai_active,
            phone: c.leads?.phone || "",
            channel: (c.channel || "whatsapp") as "whatsapp" | "instagram",
          }));
          setConversations(convs);
          setSelectedConv(convs[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = !searchQuery || conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === "all" || conv.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!messageInput.trim()) return;
    const newMsg = { content: messageInput.trim(), time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), direction: "outbound" as const, isAi: false };
    setMessages((prev) => [...prev, newMsg]);
    setMessageInput("");
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-text-muted/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">No conversations yet</h2>
          <p className="text-sm text-text-muted max-w-sm">
            Conversations will appear here when customers message you on WhatsApp or Instagram.
            Connect your WhatsApp number in Settings to get started.
          </p>
          <a href="/settings" className="inline-block mt-4 text-sm text-primary font-medium hover:underline">
            Go to Settings →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Conversation List */}
      <div className="w-full sm:w-80 lg:w-96 border-r border-border flex flex-col">
        <div className="flex border-b border-border">
          {(["all", "whatsapp", "instagram"] as const).map((tab) => (
            <button key={tab} onClick={() => setChannelFilter(tab)} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${channelFilter === tab ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-secondary"}`}>
              {tab === "all" ? "All" : tab === "whatsapp" ? "WhatsApp" : "Instagram"}
            </button>
          ))}
        </div>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent text-sm focus:outline-none w-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <div key={conv.id} onClick={() => setSelectedConv(conv)} className={`flex items-center gap-3 p-3 cursor-pointer border-b border-border/50 ${selectedConv?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50"}`}>
              <Avatar name={conv.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold truncate">{conv.name}</p><span className="text-xs text-text-muted">{conv.time}</span></div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-text-secondary truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-1">
                    {conv.channel === "instagram" && <Badge variant="default">IG</Badge>}
                    {conv.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">{conv.unread}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden sm:flex flex-1 flex-col">
        {selectedConv ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar name={selectedConv.name} />
                <div>
                  <p className="text-sm font-semibold">{selectedConv.name}</p>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-text-muted" />
                    <span className="text-xs text-text-muted">{selectedConv.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">AI Active</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
              {messages.length === 0 && <p className="text-center text-sm text-text-muted py-8">No messages loaded. Messages will appear from the database.</p>}
              {messages.map((msg, i) => <MessageBubble key={i} {...msg} />)}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-white flex items-center gap-3">
              <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <button type="submit" disabled={!messageInput.trim()} className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><p className="text-text-muted">Select a conversation</p></div>
        )}
      </div>
    </div>
  );
}
