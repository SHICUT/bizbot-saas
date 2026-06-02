"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Send, Bot, Phone, Mail, Loader2, MessageSquare,
  User, X, Tag, CheckCircle, UserCheck, Clock, Camera,
  Globe, Hash
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface LeadInfo {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: string;
  lead_temperature: string;
  source: string;
  score: number;
}

interface Conversation {
  id: string;
  channel: "whatsapp" | "instagram" | "facebook" | "web";
  status: string;
  is_ai_active: boolean;
  unread_count: number;
  last_message_text: string | null;
  last_message_at: string | null;
  leads: LeadInfo | null;
}

interface Message {
  id: string;
  content: string;
  direction: "inbound" | "outbound";
  message_type: string;
  is_ai_generated: boolean;
  status: string;
  created_at: string;
}

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: Phone,
  instagram: Camera,
  facebook: Globe,
  web: Globe,
};

const channelColors: Record<string, string> = {
  whatsapp: "bg-emerald-100 text-emerald-700",
  instagram: "bg-pink-100 text-pink-700",
  facebook: "bg-blue-100 text-blue-700",
  web: "bg-gray-100 text-gray-700",
};

function timeDisplay(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (diffHours < 48) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const [showLeadCard, setShowLeadCard] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, aiActive: 0, whatsapp: 0, instagram: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setStats(data.stats || stats);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [channelFilter, searchQuery]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  async function loadMessages(conv: Conversation) {
    setSelectedConv(conv);
    setMessagesLoading(true);
    setShowLeadCard(false);
    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Mark as read locally
        setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      }
    } catch { /* silent */ }
    setMessagesLoading(false);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!messageInput.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConv.id, message: messageInput.trim() }),
      });
      if (res.ok) {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          content: messageInput.trim(),
          direction: "outbound",
          message_type: "text",
          is_ai_generated: false,
          status: "sent",
          created_at: new Date().toISOString(),
        }]);
        setMessageInput("");
      }
    } catch { /* silent */ }
    setSending(false);
  }

  async function toggleAI(convId: string, currentState: boolean) {
    try {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: convId, is_ai_active: !currentState }),
      });
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, is_ai_active: !currentState } : c));
      if (selectedConv?.id === convId) setSelectedConv({ ...selectedConv, is_ai_active: !currentState });
    } catch { /* silent */ }
  }

  async function markResolved(convId: string) {
    try {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: convId, status: "resolved" }),
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (selectedConv?.id === convId) setSelectedConv(null);
    } catch { /* silent */ }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Empty state
  if (conversations.length === 0 && !searchQuery) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-text-muted/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Unified Inbox</h2>
          <p className="text-sm text-text-muted max-w-sm">
            All customer conversations from WhatsApp, Instagram, and other channels appear here.
            Connect your WhatsApp number in Settings to get started.
          </p>
          <a href="/settings" className="inline-block mt-4 text-sm text-primary font-medium hover:underline">Go to Settings →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Conversation List */}
      <div className={`w-full sm:w-80 lg:w-96 border-r border-border flex flex-col ${selectedConv ? "hidden sm:flex" : "flex"}`}>
        {/* Channel Tabs */}
        <div className="flex border-b border-border">
          {(["all", "whatsapp", "instagram"] as const).map((tab) => {
            const count = tab === "all" ? stats.total : tab === "whatsapp" ? stats.whatsapp : stats.instagram;
            return (
              <button key={tab} onClick={() => setChannelFilter(tab)} className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${channelFilter === tab ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-secondary"}`}>
                {tab === "all" ? "All" : tab === "whatsapp" ? "WhatsApp" : "Instagram"}
                {count > 0 && <span className="ml-1 text-[10px] text-text-muted">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="bg-transparent text-sm focus:outline-none w-full" />
            {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-3.5 h-3.5 text-text-muted" /></button>}
          </div>
        </div>

        {/* Unread indicator */}
        {stats.unread > 0 && (
          <div className="px-3 py-1.5 bg-primary/5 border-b border-border">
            <p className="text-xs text-primary font-medium">{stats.unread} unread conversation{stats.unread > 1 ? "s" : ""}</p>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => {
            const lead = conv.leads as LeadInfo | null;
            const ChannelIcon = channelIcons[conv.channel] || MessageSquare;
            return (
              <div
                key={conv.id}
                onClick={() => loadMessages(conv)}
                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-border/50 transition-colors ${selectedConv?.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50"}`}
              >
                <div className="relative">
                  <Avatar name={lead?.name || lead?.phone || "?"} />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${channelColors[conv.channel]}`}>
                    <ChannelIcon className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{lead?.name || lead?.phone || "Unknown"}</p>
                    <span className="text-[10px] text-text-muted flex-shrink-0">{timeDisplay(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-text-secondary truncate pr-2">{conv.last_message_text || "No messages"}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {conv.is_ai_active && <Bot className="w-3 h-3 text-emerald-500" />}
                      {conv.unread_count > 0 && <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">{conv.unread_count}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {conversations.length === 0 && searchQuery && (
            <div className="p-8 text-center"><p className="text-sm text-text-muted">No conversations match your search</p></div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedConv ? "hidden sm:flex" : "flex"}`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <button className="sm:hidden p-1" onClick={() => setSelectedConv(null)}><X className="w-5 h-5" /></button>
                <Avatar name={selectedConv.leads?.name || selectedConv.leads?.phone || "?"} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{selectedConv.leads?.name || "Unknown"}</p>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${channelColors[selectedConv.channel]}`}>
                      {selectedConv.channel === "whatsapp" ? "W" : "I"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedConv.leads?.phone && <span className="text-xs text-text-muted flex items-center gap-0.5"><Phone className="w-3 h-3" />{selectedConv.leads.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* AI Toggle */}
                <button
                  onClick={() => toggleAI(selectedConv.id, selectedConv.is_ai_active)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedConv.is_ai_active ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-gray-100 border border-border text-text-muted"}`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  {selectedConv.is_ai_active ? "AI Active" : "AI Off"}
                </button>
                {/* Lead Card Toggle */}
                <button onClick={() => setShowLeadCard(!showLeadCard)} className={`p-2 rounded-lg transition-colors ${showLeadCard ? "bg-primary/10 text-primary" : "hover:bg-gray-100 text-text-muted"}`} title="Lead Info">
                  <User className="w-4 h-4" />
                </button>
                {/* Resolve */}
                <button onClick={() => markResolved(selectedConv.id)} className="p-2 rounded-lg hover:bg-emerald-50 text-text-muted hover:text-emerald-600 transition-colors" title="Mark Resolved">
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><p className="text-sm text-text-muted">No messages yet</p></div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex mb-3 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.direction === "outbound" ? "bg-primary text-white rounded-br-md" : "bg-white border border-border text-text-primary rounded-bl-md shadow-sm"}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div className={`flex items-center gap-1.5 mt-1 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                            {msg.is_ai_generated && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${msg.direction === "outbound" ? "bg-white/20 text-white/80" : "bg-indigo-50 text-indigo-600"}`}>AI</span>
                            )}
                            {!msg.is_ai_generated && msg.direction === "outbound" && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-white/20 text-white/80`}>You</span>
                            )}
                            <span className={`text-[10px] ${msg.direction === "outbound" ? "text-white/60" : "text-text-muted"}`}>
                              {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Lead Card Sidebar */}
              {showLeadCard && selectedConv.leads && (
                <div className="w-72 border-l border-border bg-white p-4 overflow-y-auto hidden lg:block">
                  <h4 className="text-sm font-bold mb-3">Lead Info</h4>
                  <div className="space-y-3">
                    <div className="text-center mb-4">
                      <Avatar name={selectedConv.leads.name || selectedConv.leads.phone} size="lg" />
                      <p className="text-sm font-bold mt-2">{selectedConv.leads.name || "Unknown"}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Badge variant={selectedConv.leads.status === "converted" ? "success" : selectedConv.leads.status === "qualified" ? "warning" : "info"}>
                          {selectedConv.leads.status}
                        </Badge>
                        <span className="text-xs">{selectedConv.leads.lead_temperature === "hot" ? "🔥" : selectedConv.leads.lead_temperature === "warm" ? "🟡" : "⚪"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5 text-text-muted" /><span>{selectedConv.leads.phone}</span></div>
                      {selectedConv.leads.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 text-text-muted" /><span>{selectedConv.leads.email}</span></div>}
                      <div className="flex items-center gap-2 text-xs"><Tag className="w-3.5 h-3.5 text-text-muted" /><span className="capitalize">{selectedConv.leads.source}</span></div>
                      <div className="flex items-center gap-2 text-xs"><Hash className="w-3.5 h-3.5 text-text-muted" /><span>Score: {selectedConv.leads.score}/100</span></div>
                    </div>
                    <div className="pt-3 border-t border-border space-y-2">
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => window.location.assign("/leads")}>
                        <UserCheck className="w-3.5 h-3.5" /> View Full Profile
                      </Button>
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => window.location.assign("/appointments")}>
                        <Clock className="w-3.5 h-3.5" /> Book Appointment
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-border bg-white flex items-center gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={selectedConv.is_ai_active ? "Type to take over from AI..." : "Type a message..."}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sending}
                className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary-hover transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/30">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-text-muted/20 mx-auto mb-3" />
              <p className="text-sm text-text-muted">Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
