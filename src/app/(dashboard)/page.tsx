import {
  Users,
  MessageSquare,
  Bot,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import ConversationItem from "@/components/dashboard/ConversationItem";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/layout/PageHeader";

const recentConversations = [
  {
    name: "Priya Mehta",
    lastMessage: "What are your membership plans?",
    time: "2m ago",
    unread: 2,
    isAiReplied: true,
  },
  {
    name: "Amit Kumar",
    lastMessage: "I'd like to book a session for tomorrow",
    time: "15m ago",
    unread: 0,
    isAiReplied: true,
  },
  {
    name: "Sneha Patel",
    lastMessage: "Thanks! I'll come in at 5 PM",
    time: "1h ago",
    unread: 0,
    isAiReplied: false,
  },
  {
    name: "Rajesh Gupta",
    lastMessage: "Do you have personal training?",
    time: "2h ago",
    unread: 1,
    isAiReplied: true,
  },
  {
    name: "Kavita Singh",
    lastMessage: "What's the timing on weekends?",
    time: "3h ago",
    unread: 0,
    isAiReplied: true,
  },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your WhatsApp automation"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Leads"
          value="284"
          change="+12% from last week"
          changeType="positive"
          icon={Users}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <StatsCard
          title="Messages Today"
          value="47"
          change="+8 from yesterday"
          changeType="positive"
          icon={MessageSquare}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatsCard
          title="AI Replies"
          value="39"
          change="83% auto-handled"
          changeType="neutral"
          icon={Bot}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatsCard
          title="Conversion Rate"
          value="24%"
          change="+3% from last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <Card padding="none" className="lg:col-span-2">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary">
              Recent Conversations
            </h2>
            <a
              href="/conversations"
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="divide-y divide-border">
            {recentConversations.map((conv) => (
              <ConversationItem key={conv.name} {...conv} />
            ))}
          </div>
        </Card>

        {/* Quick Stats / Activity */}
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">
            AI Performance
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Avg Response Time</span>
              <span className="text-sm font-semibold text-text-primary">
                &lt; 3 sec
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Auto-handled</span>
              <span className="text-sm font-semibold text-emerald-600">83%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Escalated to Owner</span>
              <span className="text-sm font-semibold text-text-primary">17%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Customer Satisfaction</span>
              <span className="text-sm font-semibold text-text-primary">4.7/5</span>
            </div>

            <hr className="border-border" />

            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">
                Top Queries Today
              </h3>
              <div className="space-y-2">
                {["Pricing inquiry", "Timing/hours", "Booking request", "Service details"].map(
                  (query, i) => (
                    <div key={query} className="flex items-center gap-2">
                      <span className="text-xs text-text-muted w-4">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-text-secondary">{query}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
