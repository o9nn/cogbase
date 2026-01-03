import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

interface RagTrainingProps {
  agentId: number;
}

export function RagTraining({ agentId }: RagTrainingProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  const { data: config, refetch: refetchConfig } = trpc.rag.getConfig.useQuery({ agentId });
  const { data: documents, refetch: refetchDocuments } = trpc.rag.listDocuments.useQuery({ agentId });
  const utils = trpc.useUtils();

  const updateConfigMutation = trpc.rag.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("RAG configuration updated");
      refetchConfig();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update configuration");
    },
  });

  const uploadDocumentMutation = trpc.rag.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
    },
  });

  const deleteDocumentMutation = trpc.rag.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      setDeleteDocId(null);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf|csv)$/i)) {
      toast.error("Unsupported file type. Please upload .txt, .md, .pdf, or .csv files.");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      uploadDocumentMutation.mutate({
        agentId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content,
      });
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* RAG Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>RAG Configuration</CardTitle>
          <CardDescription>
            Configure Retrieval-Augmented Generation settings for this agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable RAG</Label>
              <p className="text-sm text-muted-foreground">
                Use training documents to enhance responses
              </p>
            </div>
            <Switch
              checked={config?.enabled === 1}
              onCheckedChange={(checked) =>
                updateConfigMutation.mutate({
                  agentId,
                  enabled: checked ? 1 : 0,
                })
              }
            />
          </div>

          {config?.enabled === 1 && (
            <>
              <div className="space-y-2">
                <Label>Chunk Size: {config.chunkSize}</Label>
                <Slider
                  value={[config.chunkSize || 512]}
                  onValueChange={([value]) =>
                    updateConfigMutation.mutate({
                      agentId,
                      chunkSize: value,
                    })
                  }
                  min={128}
                  max={2048}
                  step={128}
                />
                <p className="text-xs text-muted-foreground">
                  Size of text chunks for embedding (characters)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Top K Results: {config.topK}</Label>
                <Slider
                  value={[config.topK || 3]}
                  onValueChange={([value]) =>
                    updateConfigMutation.mutate({
                      agentId,
                      topK: value,
                    })
                  }
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Number of relevant chunks to retrieve
                </p>
              </div>

              <div className="space-y-2">
                <Label>Similarity Threshold: {config.similarityThreshold}</Label>
                <Slider
                  value={[parseFloat(config.similarityThreshold || "0.7") * 100]}
                  onValueChange={([value]) =>
                    updateConfigMutation.mutate({
                      agentId,
                      similarityThreshold: (value / 100).toFixed(2),
                    })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum similarity score for retrieval (0-1)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Training Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Training Documents</CardTitle>
              <CardDescription>
                Upload documents to train your agent with specific knowledge
              </CardDescription>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize ?? undefined)}</span>
                        <span>•</span>
                        <span>{doc.chunkCount || 0} chunks</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusIcon(doc.status)}
                    <Badge variant={doc.status === "completed" ? "default" : "secondary"}>
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDocId(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No training documents uploaded yet</p>
              <p className="text-sm">Upload documents to enhance your agent's knowledge</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDocId !== null} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will also remove all associated embeddings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDocId) {
                  deleteDocumentMutation.mutate({ documentId: deleteDocId });
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
