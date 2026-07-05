/**
 * Flow Executor - Runtime execution engine for UI flows
 * 
 * This module handles the execution of UI flows as part of chatbot conversations.
 * It manages state machines for conversation flows, handles user inputs,
 * and transitions between frames based on connections.
 */

import { getDb } from "./db";
import { uiFlows, uiFrames, uiConnections } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface FlowState {
  flowId: number;
  currentFrameId: string;
  variables: Record<string, unknown>;
  history: string[];
  startedAt: Date;
  lastUpdatedAt: Date;
}

export interface FrameResponse {
  type: string;
  content: string;
  options?: { label: string; value: string }[];
  inputType?: string;
  placeholder?: string;
  config?: Record<string, unknown>;
  nextFrameId?: string;
}

interface Frame {
  id: number;
  frameId: string;
  name: string;
  type: string | null;
  config: Record<string, unknown> | null;
  positionX: number | null;
  positionY: number | null;
}

interface Connection {
  id: number;
  connectionId: string;
  sourceFrameId: string;
  targetFrameId: string;
  label: string | null;
  metadata: Record<string, unknown> | null;
}

// Store flow states in memory (in production, this would be in Redis or DB)
const flowStates = new Map<string, FlowState>();

/**
 * Get or create a flow state for a session
 */
export function getFlowState(sessionId: string): FlowState | undefined {
  return flowStates.get(sessionId);
}

/**
 * Start a flow execution for a session
 */
export async function startFlow(
  flowId: number,
  sessionId: string
): Promise<FrameResponse | null> {
  const db = await getDb();
  if (!db) return null;

  // Get the flow
  const [flow] = await db
    .select()
    .from(uiFlows)
    .where(eq(uiFlows.id, flowId))
    .limit(1);

  if (!flow) {
    return null;
  }

  // Get all frames for this flow
  const frames = await db
    .select()
    .from(uiFrames)
    .where(eq(uiFrames.flowId, flowId));

  if (frames.length === 0) {
    return null;
  }

  // Find the entry frame (first frame or one marked as entry)
  // For now, use the frame with the lowest position or first created
  const entryFrame = frames.reduce((min, frame) => {
    const minX = min.positionX || 0;
    const minY = min.positionY || 0;
    const frameX = frame.positionX || 0;
    const frameY = frame.positionY || 0;
    // Top-left is usually the entry
    return (frameY < minY || (frameY === minY && frameX < minX)) ? frame : min;
  }, frames[0]);

  // Initialize the flow state
  const state: FlowState = {
    flowId,
    currentFrameId: entryFrame.frameId,
    variables: {},
    history: [entryFrame.frameId],
    startedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  flowStates.set(sessionId, state);

  // Return the response for the entry frame
  return frameToResponse(entryFrame, flowId);
}

/**
 * Process user input and transition to next frame
 */
export async function processFlowInput(
  sessionId: string,
  userInput: string
): Promise<FrameResponse | null> {
  const state = flowStates.get(sessionId);
  if (!state) {
    return null;
  }

  const db = await getDb();
  if (!db) return null;

  // Get current frame
  const [currentFrame] = await db
    .select()
    .from(uiFrames)
    .where(
      and(
        eq(uiFrames.flowId, state.flowId),
        eq(uiFrames.frameId, state.currentFrameId)
      )
    )
    .limit(1);

  if (!currentFrame) {
    return null;
  }

  // Store user input in variables
  const frameConfig = currentFrame.config ?? {};
  if (typeof frameConfig.variableName === "string" && frameConfig.variableName) {
    state.variables[frameConfig.variableName] = userInput;
  }

  // Get outgoing connections from current frame
  const connections = await db
    .select()
    .from(uiConnections)
    .where(
      and(
        eq(uiConnections.flowId, state.flowId),
        eq(uiConnections.sourceFrameId, state.currentFrameId)
      )
    );

  if (connections.length === 0) {
    // No outgoing connections - flow ends
    flowStates.delete(sessionId);
    return {
      type: "end",
      content: "Thank you! The conversation flow has ended.",
    };
  }

  // Find the matching connection based on user input
  let nextConnection: Connection | null = null;

  for (const conn of connections) {
    // Check if the connection has a condition that matches the input
    const condition = conn.metadata?.condition;
    if (condition) {
      try {
        const parsedCondition = typeof condition === "string" ? JSON.parse(condition) : condition;
        if (evaluateCondition(parsedCondition, userInput, state.variables)) {
          nextConnection = conn;
          break;
        }
      } catch {
        // If condition parsing fails, skip this connection
      }
    } else if (conn.label) {
      // Check if user input matches the connection label (for button options)
      if (
        userInput.toLowerCase().trim() === conn.label.toLowerCase().trim() ||
        userInput === conn.label
      ) {
        nextConnection = conn;
        break;
      }
    }
  }

  // If no specific match, use the first connection without conditions (default path)
  if (!nextConnection) {
    nextConnection = connections.find((c) => !c.metadata?.condition && !c.label) || connections[0];
  }

  if (!nextConnection) {
    return null;
  }

  // Get the next frame
  const [nextFrame] = await db
    .select()
    .from(uiFrames)
    .where(
      and(
        eq(uiFrames.flowId, state.flowId),
        eq(uiFrames.frameId, nextConnection.targetFrameId)
      )
    )
    .limit(1);

  if (!nextFrame) {
    return null;
  }

  // Update state
  state.currentFrameId = nextFrame.frameId;
  state.history.push(nextFrame.frameId);
  state.lastUpdatedAt = new Date();

  return frameToResponse(nextFrame, state.flowId, state.variables);
}

/**
 * End a flow execution
 */
export function endFlow(sessionId: string): void {
  flowStates.delete(sessionId);
}

/**
 * Check if a session has an active flow
 */
export function hasActiveFlow(sessionId: string): boolean {
  return flowStates.has(sessionId);
}

/**
 * Convert a frame to a response object
 */
async function frameToResponse(
  frame: Frame,
  flowId: number,
  variables?: Record<string, unknown>
): Promise<FrameResponse> {
  const config = frame.config ?? {};
  const rawContent = config.content || config.message || frame.name;
  let content = typeof rawContent === "string" ? rawContent : String(rawContent ?? "");

  // Interpolate variables in content
  if (variables) {
    content = interpolateVariables(content, variables);
  }

  const db = await getDb();

  // Get outgoing connections to determine options
  const connections = db ? await db
    .select()
    .from(uiConnections)
    .where(
      and(
        eq(uiConnections.flowId, flowId),
        eq(uiConnections.sourceFrameId, frame.frameId)
      )
    ) : [];

  const response: FrameResponse = {
    type: frame.type ?? "message",
    content,
    config,
  };

  // Add options based on frame type and connections
  switch (frame.type ?? "message") {
    case "button":
    case "quick_reply":
    case "choice":
      // Convert connections to options
      response.options = connections
        .filter((c) => c.label)
        .map((c) => ({
          label: c.label!,
          value: c.label!,
        }));
      
      // Also include options from config
      if (config.options && Array.isArray(config.options)) {
        response.options = [
          ...(response.options || []),
          ...config.options.map((opt: string | { label: string; value: string }) => 
            typeof opt === "string" ? { label: opt, value: opt } : opt
          ),
        ];
      }
      break;

    case "input":
    case "text_input":
    case "email_input":
    case "phone_input":
      response.inputType = typeof config.inputType === "string" ? config.inputType : "text";
      response.placeholder = typeof config.placeholder === "string" ? config.placeholder : "Type your response...";
      break;

    case "message":
    case "bot_message":
    case "system_message":
      // Pure message frames, no special handling needed
      break;

    case "end":
    case "screen_end":
      response.type = "end";
      break;
  }

  // If there's exactly one connection with no label/condition, set it as nextFrameId for auto-advance
  if (connections.length === 1 && !connections[0].label && !connections[0].metadata?.condition) {
    response.nextFrameId = connections[0].targetFrameId;
  }

  return response;
}

/**
 * Interpolate variables in a string
 */
function interpolateVariables(text: string, variables: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : `{{${varName}}}`;
  });
}

/**
 * Evaluate a condition against user input and variables
 */
function evaluateCondition(
  condition: { type: string; value?: string; operator?: string; field?: string },
  userInput: string,
  variables: Record<string, unknown>
): boolean {
  switch (condition.type) {
    case "equals":
      return userInput.toLowerCase().trim() === (condition.value || "").toLowerCase().trim();

    case "contains":
      return userInput.toLowerCase().includes((condition.value || "").toLowerCase());

    case "startsWith":
      return userInput.toLowerCase().startsWith((condition.value || "").toLowerCase());

    case "regex":
      try {
        const regex = new RegExp(condition.value || "", "i");
        return regex.test(userInput);
      } catch {
        return false;
      }

    case "variable":
      if (condition.field && condition.operator && condition.value !== undefined) {
        const fieldValue = variables[condition.field];
        switch (condition.operator) {
          case "==":
            return fieldValue == condition.value;
          case "!=":
            return fieldValue != condition.value;
          case ">":
            return Number(fieldValue) > Number(condition.value);
          case "<":
            return Number(fieldValue) < Number(condition.value);
          default:
            return false;
        }
      }
      return false;

    case "default":
    case "any":
      return true;

    default:
      return false;
  }
}

/**
 * Get flow execution statistics
 */
export function getFlowStats(): {
  activeSessions: number;
  flowsInUse: Set<number>;
} {
  const flowsInUse = new Set<number>();
  for (const state of Array.from(flowStates.values())) {
    flowsInUse.add(state.flowId);
  }

  return {
    activeSessions: flowStates.size,
    flowsInUse,
  };
}

/**
 * Clean up stale flow states (older than 24 hours)
 */
export function cleanupStaleFlows(): number {
  const staleThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
  let cleaned = 0;

  for (const [sessionId, state] of Array.from(flowStates.entries())) {
    if (state.lastUpdatedAt.getTime() < staleThreshold) {
      flowStates.delete(sessionId);
      cleaned++;
    }
  }

  return cleaned;
}
