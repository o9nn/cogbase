import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export default function ApiUsage() {
  const { data: usageData, isLoading } = trpc.apiUsage.getUsage.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();

  // Generate mock data for charts (in production, this comes from the API)
  const dailyUsage = usageData?.dailyUsage || generateMockDailyUsage();
  const endpointStats = usageData?.endpointStats || generateMockEndpointStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Usage</h1>
        <p className="text-muted-foreground">
          Track your API calls, token usage, and costs
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  API Calls Today
                </CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {usageData?.totalCallsToday || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  {usageData?.callsChangePercent || 0}% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tokens Used
                </CardTitle>
                <Zap className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatNumber(usageData?.totalTokens || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This billing period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Response Time
                </CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {usageData?.avgResponseTime || 0}ms
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all endpoints
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Est. Cost
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${(usageData?.estimatedCost || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI API charges
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Quota */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle>Usage Quota</CardTitle>
                <CardDescription>
                  Your current plan usage for this billing period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const usageRatio = settings.creditsTotal > 0
                      ? settings.creditsUsed / settings.creditsTotal
                      : 0;
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Credits Used</p>
                            <p className="text-sm text-muted-foreground">
                              {settings.creditsUsed} of {settings.creditsTotal} credits
                            </p>
                          </div>
                          <Badge
                            variant={
                              usageRatio > 0.9
                                ? "destructive"
                                : usageRatio > 0.7
                                ? "secondary"
                                : "default"
                            }
                          >
                            {(usageRatio * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <Progress
                          value={usageRatio * 100}
                          className="h-2"
                        />
                      </>
                    );
                  })()}
                  {settings.creditsResetAt && (
                    <p className="text-xs text-muted-foreground">
                      Resets on {new Date(settings.creditsResetAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Stats */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily Usage</TabsTrigger>
              <TabsTrigger value="endpoints">By Endpoint</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Calls Over Time</CardTitle>
                  <CardDescription>
                    Daily API call volume for the past 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyUsage}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="calls"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Token Usage Over Time</CardTitle>
                  <CardDescription>
                    Daily token consumption for the past 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyUsage}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="tokens"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="endpoints" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Endpoints</CardTitle>
                  <CardDescription>
                    Most frequently used API endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const maxCalls = Math.max(...endpointStats.map(e => e.calls), 1);
                      return endpointStats.map((endpoint, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {endpoint.method}
                              </Badge>
                              <span className="font-mono text-sm">{endpoint.path}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{endpoint.calls} calls</span>
                              <span>{endpoint.avgTime}ms avg</span>
                            </div>
                          </div>
                          <Progress
                            value={(endpoint.calls / maxCalls) * 100}
                            className="h-1"
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function generateMockDailyUsage() {
  const data = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calls: Math.floor(Math.random() * 100) + 20,
      tokens: Math.floor(Math.random() * 5000) + 1000,
    });
  }
  return data;
}

function generateMockEndpointStats() {
  return [
    { method: "POST", path: "/chat/message", calls: 245, avgTime: 423 },
    { method: "GET", path: "/agent/list", calls: 156, avgTime: 45 },
    { method: "POST", path: "/rag/query", calls: 89, avgTime: 312 },
    { method: "GET", path: "/analytics/dashboard", calls: 67, avgTime: 89 },
    { method: "POST", path: "/export/csv", calls: 23, avgTime: 567 },
  ];
}
