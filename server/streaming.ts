/**
 * Server-Sent Events (SSE) Infrastructure for Streaming Responses
 * Enables real-time streaming of LLM responses to the frontend
 */

import { Response, Request } from "express";
import OpenAI from "openai";
import { ENV } from "./_core/env";

/**
 * SSE Connection Manager
 * Manages active SSE connections for streaming responses
 */
class SSEConnectionManager {
  private connections: Map<string, Response> = new Map();

  /**
   * Register a new SSE connection
   */
  register(connectionId: string, res: Response): void {
    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Send initial connection event
    res.write("event: connected\ndata: " + JSON.stringify({ connectionId }) + "\n\n");

    this.connections.set(connectionId, res);

    // Clean up on connection close
    res.on("close", () => {
      this.connections.delete(connectionId);
    });
  }

  /**
   * Send event to a specific connection
   */
  sendEvent(
    connectionId: string,
    event: string,
    data: unknown
  ): boolean {
    const res = this.connections.get(connectionId);
    if (!res) return false;

    try {
      res.write("event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n");
      return true;
    } catch (error) {
      console.error("[SSE] Error sending event to " + connectionId + ":", error);
      this.connections.delete(connectionId);
      return false;
    }
  }

  /**
   * Close a connection
   */
  close(connectionId: string): void {
    const res = this.connections.get(connectionId);
    if (res) {
      res.write("event: done\ndata: " + JSON.stringify({ message: "Stream complete" }) + "\n\n");
      res.end();
      this.connections.delete(connectionId);
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

export const sseManager = new SSEConnectionManager();

/**
 * Stream LLM response using SSE
 */
export async function streamLLMResponse(
  connectionId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    onChunk?: (chunk: string) => void;
    onComplete?: (fullResponse: string) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || ENV.forgeApiKey;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({ apiKey });
  let fullResponse = "";

  try {
    // Send start event
    sseManager.sendEvent(connectionId, "start", {
      timestamp: new Date().toISOString(),
    });

    // Check if using Forge API (custom endpoint) or OpenAI directly
    const useForgeApi = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0;

    if (useForgeApi) {
      // Non-streaming fallback for Forge API
      const forgeUrl = ENV.forgeApiUrl.replace(/\/$/, "") + "/v1/chat/completions";
      const response = await fetch(forgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: options.model || "gemini-2.5-flash",
          messages,
          max_tokens: options.maxTokens || 32768,
        }),
      });

      if (!response.ok) {
        throw new Error("LLM API error: " + response.status);
      }

      const data = await response.json();
      fullResponse = data.choices?.[0]?.message?.content || "";

      // Simulate streaming by chunking the response
      const chunks = fullResponse.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        sseManager.sendEvent(connectionId, "chunk", { content: chunk });
        options.onChunk?.(chunk);
        await sleep(10); // Small delay for visual effect
      }
    } else {
      // Use OpenAI streaming API
      const stream = await openai.chat.completions.create({
        model: options.model || "gpt-4",
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          sseManager.sendEvent(connectionId, "chunk", { content });
          options.onChunk?.(content);
        }

        // Check for finish reason
        if (chunk.choices[0]?.finish_reason) {
          sseManager.sendEvent(connectionId, "finish", {
            reason: chunk.choices[0].finish_reason,
          });
        }
      }
    }

    // Send complete event
    sseManager.sendEvent(connectionId, "complete", {
      fullResponse,
      timestamp: new Date().toISOString(),
    });

    options.onComplete?.(fullResponse);
    return fullResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    sseManager.sendEvent(connectionId, "error", { message: errorMessage });
    options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    throw error;
  }
}

/**
 * Create SSE endpoint handler for Express
 */
export function createSSEHandler(
  handler: (
    req: Request,
    res: Response,
    connectionId: string
  ) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    const connectionId = "sse-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    // Register SSE connection
    sseManager.register(connectionId, res);

    try {
      await handler(req, res, connectionId);
    } catch (error) {
      console.error("[SSE] Handler error:", error);
      sseManager.sendEvent(connectionId, "error", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Close connection after handler completes
      sseManager.close(connectionId);
    }
  };
}

/**
 * Type definitions for SSE events
 */
export interface SSEEvents {
  connected: { connectionId: string };
  start: { timestamp: string };
  chunk: { content: string };
  finish: { reason: string };
  complete: { fullResponse: string; timestamp: string };
  error: { message: string };
  done: { message: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
