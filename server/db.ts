import { eq, desc, and, gte, lte, sql, count, avg } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  agents, InsertAgent, Agent,
  chatSessions, InsertChatSession, ChatSession,
  chatMessages, InsertChatMessage, ChatMessage,
  accountSettings, InsertAccountSettings, AccountSettings,
  analyticsEvents, InsertAnalyticsEvent,
  exportedFiles, InsertExportedFile,
  alerts, InsertAlert, Alert,
  trainingDocuments, InsertTrainingDocument, TrainingDocument,
  documentVersions, InsertDocumentVersion, DocumentVersion,
  ragConfigurations, InsertRagConfiguration, RagConfiguration,
  vectorEmbeddings, InsertVectorEmbedding, VectorEmbedding,
  uiFlows, InsertUiFlow, UiFlow,
  uiFlowVersions, InsertUiFlowVersion, UiFlowVersion,
  uiFrames, InsertUiFrame, UiFrame,
  uiConnections, InsertUiConnection, UiConnection,
  agentVersions, InsertAgentVersion, AgentVersion,
  conversationFeedback, InsertConversationFeedback, ConversationFeedback,
  auditLogs, InsertAuditLog, AuditLog,
  webhooks, InsertWebhook, Webhook,
  apiUsage, InsertApiUsage, ApiUsage,
  flowTemplates, InsertFlowTemplate, FlowTemplate,
  frameTemplates, InsertFrameTemplate, FrameTemplate,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

// Re-export types for use in other modules
export type { RagConfiguration };

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ AGENT FUNCTIONS ============

export async function createAgent(data: Omit<InsertAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agents).values({
    ...data,
    conversationStarters: data.conversationStarters || [],
    constraints: data.constraints || [],
  });
  
  const [agent] = await db.select().from(agents).where(eq(agents.id, Number(result[0].insertId)));
  return agent;
}

export async function getAgentsByUserId(userId: number): Promise<Agent[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.createdAt));
}

export async function getAgentById(id: number, userId: number): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [agent] = await db.select().from(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  return agent;
}

export async function updateAgent(id: number, userId: number, data: Partial<InsertAgent>): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(agents)
    .set(data)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  
  return getAgentById(id, userId);
}

export async function deleteAgent(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(agents)
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  return true;
}

export async function trainAgent(id: number, userId: number): Promise<Agent | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(agents)
    .set({ 
      status: 'active',
      lastTrainedAt: new Date()
    })
    .where(and(eq(agents.id, id), eq(agents.userId, userId)));
  
  return getAgentById(id, userId);
}

// ============ CHAT SESSION FUNCTIONS ============

export async function createChatSession(data: Omit<InsertChatSession, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>): Promise<ChatSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessionId = nanoid(16);
  const result = await db.insert(chatSessions).values({
    ...data,
    sessionId,
  });
  
  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(result[0].insertId)));
  return session;
}

export async function getChatSessionsByAgentId(agentId: number, startDate?: Date, endDate?: Date): Promise<ChatSession[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(chatSessions).where(eq(chatSessions.agentId, agentId));
  
  if (startDate && endDate) {
    query = db.select().from(chatSessions)
      .where(and(
        eq(chatSessions.agentId, agentId),
        gte(chatSessions.createdAt, startDate),
        lte(chatSessions.createdAt, endDate)
      ));
  }
  
  return query.orderBy(desc(chatSessions.createdAt));
}

export async function getChatSessionById(id: number): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
  return session;
}

export async function getChatSessionBySessionId(sessionId: string): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
  return session;
}

// ============ CHAT MESSAGE FUNCTIONS ============

export async function createChatMessage(data: Omit<InsertChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(data);
  
  const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, Number(result[0].insertId)));
  return message;
}

export async function getMessagesBySessionId(sessionId: number): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
}

export async function getChatLogsWithMessages(agentId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const sessions = await getChatSessionsByAgentId(agentId, startDate, endDate);
  
  const logsWithMessages = await Promise.all(
    sessions.map(async (session) => {
      const messages = await getMessagesBySessionId(session.id);
      const avgSignalScore = messages
        .filter(m => m.signalScore !== null)
        .reduce((sum, m) => sum + Number(m.signalScore), 0) / 
        (messages.filter(m => m.signalScore !== null).length || 1);
      
      return {
        ...session,
        messages,
        messageCount: messages.length,
        avgSignalScore: avgSignalScore || 0,
      };
    })
  );
  
  return logsWithMessages;
}

// ============ ACCOUNT SETTINGS FUNCTIONS ============

export async function getOrCreateAccountSettings(userId: number): Promise<AccountSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(accountSettings).where(eq(accountSettings.userId, userId));
  
  if (existing) return existing;

  // Create default settings
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);
  resetDate.setDate(1);
  
  await db.insert(accountSettings).values({
    userId,
    creditsResetAt: resetDate,
  });
  
  const [settings] = await db.select().from(accountSettings).where(eq(accountSettings.userId, userId));
  return settings;
}

export async function updateAccountSettings(userId: number, data: Partial<InsertAccountSettings>): Promise<AccountSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(accountSettings)
    .set(data)
    .where(eq(accountSettings.userId, userId));
  
  return getOrCreateAccountSettings(userId);
}

export async function incrementCreditsUsed(userId: number, amount: number = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(accountSettings)
    .set({ 
      creditsUsed: sql`${accountSettings.creditsUsed} + ${amount}`
    })
    .where(eq(accountSettings.userId, userId));
}

// ============ ANALYTICS FUNCTIONS ============

export async function createAnalyticsEvent(data: Omit<InsertAnalyticsEvent, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(analyticsEvents).values(data);
}

export async function getAnalyticsByAgentId(agentId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  // Get all sessions for this agent
  const sessions = await getChatSessionsByAgentId(agentId, startDate, endDate);
  const sessionIds = sessions.map(s => s.id);
  
  if (sessionIds.length === 0) {
    return {
      totalMessages: 0,
      botMessages: 0,
      userMessages: 0,
      avgSignalScore: 0,
      signalScores: [],
      topicsDistribution: [],
      emojiUsage: {},
      messagesOverTime: [],
    };
  }

  // Get all messages for these sessions
  const allMessages: ChatMessage[] = [];
  for (const sessionId of sessionIds) {
    const messages = await getMessagesBySessionId(sessionId);
    allMessages.push(...messages);
  }

  const botMessages = allMessages.filter(m => m.role === 'assistant');
  const userMessages = allMessages.filter(m => m.role === 'user');
  
  const signalScores = botMessages
    .filter(m => m.signalScore !== null)
    .map(m => Number(m.signalScore));
  
  const avgSignalScore = signalScores.length > 0 
    ? signalScores.reduce((a, b) => a + b, 0) / signalScores.length 
    : 0;

  // Extract emoji usage
  // Match common emojis using character ranges
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
  const emojiUsage: Record<string, number> = {};
  allMessages.forEach(m => {
    const emojis = m.content.match(emojiRegex) || [];
    emojis.forEach(emoji => {
      emojiUsage[emoji] = (emojiUsage[emoji] || 0) + 1;
    });
  });

  // Topic distribution (simple keyword-based)
  const topicKeywords: Record<string, RegExp> = {
    'Magic/Enchanted': /magic|enchant/gi,
    'Unicorn Hypergraph': /hypergraph/gi,
    'Council of Wizards': /wizard/gi,
    'Forest Membranes': /membrane/gi,
    'ASCII Art': /ascii/gi,
    'Entropy': /entropy/gi,
    'Neural Network': /neural|hgnn/gi,
  };

  const topicsDistribution = Object.entries(topicKeywords).map(([topic, regex]) => {
    const mentions = allMessages.reduce((count, m) => {
      const matches = m.content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    return { topic, mentions };
  }).filter(t => t.mentions > 0).sort((a, b) => b.mentions - a.mentions);

  return {
    totalMessages: allMessages.length,
    botMessages: botMessages.length,
    userMessages: userMessages.length,
    avgSignalScore,
    signalScores,
    topicsDistribution,
    emojiUsage,
    sessionsCount: sessions.length,
  };
}

// ============ EXPORTED FILES FUNCTIONS ============

export async function createExportedFile(data: Omit<InsertExportedFile, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(exportedFiles).values(data);
  const [file] = await db.select().from(exportedFiles).where(eq(exportedFiles.id, Number(result[0].insertId)));
  return file;
}

export async function getExportedFilesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(exportedFiles)
    .where(eq(exportedFiles.userId, userId))
    .orderBy(desc(exportedFiles.createdAt));
}

// ============ ALERTS FUNCTIONS ============

export async function createAlert(data: Omit<InsertAlert, 'id' | 'createdAt'>): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(alerts).values(data);
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, Number(result[0].insertId)));
  
  // Send notification to owner for important alerts
  if (data.alertType === 'signal_score' || data.alertType === 'retraining') {
    try {
      const { notifyOwner } = await import('./_core/notification');
      await notifyOwner({
        title: data.title,
        content: data.message,
      });
    } catch (error) {
      console.error('[Alerts] Failed to notify owner:', error);
    }
  }
  
  return alert;
}

export async function getAlertsByUserId(userId: number, unreadOnly: boolean = false): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];

  if (unreadOnly) {
    return db.select().from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.isRead, 0)))
      .orderBy(desc(alerts.createdAt));
  }

  return db.select().from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt));
}

export async function markAlertAsRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(alerts)
    .set({ isRead: 1 })
    .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
}

export async function markAllAlertsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(alerts)
    .set({ isRead: 1 })
    .where(eq(alerts.userId, userId));
}

// ============ SIGNAL SCORE ALERT CHECK ============

export async function checkSignalScoreAlert(userId: number, agentId: number, signalScore: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const settings = await getOrCreateAccountSettings(userId);
  const threshold = Number(settings.signalScoreThreshold) || 0.5;

  if (signalScore < threshold && settings.alertsEnabled) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
    
    await createAlert({
      userId,
      agentId,
      alertType: 'signal_score',
      title: 'Low Signal Score Detected',
      message: `Agent "${agent?.name || 'Unknown'}" received a response with signal score ${signalScore.toFixed(3)}, which is below your threshold of ${threshold}.`,
      isRead: 0,
    });
  }
}

// ============ RETRAINING ALERT CHECK ============

export async function checkRetrainingAlert(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const userAgents = await getAgentsByUserId(userId);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const agent of userAgents) {
    if (agent.lastTrainedAt && new Date(agent.lastTrainedAt) < sixMonthsAgo) {
      // Check if we already have an unread alert for this agent
      const existingAlerts = await db.select().from(alerts)
        .where(and(
          eq(alerts.userId, userId),
          eq(alerts.agentId, agent.id),
          eq(alerts.alertType, 'retraining'),
          eq(alerts.isRead, 0)
        ));

      if (existingAlerts.length === 0) {
        await createAlert({
          userId,
          agentId: agent.id,
          alertType: 'retraining',
          title: 'Agent Needs Retraining',
          message: `Agent "${agent.name}" was last trained more than 6 months ago. Consider retraining to improve performance.`,
          isRead: 0,
        });
      }
    }
  }
}

// ============ RAG TRAINING DOCUMENTS ============

export async function createTrainingDocument(document: InsertTrainingDocument): Promise<TrainingDocument> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(trainingDocuments).values(document);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(trainingDocuments).where(eq(trainingDocuments.id, insertedId));
  return inserted[0]!;
}

export async function getTrainingDocumentsByAgentId(agentId: number): Promise<TrainingDocument[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(trainingDocuments)
    .where(eq(trainingDocuments.agentId, agentId))
    .orderBy(desc(trainingDocuments.createdAt));
}

export async function updateTrainingDocument(id: number, data: Partial<InsertTrainingDocument>): Promise<TrainingDocument | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(trainingDocuments).set(data).where(eq(trainingDocuments.id, id));
  const updated = await db.select().from(trainingDocuments).where(eq(trainingDocuments.id, id));
  return updated[0];
}

export async function deleteTrainingDocument(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(trainingDocuments).where(
    and(
      eq(trainingDocuments.id, id),
      eq(trainingDocuments.userId, userId)
    )
  );
}

// ============ RAG CONFIGURATIONS ============

export async function getOrCreateRagConfig(agentId: number): Promise<RagConfiguration> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db.select()
    .from(ragConfigurations)
    .where(eq(ragConfigurations.agentId, agentId));

  if (existing.length > 0) {
    return existing[0]!;
  }

  const result = await db.insert(ragConfigurations).values({
    agentId,
    enabled: 1,
    chunkSize: 512,
    chunkOverlap: 50,
    topK: 3,
    similarityThreshold: "0.7",
    embeddingModel: "text-embedding-ada-002",
  });

  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(ragConfigurations).where(eq(ragConfigurations.id, insertedId));
  return inserted[0]!;
}

export async function updateRagConfig(agentId: number, data: Partial<InsertRagConfiguration>): Promise<RagConfiguration | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(ragConfigurations).set(data).where(eq(ragConfigurations.agentId, agentId));
  const updated = await db.select().from(ragConfigurations).where(eq(ragConfigurations.agentId, agentId));
  return updated[0];
}

// ============ VECTOR EMBEDDINGS ============

export async function createVectorEmbedding(embedding: InsertVectorEmbedding): Promise<VectorEmbedding> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(vectorEmbeddings).values(embedding);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(vectorEmbeddings).where(eq(vectorEmbeddings.id, insertedId));
  return inserted[0]!;
}

export async function getVectorEmbeddingsByAgentId(agentId: number): Promise<VectorEmbedding[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(vectorEmbeddings)
    .where(eq(vectorEmbeddings.agentId, agentId))
    .orderBy(desc(vectorEmbeddings.createdAt));
}

export async function deleteVectorEmbeddingsByDocumentId(documentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(vectorEmbeddings).where(eq(vectorEmbeddings.documentId, documentId));
}

// ============ UI FLOWS ============

export async function createUiFlow(flow: InsertUiFlow): Promise<UiFlow> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(uiFlows).values(flow);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(uiFlows).where(eq(uiFlows.id, insertedId));
  return inserted[0]!;
}

export async function getUiFlowsByUserId(userId: number): Promise<UiFlow[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(uiFlows)
    .where(eq(uiFlows.userId, userId))
    .orderBy(desc(uiFlows.updatedAt));
}

export async function getUiFlowById(id: number, userId: number): Promise<UiFlow | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const flows = await db.select()
    .from(uiFlows)
    .where(and(
      eq(uiFlows.id, id),
      eq(uiFlows.userId, userId)
    ));

  return flows[0];
}

export async function updateUiFlow(id: number, userId: number, data: Partial<InsertUiFlow>): Promise<UiFlow | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(uiFlows).set(data).where(
    and(
      eq(uiFlows.id, id),
      eq(uiFlows.userId, userId)
    )
  );

  return getUiFlowById(id, userId);
}

export async function deleteUiFlow(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Delete associated frames and connections
  await db.delete(uiFrames).where(eq(uiFrames.flowId, id));
  await db.delete(uiConnections).where(eq(uiConnections.flowId, id));
  
  await db.delete(uiFlows).where(
    and(
      eq(uiFlows.id, id),
      eq(uiFlows.userId, userId)
    )
  );
}

// ============ UI FRAMES ============

export async function createUiFrame(frame: InsertUiFrame): Promise<UiFrame> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(uiFrames).values(frame);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(uiFrames).where(eq(uiFrames.id, insertedId));
  return inserted[0]!;
}

export async function getUiFramesByFlowId(flowId: number): Promise<UiFrame[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(uiFrames)
    .where(eq(uiFrames.flowId, flowId));
}

export async function updateUiFrame(id: number, data: Partial<InsertUiFrame>): Promise<UiFrame | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(uiFrames).set(data).where(eq(uiFrames.id, id));
  const updated = await db.select().from(uiFrames).where(eq(uiFrames.id, id));
  return updated[0];
}

export async function deleteUiFrame(id: number, flowId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(uiFrames).where(
    and(
      eq(uiFrames.id, id),
      eq(uiFrames.flowId, flowId)
    )
  );
}

// ============ UI CONNECTIONS ============

export async function createUiConnection(connection: InsertUiConnection): Promise<UiConnection> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(uiConnections).values(connection);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(uiConnections).where(eq(uiConnections.id, insertedId));
  return inserted[0]!;
}

export async function getUiConnectionsByFlowId(flowId: number): Promise<UiConnection[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(uiConnections)
    .where(eq(uiConnections.flowId, flowId));
}

export async function deleteUiConnection(id: number, flowId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(uiConnections).where(
    and(
      eq(uiConnections.id, id),
      eq(uiConnections.flowId, flowId)
    )
  );
}

// ============ CONVERSATION FEEDBACK ============

export async function createConversationFeedback(
  data: Omit<InsertConversationFeedback, 'id' | 'createdAt'>
): Promise<ConversationFeedback> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversationFeedback).values(data);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(conversationFeedback).where(eq(conversationFeedback.id, insertedId));
  return inserted[0]!;
}

export async function getFeedbackByAgentId(
  agentId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ConversationFeedback[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(conversationFeedback.agentId, agentId)];
  
  if (startDate) {
    conditions.push(gte(conversationFeedback.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(conversationFeedback.createdAt, endDate));
  }

  return db.select()
    .from(conversationFeedback)
    .where(and(...conditions))
    .orderBy(desc(conversationFeedback.createdAt));
}

export async function getFeedbackStats(agentId: number): Promise<{
  totalFeedback: number;
  thumbsUp: number;
  thumbsDown: number;
  averageRating: number | null;
}> {
  const db = await getDb();
  if (!db) return { totalFeedback: 0, thumbsUp: 0, thumbsDown: 0, averageRating: null };

  const feedback = await db.select()
    .from(conversationFeedback)
    .where(eq(conversationFeedback.agentId, agentId));

  const thumbsUp = feedback.filter(f => f.feedbackType === 'thumbs_up').length;
  const thumbsDown = feedback.filter(f => f.feedbackType === 'thumbs_down').length;
  const ratings = feedback.filter(f => f.rating != null).map(f => f.rating!);
  const averageRating = ratings.length > 0 
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
    : null;

  return {
    totalFeedback: feedback.length,
    thumbsUp,
    thumbsDown,
    averageRating,
  };
}

// ============ AGENT VERSIONS ============

export async function createAgentVersion(
  data: Omit<InsertAgentVersion, 'id' | 'createdAt'>
): Promise<AgentVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agentVersions).values(data);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(agentVersions).where(eq(agentVersions.id, insertedId));
  return inserted[0]!;
}

export async function getAgentVersions(agentId: number): Promise<AgentVersion[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agentId))
    .orderBy(desc(agentVersions.version));
}

export async function getAgentVersion(agentId: number, version: number): Promise<AgentVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db.select()
    .from(agentVersions)
    .where(and(
      eq(agentVersions.agentId, agentId),
      eq(agentVersions.version, version)
    ))
    .limit(1);

  return results[0];
}

export async function getLatestAgentVersion(agentId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select()
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agentId))
    .orderBy(desc(agentVersions.version))
    .limit(1);

  return result[0]?.version || 0;
}

// ============ AUDIT LOGS ============

export async function createAuditLog(
  data: Omit<InsertAuditLog, 'id' | 'createdAt'>
): Promise<AuditLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(auditLogs).values(data);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(auditLogs).where(eq(auditLogs.id, insertedId));
  return inserted[0]!;
}

export async function getAuditLogs(
  userId?: number,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  
  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const query = db.select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

// ============ FLOW TEMPLATES ============

export async function getFlowTemplates(category?: string): Promise<FlowTemplate[]> {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return db.select()
      .from(flowTemplates)
      .where(and(
        eq(flowTemplates.isPublic, 1),
        eq(flowTemplates.category, category)
      ))
      .orderBy(desc(flowTemplates.usageCount));
  }

  return db.select()
    .from(flowTemplates)
    .where(eq(flowTemplates.isPublic, 1))
    .orderBy(desc(flowTemplates.usageCount));
}

export async function getFlowTemplate(id: number): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db.select()
    .from(flowTemplates)
    .where(eq(flowTemplates.id, id))
    .limit(1);

  return results[0];
}

export async function incrementFlowTemplateUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(flowTemplates)
    .set({ usageCount: sql`${flowTemplates.usageCount} + 1` })
    .where(eq(flowTemplates.id, id));
}

// ============ FRAME TEMPLATES ============

export async function getFrameTemplates(category?: string, type?: string): Promise<FrameTemplate[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(frameTemplates.isPublic, 1)];
  
  if (category) {
    conditions.push(eq(frameTemplates.category, category));
  }
  if (type) {
    conditions.push(eq(frameTemplates.type, type));
  }

  return db.select()
    .from(frameTemplates)
    .where(and(...conditions))
    .orderBy(desc(frameTemplates.usageCount));
}

export async function getFrameTemplate(id: number): Promise<FrameTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db.select()
    .from(frameTemplates)
    .where(eq(frameTemplates.id, id))
    .limit(1);

  return results[0];
}

// ============ API USAGE ============

export async function recordApiUsage(
  data: Omit<InsertApiUsage, 'id' | 'createdAt'>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(apiUsage).values(data);
}

export async function getApiUsageStats(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRequests: number;
  totalTokens: number;
  avgResponseTime: number;
}> {
  const db = await getDb();
  if (!db) return { totalRequests: 0, totalTokens: 0, avgResponseTime: 0 };

  const conditions = [eq(apiUsage.userId, userId)];
  
  if (startDate) {
    conditions.push(gte(apiUsage.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(apiUsage.createdAt, endDate));
  }

  const usage = await db.select()
    .from(apiUsage)
    .where(and(...conditions));

  const totalRequests = usage.length;
  const totalTokens = usage.reduce((sum, u) => sum + (u.tokensUsed || 0), 0);
  const avgResponseTime = totalRequests > 0
    ? usage.reduce((sum, u) => sum + (u.responseTimeMs || 0), 0) / totalRequests
    : 0;

  return { totalRequests, totalTokens, avgResponseTime };
}

// ============ DOCUMENT VERSIONING FUNCTIONS ============

export async function createDocumentVersion(
  data: Omit<InsertDocumentVersion, "id" | "createdAt">
): Promise<DocumentVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(documentVersions).values(data);

  const [version] = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.id, Number(result[0].insertId)));

  return version;
}

export async function getDocumentVersions(
  documentId: number
): Promise<DocumentVersion[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.version));
}

export async function getDocumentVersion(
  documentId: number,
  version: number
): Promise<DocumentVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [result] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.version, version)
      )
    )
    .limit(1);

  return result;
}

export async function updateDocumentWithVersion(
  documentId: number,
  userId: number,
  data: { content: string; changeDescription?: string }
): Promise<TrainingDocument | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Get current document
  const [doc] = await db
    .select()
    .from(trainingDocuments)
    .where(
      and(
        eq(trainingDocuments.id, documentId),
        eq(trainingDocuments.userId, userId)
      )
    )
    .limit(1);

  if (!doc) return undefined;

  // Create version record of current state
  await createDocumentVersion({
    documentId,
    version: doc.version || 1,
    content: doc.content,
    fileSize: doc.fileSize,
    chunkCount: doc.chunkCount,
    changeDescription: data.changeDescription,
    metadata: doc.metadata,
  });

  // Update document with new content and increment version
  await db
    .update(trainingDocuments)
    .set({
      content: data.content,
      version: (doc.version || 1) + 1,
      status: "pending",
    })
    .where(eq(trainingDocuments.id, documentId));

  const [updated] = await db
    .select()
    .from(trainingDocuments)
    .where(eq(trainingDocuments.id, documentId))
    .limit(1);

  return updated;
}

export async function revertDocumentToVersion(
  documentId: number,
  userId: number,
  targetVersion: number
): Promise<TrainingDocument | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Get target version
  const version = await getDocumentVersion(documentId, targetVersion);
  if (!version) return undefined;

  // Get current document
  const [doc] = await db
    .select()
    .from(trainingDocuments)
    .where(
      and(
        eq(trainingDocuments.id, documentId),
        eq(trainingDocuments.userId, userId)
      )
    )
    .limit(1);

  if (!doc) return undefined;

  // Create version record of current state before reverting
  await createDocumentVersion({
    documentId,
    version: doc.version || 1,
    content: doc.content,
    fileSize: doc.fileSize,
    chunkCount: doc.chunkCount,
    changeDescription: `Reverted to version ${targetVersion}`,
    metadata: doc.metadata,
  });

  // Revert to target version content
  await db
    .update(trainingDocuments)
    .set({
      content: version.content,
      fileSize: version.fileSize,
      version: (doc.version || 1) + 1,
      status: "pending",
    })
    .where(eq(trainingDocuments.id, documentId));

  const [updated] = await db
    .select()
    .from(trainingDocuments)
    .where(eq(trainingDocuments.id, documentId))
    .limit(1);

  return updated;
}

// ============ UI FLOW VERSION FUNCTIONS ============

export async function createUiFlowVersion(
  data: Omit<InsertUiFlowVersion, "id" | "createdAt">
): Promise<UiFlowVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(uiFlowVersions).values(data);

  const [version] = await db
    .select()
    .from(uiFlowVersions)
    .where(eq(uiFlowVersions.id, Number(result[0].insertId)));

  return version;
}

export async function getUiFlowVersions(flowId: number): Promise<UiFlowVersion[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(uiFlowVersions)
    .where(eq(uiFlowVersions.flowId, flowId))
    .orderBy(desc(uiFlowVersions.version));
}

export async function getUiFlowVersion(
  flowId: number,
  version: number
): Promise<UiFlowVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [result] = await db
    .select()
    .from(uiFlowVersions)
    .where(
      and(
        eq(uiFlowVersions.flowId, flowId),
        eq(uiFlowVersions.version, version)
      )
    )
    .limit(1);

  return result;
}

export async function saveUiFlowVersion(
  flowId: number,
  userId: number,
  changeDescription?: string
): Promise<UiFlowVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Get current flow
  const [flow] = await db
    .select()
    .from(uiFlows)
    .where(and(eq(uiFlows.id, flowId), eq(uiFlows.userId, userId)))
    .limit(1);

  if (!flow) return undefined;

  // Get current frames and connections
  const frames = await db
    .select()
    .from(uiFrames)
    .where(eq(uiFrames.flowId, flowId));

  const connections = await db
    .select()
    .from(uiConnections)
    .where(eq(uiConnections.flowId, flowId));

  // Create version record
  const version = await createUiFlowVersion({
    flowId,
    version: flow.version || 1,
    name: flow.name,
    description: flow.description,
    mermaidDiagram: flow.mermaidDiagram,
    flowData: {
      frames: frames.map((f) => ({
        frameId: f.frameId,
        name: f.name,
        type: f.type || "screen",
        positionX: f.positionX || 0,
        positionY: f.positionY || 0,
        width: f.width || 300,
        height: f.height || 200,
        config: f.config || {},
      })),
      connections: connections.map((c) => ({
        connectionId: c.connectionId,
        sourceFrameId: c.sourceFrameId,
        targetFrameId: c.targetFrameId,
        label: c.label || undefined,
        type: c.type || undefined,
      })),
    },
    changeDescription,
    createdBy: userId,
  });

  // Increment flow version
  await db
    .update(uiFlows)
    .set({ version: (flow.version || 1) + 1 })
    .where(eq(uiFlows.id, flowId));

  return version;
}

export async function revertUiFlowToVersion(
  flowId: number,
  userId: number,
  targetVersion: number
): Promise<UiFlow | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Get target version
  const version = await getUiFlowVersion(flowId, targetVersion);
  if (!version || !version.flowData) return undefined;

  // Save current state as a version first
  await saveUiFlowVersion(flowId, userId, `Before reverting to version ${targetVersion}`);

  // Delete current frames and connections
  await db.delete(uiFrames).where(eq(uiFrames.flowId, flowId));
  await db.delete(uiConnections).where(eq(uiConnections.flowId, flowId));

  // Restore frames from version
  for (const frame of version.flowData.frames) {
    await db.insert(uiFrames).values({
      flowId,
      frameId: frame.frameId,
      name: frame.name,
      type: frame.type,
      positionX: frame.positionX,
      positionY: frame.positionY,
      width: frame.width,
      height: frame.height,
      config: frame.config || {},
    });
  }

  // Restore connections from version
  for (const conn of version.flowData.connections) {
    await db.insert(uiConnections).values({
      flowId,
      connectionId: conn.connectionId,
      sourceFrameId: conn.sourceFrameId,
      targetFrameId: conn.targetFrameId,
      label: conn.label,
      type: conn.type,
    });
  }

  // Update flow metadata
  await db
    .update(uiFlows)
    .set({
      name: version.name,
      description: version.description,
      mermaidDiagram: version.mermaidDiagram,
    })
    .where(eq(uiFlows.id, flowId));

  return getUiFlowById(flowId, userId);
}

export async function deleteVectorEmbeddingsByAgentId(agentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(vectorEmbeddings).where(eq(vectorEmbeddings.agentId, agentId));
}
