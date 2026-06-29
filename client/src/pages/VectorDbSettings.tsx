import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Database,
  CheckCircle,
  XCircle,
  HardDrive,
  FileText,
  Bot,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function VectorDbSettings() {
  const { data: config, isLoading: configLoading } = trpc.vectorDb.getConfig.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.vectorDb.getStats.useQuery();

  const isLoading = configLoading || statsLoading;

  const getAdapterIcon = (type: string) => {
    switch (type) {
      case "mysql":
        return <Database className="w-5 h-5" />;
      case "pinecone":
        return <HardDrive className="w-5 h-5" />;
      case "weaviate":
        return <HardDrive className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vector Database</h1>
        <p className="text-muted-foreground">
          Manage your vector database configuration and view storage statistics
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="adapters">Adapters</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Current Adapter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Current Vector Database
                </CardTitle>
                <CardDescription>
                  The active vector database backend for storing embeddings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getAdapterIcon(config?.currentAdapter || "mysql")}
                  </div>
                  <div>
                    <p className="text-lg font-semibold capitalize">
                      {config?.currentAdapter || "MySQL"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {config?.currentAdapter === "mysql"
                        ? "Built-in MySQL with JSON column storage"
                        : config?.currentAdapter === "pinecone"
                        ? "Pinecone cloud vector database"
                        : "Weaviate vector database"}
                    </p>
                  </div>
                  <Badge variant="default" className="ml-auto bg-green-500/10 text-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Vectors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalVectors || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalDocuments || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Agents with Embeddings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {stats?.agentStats?.filter((a) => a.vectorCount > 0).length || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="adapters" className="space-y-4">
            <div className="grid gap-4">
              {config?.adapters?.map((adapter) => (
                <Card
                  key={adapter.type}
                  className={adapter.type === config.currentAdapter ? "border-primary" : ""}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getAdapterIcon(adapter.type)}
                        <div>
                          <CardTitle className="text-lg">{adapter.name}</CardTitle>
                          <CardDescription>
                            {adapter.type === "mysql"
                              ? "Default built-in storage using MySQL JSON columns"
                              : adapter.type === "pinecone"
                              ? "High-performance cloud vector database"
                              : "Open-source vector search engine"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {adapter.configured ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Configured
                          </Badge>
                        )}
                        {adapter.type === config.currentAdapter && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {adapter.type === "mysql" && (
                        <p>
                          Uses your existing MySQL database to store embeddings as JSON.
                          Suitable for small to medium workloads.
                        </p>
                      )}
                      {adapter.type === "pinecone" && (
                        <div className="space-y-2">
                          <p>
                            Requires environment variables: PINECONE_API_KEY, PINECONE_ENVIRONMENT,
                            PINECONE_INDEX
                          </p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 text-primary">
                                <Info className="w-4 h-4" />
                                Configuration Guide
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Set environment variables in your .env file</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                      {adapter.type === "weaviate" && (
                        <div className="space-y-2">
                          <p>
                            Requires environment variables: WEAVIATE_URL, WEAVIATE_API_KEY (optional),
                            WEAVIATE_CLASS_NAME
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {/* Per-Agent Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Storage by Agent</CardTitle>
                <CardDescription>
                  Vector embeddings and documents stored for each agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.agentStats && stats.agentStats.length > 0 ? (
                  <div className="space-y-4">
                    {stats.agentStats.map((agent) => (
                      <div key={agent.agentId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{agent.agentName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-4 h-4" />
                              {agent.vectorCount} vectors
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {agent.documentCount} docs
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={
                            stats.totalVectors > 0
                              ? (agent.vectorCount / stats.totalVectors) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No vector data yet</p>
                    <p className="text-sm">Upload documents to your agents to generate embeddings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
