import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Webhook,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WEBHOOK_EVENTS = [
  { value: "message.received", label: "Message Received", description: "When a user sends a message" },
  { value: "message.sent", label: "Message Sent", description: "When the bot sends a response" },
  { value: "session.started", label: "Session Started", description: "When a new chat session begins" },
  { value: "session.ended", label: "Session Ended", description: "When a chat session ends" },
  { value: "feedback.submitted", label: "Feedback Submitted", description: "When a user submits feedback" },
] as const;

export default function Webhooks() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<number | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: webhooks, isLoading } = trpc.webhook.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created successfully");
      setIsCreateOpen(false);
      setSelectedEvents([]);
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create webhook");
    },
  });

  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated");
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update webhook");
    },
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      setDeleteWebhookId(null);
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete webhook");
    },
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Webhook test successful!");
      } else {
        toast.error(`Webhook test failed: ${data.message}`);
      }
      setTestingWebhookId(null);
      utils.webhook.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to test webhook");
      setTestingWebhookId(null);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (selectedEvents.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    createMutation.mutate({
      name: formData.get("name") as string,
      url: formData.get("url") as string,
      events: selectedEvents as ("message.received" | "message.sent" | "session.started" | "session.ended" | "feedback.submitted")[],
    });
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleTest = (id: number) => {
    setTestingWebhookId(id);
    testMutation.mutate({ id });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhooks to receive real-time notifications for events
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>
                  Set up a webhook endpoint to receive event notifications
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="My Webhook"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="https://example.com/webhook"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Events</Label>
                  <div className="space-y-3 rounded-md border p-4">
                    {WEBHOOK_EVENTS.map((event) => (
                      <div key={event.value} className="flex items-start space-x-3">
                        <Checkbox
                          id={event.value}
                          checked={selectedEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                        />
                        <div className="grid gap-1 leading-none">
                          <label
                            htmlFor={event.value}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {event.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Webhook"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                      {webhook.isActive ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {(webhook.failureCount ?? 0) > 0 && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {webhook.url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.isActive === 1}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({
                          id: webhook.id,
                          isActive: checked ? 1 : 0,
                        });
                      }}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleTest(webhook.id)}
                          disabled={testingWebhookId === webhook.id}
                        >
                          {testingWebhookId === webhook.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Test Webhook
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteWebhookId(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {webhook.events?.map((event) => (
                    <Badge key={event} variant="outline">
                      {event}
                    </Badge>
                  ))}
                </div>
                {webhook.lastTriggeredAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Webhook className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Webhooks Yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Create webhooks to receive real-time notifications when events occur in your chatbots
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create First Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteWebhookId !== null} onOpenChange={() => setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteWebhookId) {
                  deleteMutation.mutate({ id: deleteWebhookId });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
