import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  User,
  Bot,
  Settings,
  Shield,
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "agent.create", label: "Agent Created" },
  { value: "agent.update", label: "Agent Updated" },
  { value: "agent.delete", label: "Agent Deleted" },
  { value: "document.upload", label: "Document Uploaded" },
  { value: "document.delete", label: "Document Deleted" },
  { value: "flow.create", label: "Flow Created" },
  { value: "flow.update", label: "Flow Updated" },
  { value: "flow.delete", label: "Flow Deleted" },
  { value: "settings.update", label: "Settings Updated" },
  { value: "auth.login", label: "Login" },
  { value: "auth.logout", label: "Logout" },
];

const getActionIcon = (action: string) => {
  if (action.startsWith("agent")) return <Bot className="w-4 h-4" />;
  if (action.startsWith("document") || action.startsWith("flow"))
    return <FileText className="w-4 h-4" />;
  if (action.startsWith("settings")) return <Settings className="w-4 h-4" />;
  if (action.startsWith("auth")) return <Shield className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
};

const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  if (action.includes("delete")) return "destructive";
  if (action.includes("create")) return "default";
  if (action.includes("update")) return "secondary";
  return "outline";
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, refetch } = trpc.auditLog.list.useQuery({
    limit,
    offset: (page - 1) * limit,
    action: actionFilter === "all" ? undefined : actionFilter,
  });

  const filteredLogs = data?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      (log.details ? JSON.stringify(log.details).toLowerCase().includes(searchLower) : false) ||
      log.ipAddress?.toLowerCase().includes(searchLower)
    );
  });

  const handleExport = () => {
    if (!filteredLogs) return;

    const csv = [
      ["Timestamp", "Action", "Resource Type", "Resource ID", "Details", "IP Address"].join(","),
      ...filteredLogs.map((log) =>
        [
          new Date(log.createdAt).toISOString(),
          log.action,
          log.resource || "",
          log.resourceId?.toString() || "",
          `"${(log.details ? JSON.stringify(log.details) : "").replace(/"/g, '""')}"`,
          log.ipAddress || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Audit logs exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all changes and activities in your account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {filteredLogs?.length || 0} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.resource && (
                          <span className="text-sm">
                            {log.resource}
                            {log.resourceId && (
                              <span className="text-muted-foreground">
                                #{log.resourceId}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!filteredLogs || filteredLogs.length < limit}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Audit Logs Found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {search || actionFilter !== "all"
                  ? "No logs match your current filters. Try adjusting your search criteria."
                  : "Activity logs will appear here as you use the platform."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
