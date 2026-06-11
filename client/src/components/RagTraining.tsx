import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Clock, Loader2, Search, Eye, Files, History } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RagTrainingProps {
  agentId: number;
}

export function RagTraining({ agentId }: RagTrainingProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("documents");

  const { data: config, refetch: refetchConfig } = trpc.rag.getConfig.useQuery({ agentId });
  const { data: documents, refetch: refetchDocuments } = trpc.rag.listDocuments.useQuery({ agentId });
  
  // Document preview query
  const { data: documentPreview, isLoading: isLoadingPreview } = trpc.rag.getDocument.useQuery(
    { documentId: previewDocId! },
    { enabled: previewDocId !== null }
  );
  
  // Search query
  const { data: searchResults, isLoading: isSearching } = trpc.rag.searchDocuments.useQuery(
    { agentId, query: searchQuery, limit: 20 },
    { enabled: searchQuery.length >= 2 }
  );
  
  // Document versions query
  const { data: documentVersions } = trpc.rag.getDocumentVersions.useQuery(
    { documentId: previewDocId! },
    { enabled: previewDocId !== null }
  );

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

  const bulkUploadMutation = trpc.rag.uploadDocuments.useMutation({
    onSuccess: (data) => {
      toast.success(`Uploaded ${data.totalUploaded} of ${data.results.length} documents`);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload documents");
    },
  });

  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];
  const allowedExtensions = /\.(txt|md|pdf|csv|docx|xlsx|pptx|ppt)$/i;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type - use a whitelist approach for security
    if (!allowedTypes.includes(file.type) && !file.name.match(allowedExtensions)) {
      toast.error("Unsupported file type. Please upload .txt, .md, .pdf, .csv, .docx, .xlsx, .pptx, or .ppt files.");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    // Note: Server-side validation should also verify file content
    // Client-side checks are for UX only and can be bypassed
    
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

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const documentsToUpload: Array<{
      fileName: string;
      fileType: string;
      fileSize: number;
      content: string;
    }> = [];

    const validFiles: File[] = [];
    
    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      if (!allowedTypes.includes(file.type) && !file.name.match(allowedExtensions)) {
        toast.error(`${file.name} has unsupported file type`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      toast.error("No valid files to upload");
      return;
    }

    if (validFiles.length > 20) {
      toast.error("Maximum 20 files can be uploaded at once");
      return;
    }

    // Read all files
    const readPromises = validFiles.map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          documentsToUpload.push({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            content: e.target?.result as string,
          });
          resolve();
        };
        reader.readAsText(file);
      });
    });

    await Promise.all(readPromises);

    // Upload all documents
    bulkUploadMutation.mutate({
      agentId,
      documents: documentsToUpload,
    });

    // Reset input
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = "";
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => bulkFileInputRef.current?.click()}>
                <Files className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.csv,.docx,.xlsx,.pptx,.ppt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={bulkFileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.csv,.docx,.xlsx,.pptx,.ppt"
            onChange={handleBulkUpload}
            multiple
            className="hidden"
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents ({documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="w-4 h-4 mr-2" />
                Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
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
                            {doc.version && doc.version > 1 && (
                              <>
                                <span>•</span>
                                <span>v{doc.version}</span>
                              </>
                            )}
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
                          onClick={() => setPreviewDocId(doc.id)}
                          title="Preview document"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDocId(doc.id)}
                          title="Delete document"
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
                  <p className="text-xs mt-2">Supported: .txt, .md, .pdf, .csv, .docx, .xlsx, .pptx, .ppt</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search within documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setPreviewDocId(result.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{result.fileName}</span>
                        </div>
                        <Badge variant="secondary">{result.matchCount} matches</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{result.preview}</p>
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Enter at least 2 characters to search</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={previewDocId !== null} onOpenChange={() => setPreviewDocId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {documentPreview?.fileName || "Document Preview"}
            </DialogTitle>
            <DialogDescription>
              {documentPreview && (
                <span className="flex items-center gap-2">
                  {formatFileSize(documentPreview.fileSize ?? undefined)} • 
                  {documentPreview.chunkCount || documentPreview.chunks?.length || 0} chunks • 
                  {documentPreview.status}
                  {documentPreview.version && documentPreview.version > 1 && (
                    <Badge variant="outline" className="ml-2">
                      <History className="w-3 h-3 mr-1" />
                      v{documentPreview.version}
                    </Badge>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : documentPreview ? (
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="chunks">Chunks ({documentPreview.chunks?.length || 0})</TabsTrigger>
                {documentVersions && documentVersions.length > 0 && (
                  <TabsTrigger value="history">History ({documentVersions.length})</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="preview">
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {documentPreview.preview}
                  </pre>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="chunks">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 p-1">
                    {documentPreview.chunks?.map((chunk, index) => (
                      <div key={chunk.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">Chunk {chunk.chunkIndex + 1}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {chunk.content.length} chars
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {documentVersions && documentVersions.length > 0 && (
                <TabsContent value="history">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 p-1">
                      {documentVersions.map((version) => (
                        <div key={version.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">v{version.version}</Badge>
                              <span className="text-sm">
                                {new Date(version.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {version.chunkCount || 0} chunks
                            </span>
                          </div>
                          {version.changeDescription && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {version.changeDescription}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

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
