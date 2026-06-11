import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI Agents table - stores chatbot configurations
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 64 }).default("gpt-4").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "training"]).default("active").notNull(),
  conversationStarters: json("conversationStarters").$type<string[]>(),
  constraints: json("constraints").$type<string[]>(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).default("0.7"),
  maxTokens: int("maxTokens").default(2048),
  lastTrainedAt: timestamp("lastTrainedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Chat sessions/conversations
 */
export const chatSessions = mysqlTable("chatSessions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * Individual chat messages
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  signalScore: decimal("signalScore", { precision: 5, scale: 3 }),
  aiRequests: int("aiRequests").default(1),
  tokensUsed: int("tokensUsed"),
  latencyMs: int("latencyMs"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Account settings and credits
 */
export const accountSettings = mysqlTable("accountSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  creditsUsed: int("creditsUsed").default(0).notNull(),
  creditsTotal: int("creditsTotal").default(50).notNull(),
  creditsResetAt: timestamp("creditsResetAt"),
  signalScoreThreshold: decimal("signalScoreThreshold", { precision: 3, scale: 2 }).default("0.5"),
  alertsEnabled: int("alertsEnabled").default(1),
  apiKey: varchar("apiKey", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountSettings = typeof accountSettings.$inferSelect;
export type InsertAccountSettings = typeof accountSettings.$inferInsert;

/**
 * Analytics events for tracking
 */
export const analyticsEvents = mysqlTable("analyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  eventData: json("eventData").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Exported files tracking
 */
export const exportedFiles = mysqlTable("exportedFiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["csv", "pdf"]).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  exportType: varchar("exportType", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExportedFile = typeof exportedFiles.$inferSelect;
export type InsertExportedFile = typeof exportedFiles.$inferInsert;

/**
 * Alerts and notifications
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  alertType: mysqlEnum("alertType", ["signal_score", "retraining", "credits", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: int("isRead").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Training documents for RAG (Retrieval-Augmented Generation)
 */
export const trainingDocuments = mysqlTable("trainingDocuments", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 64 }).notNull(),
  fileSize: int("fileSize"),
  fileUrl: text("fileUrl"),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  chunkCount: int("chunkCount").default(0),
  version: int("version").default(1).notNull(),
  parentDocumentId: int("parentDocumentId"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingDocument = typeof trainingDocuments.$inferSelect;
export type InsertTrainingDocument = typeof trainingDocuments.$inferInsert;

/**
 * Document versions for version history tracking
 */
export const documentVersions = mysqlTable("documentVersions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  version: int("version").notNull(),
  content: text("content").notNull(),
  fileSize: int("fileSize"),
  chunkCount: int("chunkCount").default(0),
  changeDescription: text("changeDescription"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

/**
 * RAG configurations for agents
 */
export const ragConfigurations = mysqlTable("ragConfigurations", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull().unique(),
  enabled: int("enabled").default(1).notNull(),
  chunkSize: int("chunkSize").default(512),
  chunkOverlap: int("chunkOverlap").default(50),
  topK: int("topK").default(3),
  similarityThreshold: decimal("similarityThreshold", { precision: 3, scale: 2 }).default("0.7"),
  embeddingModel: varchar("embeddingModel", { length: 64 }).default("text-embedding-ada-002"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RagConfiguration = typeof ragConfigurations.$inferSelect;
export type InsertRagConfiguration = typeof ragConfigurations.$inferInsert;

/**
 * Vector embeddings for document chunks
 */
export const vectorEmbeddings = mysqlTable("vectorEmbeddings", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  agentId: int("agentId").notNull(),
  chunkIndex: int("chunkIndex").notNull(),
  content: text("content").notNull(),
  embedding: json("embedding").$type<number[]>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VectorEmbedding = typeof vectorEmbeddings.$inferSelect;
export type InsertVectorEmbedding = typeof vectorEmbeddings.$inferInsert;

/**
 * UI Flows for canvas-based UI autogeneration
 */
export const uiFlows = mysqlTable("uiFlows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mermaidDiagram: text("mermaidDiagram"),
  version: int("version").default(1).notNull(),
  isPublished: int("isPublished").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UiFlow = typeof uiFlows.$inferSelect;
export type InsertUiFlow = typeof uiFlows.$inferInsert;

/**
 * UI Flow Versions - stores flow history for version control
 */
export const uiFlowVersions = mysqlTable("uiFlowVersions", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull(),
  version: int("version").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mermaidDiagram: text("mermaidDiagram"),
  flowData: json("flowData").$type<{
    frames: Array<{
      frameId: string;
      name: string;
      type: string;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      config?: Record<string, unknown>;
    }>;
    connections: Array<{
      connectionId: string;
      sourceFrameId: string;
      targetFrameId: string;
      label?: string;
      type?: string;
    }>;
  }>(),
  changeDescription: text("changeDescription"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UiFlowVersion = typeof uiFlowVersions.$inferSelect;
export type InsertUiFlowVersion = typeof uiFlowVersions.$inferInsert;

/**
 * UI Frames (screens/components in canvas)
 */
export const uiFrames = mysqlTable("uiFrames", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull(),
  frameId: varchar("frameId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 64 }).default("screen"),
  positionX: int("positionX").default(0),
  positionY: int("positionY").default(0),
  width: int("width").default(300),
  height: int("height").default(200),
  config: json("config").$type<Record<string, unknown>>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UiFrame = typeof uiFrames.$inferSelect;
export type InsertUiFrame = typeof uiFrames.$inferInsert;

/**
 * UI Connections (links between frames)
 */
export const uiConnections = mysqlTable("uiConnections", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull(),
  connectionId: varchar("connectionId", { length: 64 }).notNull(),
  sourceFrameId: varchar("sourceFrameId", { length: 64 }).notNull(),
  targetFrameId: varchar("targetFrameId", { length: 64 }).notNull(),
  label: varchar("label", { length: 255 }),
  type: varchar("type", { length: 64 }).default("default"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UiConnection = typeof uiConnections.$inferSelect;
export type InsertUiConnection = typeof uiConnections.$inferInsert;

/**
 * Agent Versions - stores configuration history for rollback
 */
export const agentVersions = mysqlTable("agentVersions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId").notNull(),
  version: int("version").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt"),
  model: varchar("model", { length: 64 }).notNull(),
  conversationStarters: json("conversationStarters").$type<string[]>(),
  constraints: json("constraints").$type<string[]>(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }),
  maxTokens: int("maxTokens"),
  changeDescription: text("changeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentVersion = typeof agentVersions.$inferSelect;
export type InsertAgentVersion = typeof agentVersions.$inferInsert;

/**
 * Conversation Feedback - user satisfaction ratings
 */
export const conversationFeedback = mysqlTable("conversationFeedback", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  messageId: int("messageId"),
  agentId: int("agentId").notNull(),
  userId: int("userId"),
  rating: int("rating"), // 1-5 stars
  feedback: text("feedback"),
  feedbackType: mysqlEnum("feedbackType", ["thumbs_up", "thumbs_down", "rating", "comment"]).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConversationFeedback = typeof conversationFeedback.$inferSelect;
export type InsertConversationFeedback = typeof conversationFeedback.$inferInsert;

/**
 * Audit Logs - security and compliance tracking
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 64 }).notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  resourceId: int("resourceId"),
  details: json("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failure", "error"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Webhooks - integration webhook configurations
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId"),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 128 }),
  events: json("events").$type<string[]>(),
  isActive: int("isActive").default(1).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  failureCount: int("failureCount").default(0),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * API Usage - tracking API calls for rate limiting and billing
 */
export const apiUsage = mysqlTable("apiUsage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  apiKeyId: varchar("apiKeyId", { length: 64 }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: int("statusCode"),
  responseTimeMs: int("responseTimeMs"),
  tokensUsed: int("tokensUsed"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = typeof apiUsage.$inferInsert;

/**
 * Flow Templates - pre-built UI flow templates
 */
export const flowTemplates = mysqlTable("flowTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  thumbnail: text("thumbnail"),
  flowData: json("flowData").$type<{
    frames: Array<{
      frameId: string;
      name: string;
      type: string;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      config?: Record<string, unknown>;
    }>;
    connections: Array<{
      connectionId: string;
      sourceFrameId: string;
      targetFrameId: string;
      label?: string;
      type?: string;
    }>;
    mermaidDiagram?: string;
  }>(),
  isPublic: int("isPublic").default(1).notNull(),
  usageCount: int("usageCount").default(0),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowTemplate = typeof flowTemplates.$inferSelect;
export type InsertFlowTemplate = typeof flowTemplates.$inferInsert;

/**
 * Frame Templates - pre-built frame/component templates
 */
export const frameTemplates = mysqlTable("frameTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 64 }).notNull(), // button, input, message, carousel, etc.
  category: varchar("category", { length: 64 }),
  icon: varchar("icon", { length: 64 }),
  defaultConfig: json("defaultConfig").$type<{
    width: number;
    height: number;
    style?: Record<string, unknown>;
    properties?: Record<string, unknown>;
  }>(),
  isPublic: int("isPublic").default(1).notNull(),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FrameTemplate = typeof frameTemplates.$inferSelect;
export type InsertFrameTemplate = typeof frameTemplates.$inferInsert;
