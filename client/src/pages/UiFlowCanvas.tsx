import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, Move, Link2, Save, Eye, EyeOff, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface Frame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export default function UiFlowCanvas() {
  const params = useParams<{ id: string }>();
  const flowId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [mermaidCode, setMermaidCode] = useState("");

  const { data: flow, isLoading } = trpc.uiFlow.get.useQuery({ id: flowId });
  const utils = trpc.useUtils();

  const createFrameMutation = trpc.uiFlow.createFrame.useMutation({
    onSuccess: () => {
      toast.success("Frame created");
      utils.uiFlow.get.invalidate({ id: flowId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create frame");
    },
  });

  const updateFrameMutation = trpc.uiFlow.updateFrame.useMutation({
    onSuccess: () => {
      utils.uiFlow.get.invalidate({ id: flowId });
    },
  });

  const deleteFrameMutation = trpc.uiFlow.deleteFrame.useMutation({
    onSuccess: () => {
      toast.success("Frame deleted");
      utils.uiFlow.get.invalidate({ id: flowId });
    },
  });

  const createConnectionMutation = trpc.uiFlow.createConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection created");
      utils.uiFlow.get.invalidate({ id: flowId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create connection");
    },
  });

  const deleteConnectionMutation = trpc.uiFlow.deleteConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection deleted");
      utils.uiFlow.get.invalidate({ id: flowId });
    },
  });

  const updateFlowMutation = trpc.uiFlow.update.useMutation({
    onSuccess: () => {
      toast.success("Mermaid diagram saved");
      utils.uiFlow.get.invalidate({ id: flowId });
    },
  });

  useEffect(() => {
    if (flow) {
      // Load frames
      const loadedFrames = flow.frames?.map((f) => ({
        id: f.frameId,
        name: f.name,
        x: f.positionX || 0,
        y: f.positionY || 0,
        width: f.width || 300,
        height: f.height || 200,
        type: f.type || "screen",
      })) || [];
      setFrames(loadedFrames);

      // Load connections
      const loadedConnections = flow.connections?.map((c) => ({
        id: c.connectionId,
        sourceId: c.sourceFrameId,
        targetId: c.targetFrameId,
        label: c.label || undefined,
      })) || [];
      setConnections(loadedConnections);

      // Load mermaid diagram
      setMermaidCode(flow.mermaidDiagram || "");
    }
  }, [flow]);

  const handleAddFrame = () => {
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      name: `Frame ${frames.length + 1}`,
      x: 100 + frames.length * 50,
      y: 100 + frames.length * 50,
      width: 300,
      height: 200,
      type: "screen",
    };

    setFrames([...frames, newFrame]);

    // Save to backend
    createFrameMutation.mutate({
      flowId,
      frameId: newFrame.id,
      name: newFrame.name,
      type: newFrame.type,
      positionX: newFrame.x,
      positionY: newFrame.y,
      width: newFrame.width,
      height: newFrame.height,
    });
  };

  const handleFrameMouseDown = (frameId: string, e: React.MouseEvent) => {
    if (isConnecting) return;
    
    e.stopPropagation();
    setSelectedFrame(frameId);
    setIsDragging(true);

    const frame = frames.find((f) => f.id === frameId);
    if (frame) {
      setDragOffset({
        x: e.clientX - frame.x,
        y: e.clientY - frame.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedFrame) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      setFrames(
        frames.map((f) =>
          f.id === selectedFrame ? { ...f, x: newX, y: newY } : f
        )
      );
    }
  };

  const handleMouseUp = () => {
    if (isDragging && selectedFrame) {
      const frame = frames.find((f) => f.id === selectedFrame);
      if (frame) {
        // Find the DB id for this frame
        const dbFrame = flow?.frames?.find((f) => f.frameId === selectedFrame);
        if (dbFrame) {
          updateFrameMutation.mutate({
            id: dbFrame.id,
            positionX: frame.x,
            positionY: frame.y,
          });
        }
      }
    }
    setIsDragging(false);
  };

  const handleDeleteFrame = (frameId: string) => {
    setFrames(frames.filter((f) => f.id !== frameId));
    setConnections(
      connections.filter((c) => c.sourceId !== frameId && c.targetId !== frameId)
    );

    const dbFrame = flow?.frames?.find((f) => f.frameId === frameId);
    if (dbFrame) {
      deleteFrameMutation.mutate({ id: dbFrame.id, flowId });
    }
  };

  const handleStartConnection = (frameId: string) => {
    setIsConnecting(true);
    setConnectingFrom(frameId);
  };

  const handleEndConnection = (targetId: string) => {
    if (isConnecting && connectingFrom && connectingFrom !== targetId) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        sourceId: connectingFrom,
        targetId,
      };

      setConnections([...connections, newConnection]);

      // Save to backend
      createConnectionMutation.mutate({
        flowId,
        connectionId: newConnection.id,
        sourceFrameId: newConnection.sourceId,
        targetFrameId: newConnection.targetId,
      });
    }
    setIsConnecting(false);
    setConnectingFrom(null);
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnections(connections.filter((c) => c.id !== connectionId));

    const dbConnection = flow?.connections?.find((c) => c.connectionId === connectionId);
    if (dbConnection) {
      deleteConnectionMutation.mutate({ id: dbConnection.id, flowId });
    }
  };

  const generateMermaidDiagram = () => {
    let mermaid = "graph TD\n";
    
    frames.forEach((frame) => {
      mermaid += `  ${frame.id}[${frame.name}]\n`;
    });

    connections.forEach((conn) => {
      const label = conn.label ? `|${conn.label}|` : "";
      mermaid += `  ${conn.sourceId} -->${label} ${conn.targetId}\n`;
    });

    setMermaidCode(mermaid);
  };

  const saveMermaidDiagram = () => {
    updateFlowMutation.mutate({
      id: flowId,
      mermaidDiagram: mermaidCode,
    });
  };

  const exportAsImage = () => {
    // This would require a library like html2canvas
    toast.info("Export feature coming soon");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Flow not found</h2>
        <Button variant="outline" onClick={() => setLocation("/ui-flows")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to UI Flows
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/ui-flows")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{flow.name}</h1>
            {flow.description && (
              <p className="text-sm text-muted-foreground">{flow.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
          >
            {showGrid ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Grid
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Mermaid
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[600px] sm:max-w-[600px]">
              <SheetHeader>
                <SheetTitle>Mermaid Diagram</SheetTitle>
                <SheetDescription>
                  View and edit the Mermaid diagram representation of your flow
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Diagram Code</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateMermaidDiagram}
                    >
                      Generate from Canvas
                    </Button>
                  </div>
                  <Textarea
                    value={mermaidCode}
                    onChange={(e) => setMermaidCode(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                    placeholder="graph TD&#10;  A[Start] --> B[End]"
                  />
                </div>
                <Button onClick={saveMermaidDiagram} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Diagram
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Button size="sm" onClick={handleAddFrame}>
            <Plus className="w-4 h-4 mr-2" />
            Add Frame
          </Button>
          <Button size="sm" variant="outline" onClick={exportAsImage}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto bg-muted/20">
        <div
          ref={canvasRef}
          className={`absolute inset-0 ${showGrid ? "bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(to_right,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]" : ""}`}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => {
            if (isConnecting) {
              setIsConnecting(false);
              setConnectingFrom(null);
            }
          }}
        >
          {/* Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map((conn) => {
              const source = frames.find((f) => f.id === conn.sourceId);
              const target = frames.find((f) => f.id === conn.targetId);
              if (!source || !target) return null;

              const x1 = source.x + source.width / 2;
              const y1 = source.y + source.height / 2;
              const x2 = target.x + target.width / 2;
              const y2 = target.y + target.height / 2;

              return (
                <g key={conn.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="10"
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    className="cursor-pointer pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConnection(conn.id);
                    }}
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs pointer-events-none"
                    fill="hsl(var(--primary))"
                  >
                    ×
                  </text>
                </g>
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" />
              </marker>
            </defs>
          </svg>

          {/* Frames */}
          {frames.map((frame) => (
            <div
              key={frame.id}
              className={`absolute bg-background border-2 rounded-lg shadow-lg cursor-move transition-all ${
                selectedFrame === frame.id
                  ? "border-primary shadow-xl"
                  : "border-border hover:border-primary/50"
              }`}
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
                zIndex: selectedFrame === frame.id ? 10 : 2,
              }}
              onMouseDown={(e) => handleFrameMouseDown(frame.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                if (isConnecting) {
                  handleEndConnection(frame.id);
                }
              }}
            >
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{frame.type}</Badge>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartConnection(frame.id);
                      }}
                    >
                      <Link2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFrame(frame.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-2">{frame.name}</h3>
                <div className="flex-1 bg-muted/50 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                  Frame Content
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {frames.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Start Building Your Flow</CardTitle>
                  <CardDescription>
                    Add frames to the canvas and connect them to create your conversational flow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleAddFrame} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Frame
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t p-2 flex items-center justify-between text-sm text-muted-foreground bg-background">
        <div className="flex items-center gap-4">
          <span>{frames.length} frames</span>
          <span>{connections.length} connections</span>
          {isConnecting && (
            <Badge variant="secondary">
              <Link2 className="w-3 h-3 mr-1" />
              Connecting from {connectingFrom}...
            </Badge>
          )}
        </div>
        <div>
          {selectedFrame && <span>Selected: {selectedFrame}</span>}
        </div>
      </div>
    </div>
  );
}
