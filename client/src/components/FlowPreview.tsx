/**
 * Flow Preview Component
 * Live preview of conversational flows in a chat-like interface
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  RotateCcw,
  Play,
  ChevronRight,
  User,
  Bot,
  List,
  Grid,
} from "lucide-react";

interface FlowFrame {
  id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
}

interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

interface PreviewMessage {
  id: string;
  type: "assistant" | "user" | "system" | "action";
  content: string;
  frameId?: string;
  options?: string[];
}

interface FlowPreviewProps {
  frames: FlowFrame[];
  connections: FlowConnection[];
  startFrameId?: string;
  onFrameSelect?: (frameId: string) => void;
}

export function FlowPreview({
  frames,
  connections,
  startFrameId,
  onFrameSelect,
}: FlowPreviewProps) {
  const [messages, setMessages] = useState<PreviewMessage[]>([]);
  const [currentFrameId, setCurrentFrameId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find the starting frame
  const findStartFrame = (): string | null => {
    if (startFrameId && frames.find((f) => f.id === startFrameId)) {
      return startFrameId;
    }
    // Find a frame with no incoming connections
    const targetsSet = new Set(connections.map((c) => c.targetId));
    const startFrame = frames.find((f) => !targetsSet.has(f.id));
    return startFrame?.id || frames[0]?.id || null;
  };

  // Get outgoing connections from a frame
  const getOutgoingConnections = (frameId: string): FlowConnection[] => {
    return connections.filter((c) => c.sourceId === frameId);
  };

  // Convert frame to preview messages
  const frameToMessages = (frame: FlowFrame): PreviewMessage[] => {
    const config = frame.config || {};
    const messages: PreviewMessage[] = [];

    switch (frame.type) {
      case "message":
        messages.push({
          id: `${frame.id}-msg`,
          type: config.sender === "user" ? "user" : "assistant",
          content: (config.text as string) || frame.name,
          frameId: frame.id,
        });
        break;

      case "quick-replies":
        messages.push({
          id: `${frame.id}-options`,
          type: "assistant",
          content: "Please select an option:",
          frameId: frame.id,
          options: (config.options as string[]) || [],
        });
        break;

      case "input":
      case "textarea":
        messages.push({
          id: `${frame.id}-input`,
          type: "system",
          content: `📝 ${(config.label as string) || "Enter your response"}`,
          frameId: frame.id,
        });
        break;

      case "card":
        messages.push({
          id: `${frame.id}-card`,
          type: "assistant",
          content: `**${(config.title as string) || frame.name}**\n${(config.description as string) || ""}`,
          frameId: frame.id,
        });
        break;

      case "list":
        const items = (config.items as string[]) || [];
        messages.push({
          id: `${frame.id}-list`,
          type: "assistant",
          content: `${(config.title as string) || "Options"}:\n${items.map((item) => `• ${item}`).join("\n")}`,
          frameId: frame.id,
          options: items,
        });
        break;

      case "carousel":
        const carouselItems = (config.items as Array<{ title: string }>) || [];
        messages.push({
          id: `${frame.id}-carousel`,
          type: "assistant",
          content: `🎠 Swipe to view options`,
          frameId: frame.id,
          options: carouselItems.map((i) => i.title),
        });
        break;

      case "button":
        messages.push({
          id: `${frame.id}-button`,
          type: "action",
          content: (config.text as string) || "Continue",
          frameId: frame.id,
          options: [(config.text as string) || "Continue"],
        });
        break;

      default:
        messages.push({
          id: `${frame.id}-default`,
          type: "assistant",
          content: frame.name,
          frameId: frame.id,
        });
    }

    return messages;
  };

  // Start or restart the flow
  const startFlow = () => {
    const startId = findStartFrame();
    if (!startId) return;

    setMessages([]);
    setCurrentFrameId(startId);
    setIsPlaying(true);

    const frame = frames.find((f) => f.id === startId);
    if (frame) {
      setMessages(frameToMessages(frame));
    }
  };

  // Navigate to next frame
  const navigateToFrame = (frameId: string, userResponse?: string) => {
    // Add user message if provided
    if (userResponse) {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          type: "user",
          content: userResponse,
        },
      ]);
    }

    const frame = frames.find((f) => f.id === frameId);
    if (frame) {
      setCurrentFrameId(frameId);
      onFrameSelect?.(frameId);

      // Add delay for realistic feel
      setTimeout(() => {
        setMessages((prev) => [...prev, ...frameToMessages(frame)]);
      }, 500);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: string) => {
    if (!currentFrameId) return;

    const outgoing = getOutgoingConnections(currentFrameId);

    // Find connection that matches the option label
    const matchingConnection = outgoing.find(
      (c) => c.label?.toLowerCase() === option.toLowerCase()
    );

    if (matchingConnection) {
      navigateToFrame(matchingConnection.targetId, option);
    } else if (outgoing.length === 1) {
      // If only one outgoing connection, use it
      navigateToFrame(outgoing[0].targetId, option);
    } else if (outgoing.length > 0) {
      // Default to first connection
      navigateToFrame(outgoing[0].targetId, option);
    }
  };

  // Handle text input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !currentFrameId) return;

    const outgoing = getOutgoingConnections(currentFrameId);
    if (outgoing.length > 0) {
      navigateToFrame(outgoing[0].targetId, userInput);
    }
    setUserInput("");
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get the last message to determine available actions
  const lastMessage = messages[messages.length - 1];
  const hasOptions = lastMessage?.options && lastMessage.options.length > 0;
  const canContinue =
    currentFrameId && getOutgoingConnections(currentFrameId).length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Flow Preview
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startFlow}
              disabled={frames.length === 0}
            >
              {isPlaying ? (
                <>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restart
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click "Start" to preview your flow</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.type === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.type === "system"
                          ? "bg-muted border border-border"
                          : msg.type === "action"
                            ? "bg-secondary"
                            : "bg-secondary/50"
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center gap-2 mb-1">
                      {msg.type === "assistant" && (
                        <Bot className="w-3 h-3" />
                      )}
                      {msg.type === "user" && <User className="w-3 h-3" />}
                      {msg.frameId && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 cursor-pointer hover:bg-primary/10"
                          onClick={() => msg.frameId && onFrameSelect?.(msg.frameId)}
                        >
                          {frames.find((f) => f.id === msg.frameId)?.name || msg.frameId}
                        </Badge>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                    {/* Options */}
                    {msg.options && msg.options.length > 0 && msg === lastMessage && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.options.map((option, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleOptionSelect(option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        {isPlaying && canContinue && !hasOptions && (
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t flex gap-2"
          >
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your response..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!userInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* End of Flow */}
        {isPlaying && !canContinue && messages.length > 0 && (
          <div className="p-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-2">
              End of conversation flow
            </p>
            <Button variant="outline" size="sm" onClick={startFlow}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Restart Flow
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Mini preview for flow cards
 */
export function FlowPreviewMini({
  frames,
  connections,
}: {
  frames: FlowFrame[];
  connections: FlowConnection[];
}) {
  const frameCount = frames.length;
  const connectionCount = connections.length;

  // Get frame type distribution
  const typeDistribution = frames.reduce(
    (acc, frame) => {
      acc[frame.type] = (acc[frame.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Grid className="w-3 h-3" />
        <span>{frameCount} frames</span>
      </div>
      <div className="flex items-center gap-1">
        <ChevronRight className="w-3 h-3" />
        <span>{connectionCount} connections</span>
      </div>
      <div className="flex gap-1">
        {Object.entries(typeDistribution)
          .slice(0, 3)
          .map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-[10px] h-4">
              {type}: {count}
            </Badge>
          ))}
      </div>
    </div>
  );
}

export default FlowPreview;
