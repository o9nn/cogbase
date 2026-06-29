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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Plus, MoreVertical, Eye, Trash2, Edit, Layout, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
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

export default function UiFlows() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteFlowId, setDeleteFlowId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [createMode, setCreateMode] = useState<"blank" | "template">("blank");

  const { data: flows, isLoading, refetch } = trpc.uiFlow.list.useQuery();
  const { data: flowTemplates } = trpc.template.listFlowTemplates.useQuery({});
  const utils = trpc.useUtils();

  const createMutation = trpc.uiFlow.create.useMutation({
    onSuccess: (data) => {
      toast.success("UI Flow created successfully");
      setIsCreateOpen(false);
      utils.uiFlow.list.invalidate();
      setLocation(`/ui-flows/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create UI Flow");
    },
  });

  const createFromTemplateMutation = trpc.template.createFlowFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success("UI Flow created from template");
      setIsCreateOpen(false);
      setSelectedTemplate(null);
      utils.uiFlow.list.invalidate();
      setLocation(`/ui-flows/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create flow from template");
    },
  });

  const deleteMutation = trpc.uiFlow.delete.useMutation({
    onSuccess: () => {
      toast.success("UI Flow deleted successfully");
      setDeleteFlowId(null);
      utils.uiFlow.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete UI Flow");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (createMode === "template" && selectedTemplate) {
      createFromTemplateMutation.mutate({
        templateId: selectedTemplate,
        name,
        description,
      });
    } else {
      createMutation.mutate({ name, description });
    }
  };

  const categoryColors: Record<string, string> = {
    customer_support: "bg-blue-500/10 text-blue-500",
    onboarding: "bg-green-500/10 text-green-500",
    faq: "bg-yellow-500/10 text-yellow-500",
    sales: "bg-purple-500/10 text-purple-500",
    booking: "bg-pink-500/10 text-pink-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UI Flows</h1>
          <p className="text-muted-foreground">
            Design and visualize conversational flows with canvas-based UI builder
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setSelectedTemplate(null);
            setCreateMode("blank");
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Flow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New UI Flow</DialogTitle>
                <DialogDescription>
                  Start from scratch or use a pre-built template
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "blank" | "template")} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="blank" className="flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    Blank Flow
                  </TabsTrigger>
                  <TabsTrigger value="template" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    From Template
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="blank" className="mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Customer Support Flow"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="A flow for handling customer support inquiries..."
                        rows={3}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="template" className="mt-4">
                  <div className="grid gap-4">
                    {/* Template Selection */}
                    <div className="grid gap-2">
                      <Label>Select a Template</Label>
                      <ScrollArea className="h-[300px] rounded-md border p-4">
                        <div className="grid gap-3">
                          {flowTemplates?.map((template) => (
                            <Card
                              key={template.id}
                              className={`cursor-pointer transition-all ${
                                selectedTemplate === template.id
                                  ? "ring-2 ring-primary border-primary"
                                  : "hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedTemplate(template.id)}
                            >
                              <CardHeader className="p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="text-base">{template.name}</CardTitle>
                                    <CardDescription className="text-sm mt-1">
                                      {template.description}
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {template.category && (
                                      <Badge 
                                        variant="secondary"
                                        className={categoryColors[template.category] || ""}
                                      >
                                        {template.category.replace("_", " ")}
                                      </Badge>
                                    )}
                                    {template.usageCount > 0 && (
                                      <Badge variant="outline" className="flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        {template.usageCount}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                          {(!flowTemplates || flowTemplates.length === 0) && (
                            <p className="text-center text-muted-foreground py-8">
                              No templates available yet
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {/* Name Override */}
                    <div className="grid gap-2">
                      <Label htmlFor="template-name">Flow Name</Label>
                      <Input
                        id="template-name"
                        name="name"
                        placeholder={selectedTemplate 
                          ? flowTemplates?.find(t => t.id === selectedTemplate)?.name 
                          : "My Flow"
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="template-description">Description (optional)</Label>
                      <Textarea
                        id="template-description"
                        name="description"
                        placeholder="Customize the description..."
                        rows={2}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button 
                  type="submit" 
                  disabled={
                    createMutation.isPending || 
                    createFromTemplateMutation.isPending ||
                    (createMode === "template" && !selectedTemplate)
                  }
                >
                  {createMutation.isPending || createFromTemplateMutation.isPending 
                    ? "Creating..." 
                    : createMode === "template" 
                      ? "Create from Template" 
                      : "Create Flow"
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Flows Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
      ) : flows && flows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    {flow.description && (
                      <CardDescription className="line-clamp-2">
                        {flow.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/ui-flows/${flow.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Open Canvas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/ui-flows/${flow.id}/edit`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteFlowId(flow.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    <span>{new Date(flow.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Updated</span>
                    <span>{new Date(flow.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocation(`/ui-flows/${flow.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Open Canvas
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No UI Flows Yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Create your first UI flow to design conversational interfaces with an interactive canvas
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create First Flow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteFlowId !== null} onOpenChange={() => setDeleteFlowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UI Flow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this UI flow? This will also delete all frames and
              connections. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteFlowId) {
                  deleteMutation.mutate({ id: deleteFlowId });
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
