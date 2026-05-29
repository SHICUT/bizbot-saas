"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Bot, Phone, MessageSquare } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import MessageBubble from "@/components/dashboard/MessageBubble";

const initialConversations = [
  { id: 1, name: "Priya Mehta", lastMessage: "What are your membership plans?", time: "2m", unread: 2, isAi: true, phone: "+91 98765 43210", channel: "whatsapp" as const },
  { id: 2, name: "Amit Kumar", lastMessage: "I'd like to book a session for tomorrow", time: "15m", unread: 0, isAi: true, phone: "+91 87654 32109", channel: "whatsapp" as const },
  { id: 3, name: "Sneha Patel", lastMessage: "Thanks! I'll come in at 5 PM", time: "1h", unread: 0, isAi: false, phone: "+91 76543 21098", channel: "whatsapp" as const },
  { id: 4, name: "Rajesh Gupta", lastMessage: "Do you have personal training?", time: "2h", unread: 1, isAi: true, phone: "+91 65432 10987", channel: "instagram" as const },
  { id: 5, name: "Kavita Singh", lastMessage: "What's the timing on weekends?", time: "3h", unread: 0, isAi: true, phone: "+91 54321 09876", channel: "whatsapp" as const },
  { id: 6, name: "Vikram Joshi", lastMessage: "Can I get a trial class?", time: "5h", unread: 0, isAi: true, phone: "@vikram.joshi", channel: "instagram" as const },
];

const initialMessages = [
  { content: "Hi! I saw your ad on Instagram. What are your membership plans?", time: "10:30 AM", direction: "inbound" as const, isAi: false },
  { content: "Hello Priya! 👋 Welcome to FitZone Gym! We have 3 plans:\n\n💪 Basic - ₹1,500/month (gym access)\n🔥 Pro - ₹2,500/month (gym + group classes)\n⭐ Premium - ₹4,000/month (gym + classes + personal trainer)\n\nAll plans include locker access. Would you like to know more about any specific plan?", time: "10:30 AM", direction: "outbound" as const, isAi: true },
  { content: "The Pro plan sounds good. Do you have evening batches?", time: "10:32 AM", direction: "inbound" as const, isAi: false },
  { content: "Great choice! 🎉 Yes, we have evening batches:\n\n🕕 6:00 PM - Zumba\n🕖 7:00 PM - HIIT\n🕗 8:00 PM - Yoga\n\nYou can attend any class with the Pro plan. Would you like to book a free trial class to experience it first?", time: "10:32 AM", direction: "outbound" as const, isAi: true },
  { content: "Yes! Can I come tomorrow evening?", time: "10:35 AM", direction: "inbound" as const, isAi: false },
];

export default function ConversationsPage() {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConv, setSelectedConv] = useState(conversations[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram">("all");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter conversations by search + channel
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = !searchQuery || conv.name.toLowerCase().includes(searchQuery.toLowerCase()) || conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === "all" || conv.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!messageInput.trim() || sending) return;

    const newMessage = {
      content: messageInput.trim(),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      direction: "outbound" as const,
      isAi: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
    setSending(true);

    // Update conversation preview
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id ? { ...c, lastMessage: newMessage.content, time: "now", unread: 0 } : c
      )
    );

    // Simulate AI pause notification
    setTimeout(() => setSending(false), 500);
  }

  function handleSelectConversation(conv: typeof conversations[0]) {
    setSelectedConv(conv);
    // Clear unread
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] rounded-xl border border-border bg-white overflow-hidden shadow-sm">
      {/* Conversation List */}
      <div className="w-full sm:w-80 lg:w-96 border-r border-border flex flex-col">
        {/* Channel Filter Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: "all" as const, label: "All" },
            { id: "whatsapp" as const, label: "WhatsApp" },
            { id: "instagram" as const, label: "Instagram" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChannelFilter(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                channelFilter === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none w-full"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-text-muted">No conversations found</div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border/50 ${
                  selectedConv.id === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50"
                }`}
              >
                <Avatar name={conv.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary truncate">{conv.name}</p>
                    <span className="text-xs text-text-muted flex-shrink-0">{conv.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-text-secondary truncate">{conv.lastMessage}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {conv.channel === "instagram" && <Badge variant="default">IG</Badge>}
                      {conv.isAi && <Badge variant="info">AI</Badge>}
                      {conv.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">{conv.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden sm:flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar name={selectedConv.name} />
            <div>
              <p className="text-sm font-semibold text-text-primary">{selectedConv.name}</p>
              <div className="flex items-center gap-1.5">
                {selectedConv.channel === "instagram" ? (
                  <><MessageSquare className="w-3 h-3 text-text-muted" /><span className="text-xs text-text-muted">Instagram DM</span></>
                ) : (
                  <><Phone className="w-3 h-3 text-text-muted" /><span className="text-xs text-text-muted">{selectedConv.phone}</span></>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <Bot className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">AI Active</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {messages.map((msg, i) => (
            <MessageBubble key={i} {...msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-white">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message... (AI will pause for 30 min)"
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border bg-background text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || sending}
              className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            💡 Sending a manual reply will pause AI for this conversation for 30 minutes
          </p>
        </form>
      </div>
    </div>
  );
}
