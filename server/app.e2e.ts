import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { inferRouterProxyClient } from "@trpc/client";
import type { AddressInfo } from "net";
import superjson from "superjson";
import type { AppRouter } from "./routers";
import { createApp } from "./_core/app";
import { resetMockDb } from "./test-utils/mockDb";

vi.mock("./db", async () => import("./test-utils/mockDb"));
vi.mock("./_core/sdk", () => {
  const authedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    sdk: {
      authenticateRequest: vi.fn(async (req: { headers: Record<string, string | undefined> }) => {
        if (req.headers.cookie?.includes("cogbase-session=e2e-auth")) {
          return authedUser;
        }

        throw new Error("Unauthorized");
      }),
      exchangeCodeForToken: vi.fn(),
      getUserInfo: vi.fn(),
      createSessionToken: vi.fn(),
    },
  };
});
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async ({ messages }: { messages: Array<{ content: string }> }) => ({
    choices: [
      {
        message: {
          content: `Echo: ${messages[messages.length - 1]?.content ?? ""}`,
        },
      },
    ],
    usage: {
      total_tokens: 42,
    },
  })),
}));

type Client = inferRouterProxyClient<AppRouter>;

const AUTH_COOKIE = "cogbase-session=e2e-auth";

function createClient(authenticated: boolean): Client {
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `http://127.0.0.1:${port}/api/trpc`,
        transformer: superjson,
        fetch(url, init) {
          const headers = new Headers(init?.headers);

          if (authenticated) {
            headers.set("cookie", AUTH_COOKIE);
          }

          return fetch(url, {
            ...init,
            headers,
          });
        },
      }),
    ],
  });
}

let server: Awaited<ReturnType<typeof createApp>>["server"];
let port = 0;

beforeEach(async () => {
  resetMockDb();
  const appContext = await createApp({ serveClient: false });
  server = appContext.server;

  await new Promise<void>(resolve => {
    server.listen(0, "127.0.0.1", () => {
      port = (server.address() as AddressInfo).port;
      resolve();
    });
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("app tRPC e2e", () => {
  it("serves public procedures and rejects protected ones without auth", async () => {
    const publicClient = createClient(false);

    await expect(
      publicClient.system.health.query({ timestamp: Date.now() })
    ).resolves.toEqual({ ok: true });

    await expect(publicClient.auth.me.query()).resolves.toBeNull();
    await expect(publicClient.agent.list.query()).rejects.toBeInstanceOf(TRPCClientError);
  });

  it("covers authenticated agent, chat, analytics, settings, rag, and flow lifecycles", async () => {
    const client = createClient(true);

    await expect(client.auth.me.query()).resolves.toMatchObject({
      id: 1,
      email: "test@example.com",
    });

    const agent = await client.agent.create.mutate({
      name: "Support Agent",
      description: "Handles support questions",
      systemPrompt: "Be helpful",
      model: "gpt-4",
      conversationStarters: ["Hello"],
    });

    expect(agent.name).toBe("Support Agent");

    await expect(client.agent.list.query()).resolves.toHaveLength(1);
    await expect(client.agent.get.query({ id: agent.id })).resolves.toMatchObject({
      id: agent.id,
      name: "Support Agent",
    });

    const updatedAgent = await client.agent.update.mutate({
      id: agent.id,
      name: "Support Agent v2",
    });
    expect(updatedAgent?.name).toBe("Support Agent v2");

    const ragConfig = await client.rag.getConfig.query({ agentId: agent.id });
    expect(ragConfig.agentId).toBe(agent.id);

    const updatedConfig = await client.rag.updateConfig.mutate({
      agentId: agent.id,
      topK: 5,
      similarityThreshold: "0.1",
    });
    expect(updatedConfig.topK).toBe(5);

    const document = await client.rag.uploadDocument.mutate({
      agentId: agent.id,
      fileName: "faq.md",
      fileType: "text/markdown",
      content: "Support articles answer reset password questions.",
    });
    expect(document.fileName).toBe("faq.md");

    const documents = await client.rag.listDocuments.query({ agentId: agent.id });
    expect(documents).toHaveLength(1);

    const chatResult = await client.chat.sendMessage.mutate({
      agentId: agent.id,
      message: "How do I reset my password?",
    });
    expect(chatResult.message.content).toContain("Echo:");

    const logs = await client.chat.getLogs.query({
      agentId: agent.id,
      startDate: "2024-01-01",
      endDate: "2099-12-31",
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.messages).toHaveLength(2);

    const analytics = await client.analytics.getDashboard.query();
    expect(analytics.totalAgents).toBe(1);
    expect(analytics.totalMessages).toBe(2);

    const settings = await client.settings.get.query();
    expect(settings.creditsUsed).toBe(1);

    const apiKey = await client.settings.generateApiKey.mutate();
    expect(apiKey.apiKey).toMatch(/^cb_/);

    const flow = await client.uiFlow.create.mutate({
      name: "Support Flow",
      description: "FAQ flow",
      agentId: agent.id,
    });
    expect(flow.name).toBe("Support Flow");

    const frame = await client.uiFlow.createFrame.mutate({
      flowId: flow.id,
      frameId: "frame-1",
      name: "Start",
      positionX: 24,
      positionY: 32,
    });
    expect(frame.name).toBe("Start");

    const connection = await client.uiFlow.createConnection.mutate({
      flowId: flow.id,
      connectionId: "connection-1",
      sourceFrameId: "frame-1",
      targetFrameId: "frame-2",
    });
    expect(connection.connectionId).toBe("connection-1");

    const hydratedFlow = await client.uiFlow.get.query({ id: flow.id });
    expect(hydratedFlow?.frames).toHaveLength(1);
    expect(hydratedFlow?.connections).toHaveLength(1);

    await expect(
      client.rag.deleteDocument.mutate({ documentId: document.id })
    ).resolves.toEqual({ success: true });
    await expect(
      client.uiFlow.deleteConnection.mutate({ id: connection.id, flowId: flow.id })
    ).resolves.toEqual({ success: true });
    await expect(
      client.uiFlow.deleteFrame.mutate({ id: frame.id, flowId: flow.id })
    ).resolves.toEqual({ success: true });
    await expect(
      client.uiFlow.delete.mutate({ id: flow.id })
    ).resolves.toEqual({ success: true });
    await expect(
      client.agent.delete.mutate({ id: agent.id })
    ).resolves.toEqual({ success: true });
  });
});
