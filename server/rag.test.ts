import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("RAG router", () => {
  describe("rag.getConfig", () => {
    it("returns RAG configuration for an agent", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rag.getConfig({ agentId: 1 });

      expect(result).toBeDefined();
      expect(result.agentId).toBe(1);
      expect(typeof result.enabled).toBe("number");
      expect(typeof result.chunkSize).toBe("number");
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.rag.getConfig({ agentId: 1 })).rejects.toThrow();
    });
  });

  describe("rag.updateConfig", () => {
    it("updates RAG configuration", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rag.updateConfig({
        agentId: 1,
        enabled: 1,
        chunkSize: 1024,
        topK: 5,
      });

      expect(result).toBeDefined();
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.rag.updateConfig({
          agentId: 1,
          enabled: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("rag.listDocuments", () => {
    it("returns training documents for an agent", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rag.listDocuments({ agentId: 1 });

      expect(Array.isArray(result)).toBe(true);
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.rag.listDocuments({ agentId: 1 })).rejects.toThrow();
    });
  });

  describe("rag.uploadDocument", () => {
    it("uploads a training document", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.rag.uploadDocument({
        agentId: 1,
        fileName: "test.txt",
        fileType: "text/plain",
        fileSize: 1024,
        content: "This is test content for training.",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.fileName).toBe("test.txt");
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.rag.uploadDocument({
          agentId: 1,
          fileName: "test.txt",
          fileType: "text/plain",
          content: "Test",
        })
      ).rejects.toThrow();
    });
  });

  describe("rag.deleteDocument", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.rag.deleteDocument({ documentId: 1 })).rejects.toThrow();
    });
  });
});

describe("UI Flow router", () => {
  describe("uiFlow.list", () => {
    it("returns UI flows for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.uiFlow.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.uiFlow.list()).rejects.toThrow();
    });
  });

  describe("uiFlow.get", () => {
    it("returns flow with frames and connections", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.uiFlow.get({ id: 1 });

      // Will be null if flow doesn't exist, but shouldn't throw
      if (result) {
        expect(result.id).toBe(1);
        expect(Array.isArray(result.frames)).toBe(true);
        expect(Array.isArray(result.connections)).toBe(true);
      }
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.uiFlow.get({ id: 1 })).rejects.toThrow();
    });
  });

  describe("uiFlow.create", () => {
    it("creates a new UI flow", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.uiFlow.create({
        name: "Test Flow",
        description: "A test UI flow",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Flow");
    });

    it("requires a name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.uiFlow.create({
          name: "",
        })
      ).rejects.toThrow();
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.uiFlow.create({
          name: "Test Flow",
        })
      ).rejects.toThrow();
    });
  });

  describe("uiFlow.update", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.uiFlow.update({
          id: 1,
          name: "Updated Flow",
        })
      ).rejects.toThrow();
    });
  });

  describe("uiFlow.delete", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.uiFlow.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("uiFlow.createFrame", () => {
    it("creates a new frame in a flow", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First create a flow
      const flow = await caller.uiFlow.create({
        name: "Test Flow for Frame",
      });

      const result = await caller.uiFlow.createFrame({
        flowId: flow.id,
        frameId: "frame-1",
        name: "Start Screen",
        positionX: 100,
        positionY: 100,
        width: 300,
        height: 200,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Start Screen");
    });

    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.uiFlow.createFrame({
          flowId: 1,
          frameId: "frame-1",
          name: "Test Frame",
          positionX: 0,
          positionY: 0,
        })
      ).rejects.toThrow();
    });
  });

  describe("uiFlow.createConnection", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.uiFlow.createConnection({
          flowId: 1,
          connectionId: "conn-1",
          sourceFrameId: "frame-1",
          targetFrameId: "frame-2",
        })
      ).rejects.toThrow();
    });
  });
});
