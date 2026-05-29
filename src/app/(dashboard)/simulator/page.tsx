"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Trash2,
  Download,
  Bot,
  User,
  Clock,
  Globe,
  Zap,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  debug?: DebugInfo;
}

interface DebugInfo {
  language: string;
  tone: string;
  script: string;
  confidence: number;
  shouldUseEmojis: boolean;
  intent: string;
  aiConfidence: number;
  tokensUsed: number;
  responseTimeMs: number;
  actions: unknown[];
  shouldEscalate: boolean;
}

// ─── Predefined Test Cases ──────────────────────────────────────────────────

const testCases = [
  { label: "💰 Pricing (English)", message: "How much does it cost?" },
  { label: "💰 Pricing (Hinglish)", message: "Price kya hai?" },
  { label: "💰 Pricing (Hindi)", message: "कितना खर्चा आएगा?" },
  { label: "📅 Booking", message: "I want to book an appointment for tomorrow" },
  { label: "📅 Booking (Hinglish)", message: "bhai appointment booking bhi hoga?" },
  { label: "🏋️ Gym Query", message: "gym ke liye kaam karega?" },
  { label: "💇 Salon Query", message: "Can this work for my salon?" },
  { label: "🎯 Demo Request", message: "demo chahiye" },
  { label: "⏰ Timing", message: "What time do you open?" },
  { label: "📍 Location", message: "Where are you located?" },
  { label: "🤔 Objection", message: "It's too expensive for me" },
  { label: "👋 Greeting", message: "Hi" },
  { label: "👋 Greeting (Hindi)", message: "नमस्ते" },
  { label: "🙋 Human Request", message: "I want to talk to the manager" },
  { label: "😡 Complaint", message: "Your service is terrible, I want a refund" },
  { label: "✅ Ready to Buy", message: "I want to sign up for the Pro plan" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [selectedDebug, setSelectedDebug] = useState<DebugInfo | null>(null);
  const [contactName, setContactName] = useState("Test Customer");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/test/simulate-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history,
          contactName,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          debug: data.debug,
        };
        setMessages((prev) => [...prev, botMsg]);
        setSelectedDebug(data.debug);
      } else if (data.error) {
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error: ${data.error}`,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ Network error: ${err instanceof Error ? err.message : "Failed to reach API"}`,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setSelectedDebug(null);
  }

  function exportChat() {
    const text = messages
      .map((m) => `[${m.timestamp}] ${m.role === "user" ? "Customer" : "Bot"}: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_simulation_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Chat Simulator"
        description="Test the AI bot without connecting WhatsApp"
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Chat Window */}
        <div className="xl:col-span-2 flex flex-col h-[calc(100vh-12rem)]">
          <Card padding="none" className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">AI Bot Simulator</p>
                  <p className="text-xs text-emerald-600">● Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={exportChat} disabled={messages.length === 0}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={clearChat} disabled={messages.length === 0}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-text-muted">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Send a message to test the AI bot</p>
                    <p className="text-xs mt-1">Or use the test cases on the right →</p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#d9fdd3] rounded-tr-none"
                        : "bg-white rounded-tl-none"
                    }`}
                  >
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {msg.debug && (
                        <button
                          onClick={() => setSelectedDebug(msg.debug!)}
                          className="text-[10px] text-blue-500 hover:underline mr-1"
                        >
                          debug
                        </button>
                      )}
                      <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="p-3 border-t border-border bg-white flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </Card>

          {/* Customer Name */}
          <div className="mt-3 flex items-center gap-2">
            <User className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted">Simulating as:</span>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-border bg-white w-32 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Right Panel: Test Cases + Debug */}
        <div className="xl:col-span-2 space-y-4">
          {/* Quick Test Cases */}
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Quick Test Cases
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {testCases.map((tc) => (
                <button
                  key={tc.message}
                  onClick={() => sendMessage(tc.message)}
                  disabled={loading}
                  className="text-left px-3 py-2 text-xs rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-colors disabled:opacity-50 truncate"
                  title={tc.message}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Debug Panel */}
          <Card>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                AI Debug Panel
              </h3>
              {showDebug ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
            </button>

            {showDebug && (
              <div className="mt-4">
                {selectedDebug ? (
                  <div className="space-y-3">
                    {/* Language Detection */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-800">Language Detection</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-blue-600">Language:</span> <span className="font-medium text-blue-900">{selectedDebug.language}</span></div>
                        <div><span className="text-blue-600">Tone:</span> <span className="font-medium text-blue-900">{selectedDebug.tone}</span></div>
                        <div><span className="text-blue-600">Script:</span> <span className="font-medium text-blue-900">{selectedDebug.script}</span></div>
                        <div><span className="text-blue-600">Confidence:</span> <span className="font-medium text-blue-900">{(selectedDebug.confidence * 100).toFixed(0)}%</span></div>
                        <div><span className="text-blue-600">Emojis:</span> <span className="font-medium text-blue-900">{selectedDebug.shouldUseEmojis ? "Yes" : "No"}</span></div>
                      </div>
                    </div>

                    {/* Intent & Response */}
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-800">AI Response</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-purple-600">Intent:</span> <span className="font-medium text-purple-900">{selectedDebug.intent}</span></div>
                        <div><span className="text-purple-600">AI Confidence:</span> <span className="font-medium text-purple-900">{(selectedDebug.aiConfidence * 100).toFixed(0)}%</span></div>
                        <div><span className="text-purple-600">Tokens:</span> <span className="font-medium text-purple-900">{selectedDebug.tokensUsed}</span></div>
                        <div><span className="text-purple-600">Escalate:</span> <span className="font-medium text-purple-900">{selectedDebug.shouldEscalate ? "Yes ⚠️" : "No"}</span></div>
                      </div>
                    </div>

                    {/* Performance */}
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-800">Performance</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-emerald-600">Response Time:</span>{" "}
                        <span className="font-bold text-emerald-900">{selectedDebug.responseTimeMs}ms</span>
                        {selectedDebug.responseTimeMs < 3000 && <Badge variant="success" className="ml-2">Fast</Badge>}
                        {selectedDebug.responseTimeMs >= 3000 && selectedDebug.responseTimeMs < 5000 && <Badge variant="warning" className="ml-2">Slow</Badge>}
                        {selectedDebug.responseTimeMs >= 5000 && <Badge variant="danger" className="ml-2">Too Slow</Badge>}
                      </div>
                    </div>

                    {/* Actions */}
                    {selectedDebug.actions.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <span className="text-xs font-semibold text-amber-800">Actions Triggered:</span>
                        <pre className="text-xs text-amber-900 mt-1 overflow-x-auto">
                          {JSON.stringify(selectedDebug.actions, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted text-center py-4">
                    Send a message to see debug information
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Stats */}
          {messages.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Session Stats</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Messages</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Bot Replies</span>
                  <span className="font-medium">{messages.filter((m) => m.role === "assistant").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Avg Response</span>
                  <span className="font-medium">
                    {messages.filter((m) => m.debug).length > 0
                      ? Math.round(
                          messages
                            .filter((m) => m.debug)
                            .reduce((sum, m) => sum + (m.debug?.responseTimeMs || 0), 0) /
                            messages.filter((m) => m.debug).length
                        ) + "ms"
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Tokens</span>
                  <span className="font-medium">
                    {messages.filter((m) => m.debug).reduce((sum, m) => sum + (m.debug?.tokensUsed || 0), 0)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
