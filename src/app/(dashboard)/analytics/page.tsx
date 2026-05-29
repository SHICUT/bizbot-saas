import { TrendingUp, Users, MessageSquare, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/layout/PageHeader";
import StatsCard from "@/components/dashboard/StatsCard";

const weeklyData = [
  { day: "Mon", messages: 42, leads: 8 },
  { day: "Tue", messages: 38, leads: 5 },
  { day: "Wed", messages: 55, leads: 12 },
  { day: "Thu", messages: 47, leads: 9 },
  { day: "Fri", messages: 63, leads: 14 },
  { day: "Sat", messages: 71, leads: 18 },
  { day: "Sun", messages: 29, leads: 4 },
];

const topQueries = [
  { query: "Pricing / Plans", count: 89, percentage: 32 },
  { query: "Timings / Hours", count: 67, percentage: 24 },
  { query: "Booking Request", count: 52, percentage: 19 },
  { query: "Location / Address", count: 38, percentage: 14 },
  { query: "Free Trial", count: 31, percentage: 11 },
];

export default function AnalyticsPage() {
  const maxMessages = Math.max(...weeklyData.map((d) => d.messages));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Track your WhatsApp automation performance"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Messages"
          value="1,247"
          change="+18% vs last week"
          changeType="positive"
          icon={MessageSquare}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <StatsCard
          title="New Leads"
          value="70"
          change="+24% vs last week"
          changeType="positive"
          icon={Users}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatsCard
          title="Avg Response Time"
          value="2.3s"
          change="AI-powered"
          changeType="neutral"
          icon={Clock}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatsCard
          title="Conversion Rate"
          value="24%"
          change="+3% vs last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-base font-semibold text-text-primary mb-6">
            Messages This Week
          </h3>
          <div className="flex items-end justify-between gap-2 h-48">
            {weeklyData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-text-primary">
                    {data.messages}
                  </span>
                  <div
                    className="w-full max-w-[40px] bg-primary/20 rounded-t-md relative overflow-hidden"
                    style={{ height: `${(data.messages / maxMessages) * 140}px` }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md"
                      style={{
                        height: `${(data.leads / data.messages) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-text-muted">{data.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary/20" />
              <span className="text-xs text-text-secondary">Total Messages</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-xs text-text-secondary">New Leads</span>
            </div>
          </div>
        </Card>

        {/* Top Queries */}
        <Card>
          <h3 className="text-base font-semibold text-text-primary mb-4">
            Top Customer Queries
          </h3>
          <div className="space-y-4">
            {topQueries.map((item) => (
              <div key={item.query}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-text-secondary">
                    {item.query}
                  </span>
                  <span className="text-xs font-medium text-text-primary">
                    {item.count}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
