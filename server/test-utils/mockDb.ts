type Role = "user" | "assistant";

type AgentRecord = {
  id: number;
  userId: number;
  name: string;
  description?: string;
  systemPrompt?: string;
  model: string;
  conversationStarters: string[];
  constraints: string[];
  temperature: string;
  maxTokens: number;
  status: "active" | "inactive" | "training";
  lastTrainedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ChatSessionRecord = {
  id: number;
  agentId: number;
  userId: number;
  title?: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ChatMessageRecord = {
  id: number;
  sessionId: number;
  role: Role;
  content: string;
  signalScore: string | null;
  aiRequests: number | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  createdAt: Date;
};

type AccountSettingsRecord = {
  id: number;
  userId: number;
  signalScoreThreshold: string;
  alertsEnabled: number;
  apiKey: string | null;
  creditsUsed: number;
  creditsTotal: number;
  creditsResetAt: Date;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
};

type AlertRecord = {
  id: number;
  userId: number;
  title: string;
  content: string;
  isRead: number;
  createdAt: Date;
};

type RagConfigRecord = {
  id: number;
  agentId: number;
  enabled: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: string;
  embeddingModel: string;
  createdAt: Date;
  updatedAt: Date;
};

type TrainingDocumentRecord = {
  id: number;
  agentId: number;
  userId: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
  content: string;
  status: "pending" | "processing" | "completed" | "failed";
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type VectorEmbeddingRecord = {
  id: number;
  documentId: number;
  agentId: number;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

type UiFlowRecord = {
  id: number;
  userId: number;
  agentId?: number;
  name: string;
  description?: string;
  mermaidDiagram?: string;
  createdAt: Date;
  updatedAt: Date;
};

type UiFrameRecord = {
  id: number;
  flowId: number;
  frameId: string;
  name: string;
  type: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type UiConnectionRecord = {
  id: number;
  flowId: number;
  connectionId: string;
  sourceFrameId: string;
  targetFrameId: string;
  label?: string;
  type: string;
  createdAt: Date;
};

type State = {
  nextIds: Record<string, number>;
  agents: AgentRecord[];
  chatSessions: ChatSessionRecord[];
  chatMessages: ChatMessageRecord[];
  accountSettings: Map<number, AccountSettingsRecord>;
  alerts: AlertRecord[];
  ragConfigs: Map<number, RagConfigRecord>;
  documents: TrainingDocumentRecord[];
  embeddings: VectorEmbeddingRecord[];
  uiFlows: UiFlowRecord[];
  uiFrames: UiFrameRecord[];
  uiConnections: UiConnectionRecord[];
};

function createDefaultState(): State {
  return {
    nextIds: {
      agent: 1,
      chatSession: 1,
      chatMessage: 1,
      accountSettings: 1,
      alert: 1,
      ragConfig: 1,
      document: 1,
      embedding: 1,
      uiFlow: 1,
      uiFrame: 1,
      uiConnection: 1,
    },
    agents: [],
    chatSessions: [],
    chatMessages: [],
    accountSettings: new Map(),
    alerts: [],
    ragConfigs: new Map(),
    documents: [],
    embeddings: [],
    uiFlows: [],
    uiFrames: [],
    uiConnections: [],
  };
}

let state = createDefaultState();

function nextId(key: keyof State["nextIds"]) {
  const value = state.nextIds[key];
  state.nextIds[key] += 1;
  return value;
}

function withTimestamps<T extends object>(value: T) {
  const now = new Date();
  return {
    ...value,
    createdAt: now,
    updatedAt: now,
  };
}

function ensureAccountSettings(userId: number): AccountSettingsRecord {
  const existing = state.accountSettings.get(userId);
  if (existing) {
    return existing;
  }

  const created = withTimestamps({
    id: nextId("accountSettings"),
    userId,
    signalScoreThreshold: "0.5",
    alertsEnabled: 1,
    apiKey: null,
    creditsUsed: 0,
    creditsTotal: 50,
    creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    plan: "free",
  });

  state.accountSettings.set(userId, created);
  return created;
}

function ensureRagConfig(agentId: number): RagConfigRecord {
  const existing = state.ragConfigs.get(agentId);
  if (existing) {
    return existing;
  }

  const created = withTimestamps({
    id: nextId("ragConfig"),
    agentId,
    enabled: 1,
    chunkSize: 512,
    chunkOverlap: 50,
    topK: 3,
    similarityThreshold: "0.7",
    embeddingModel: "text-embedding-ada-002",
  });

  state.ragConfigs.set(agentId, created);
  return created;
}

function matchesDateRange(
  createdAt: Date,
  startDate?: Date,
  endDate?: Date
): boolean {
  if (startDate && createdAt < startDate) return false;
  if (endDate && createdAt > endDate) return false;
  return true;
}

function buildAnalytics(agentId: number, startDate?: Date, endDate?: Date) {
  const sessions = state.chatSessions.filter(
    session =>
      session.agentId === agentId &&
      matchesDateRange(session.createdAt, startDate, endDate)
  );
  const sessionIds = new Set(sessions.map(session => session.id));
  const messages = state.chatMessages.filter(message =>
    sessionIds.has(message.sessionId)
  );
  const signalScores = messages
    .map(message => Number(message.signalScore))
    .filter(score => !Number.isNaN(score));

  return {
    totalMessages: messages.length,
    botMessages: messages.filter(message => message.role === "assistant").length,
    userMessages: messages.filter(message => message.role === "user").length,
    avgSignalScore:
      signalScores.length > 0
        ? signalScores.reduce((sum, score) => sum + score, 0) / signalScores.length
        : 0,
    sessionsCount: sessions.length,
    signalScores,
    topicsDistribution: [] as Array<{ topic: string; mentions: number }>,
    emojiUsage: {} as Record<string, number>,
  };
}

export function resetMockDb() {
  state = createDefaultState();
}

export async function upsertUser() {}

export async function getUserByOpenId() {
  return undefined;
}

export async function createAgent(
  data: Omit<AgentRecord, "id" | "createdAt" | "updatedAt">
) {
  const agent = withTimestamps({
    id: nextId("agent"),
    ...data,
  });
  state.agents.push(agent);
  return agent;
}

export async function getAgentsByUserId(userId: number) {
  return state.agents.filter(agent => agent.userId === userId);
}

export async function getAgentById(id: number, userId: number) {
  return state.agents.find(agent => agent.id === id && agent.userId === userId);
}

export async function updateAgent(
  id: number,
  userId: number,
  data: Partial<AgentRecord>
) {
  const agent = state.agents.find(item => item.id === id && item.userId === userId);
  if (!agent) return undefined;

  Object.assign(agent, data, { updatedAt: new Date() });
  return agent;
}

export async function deleteAgent(id: number, userId: number) {
  state.agents = state.agents.filter(
    agent => !(agent.id === id && agent.userId === userId)
  );
  return true;
}

export async function trainAgent(id: number, userId: number) {
  return updateAgent(id, userId, {
    status: "active",
    lastTrainedAt: new Date(),
  });
}

export async function createChatSession(
  data: Omit<ChatSessionRecord, "id" | "sessionId" | "createdAt" | "updatedAt">
) {
  const session = withTimestamps({
    id: nextId("chatSession"),
    ...data,
    sessionId: `session-${nextId("chatSession")}`,
  });
  state.chatSessions.push(session);
  return session;
}

export async function getChatSessionsByAgentId(
  agentId: number,
  startDate?: Date,
  endDate?: Date
) {
  return state.chatSessions.filter(
    session =>
      session.agentId === agentId &&
      matchesDateRange(session.createdAt, startDate, endDate)
  );
}

export async function getChatLogsWithMessages(
  agentId: number,
  startDate?: Date,
  endDate?: Date
) {
  const sessions = await getChatSessionsByAgentId(agentId, startDate, endDate);
  return sessions.map(session => {
    const messages = state.chatMessages.filter(
      message => message.sessionId === session.id
    );
    const avgSignalScore =
      messages
        .map(message => Number(message.signalScore))
        .filter(score => !Number.isNaN(score))
        .reduce((sum, score) => sum + score, 0) /
        Math.max(
          messages.filter(message => message.signalScore !== null).length,
          1
        );

    return {
      ...session,
      messages,
      avgSignalScore: Number.isFinite(avgSignalScore) ? avgSignalScore : 0,
    };
  });
}

export async function getMessagesBySessionId(sessionId: number) {
  return state.chatMessages.filter(message => message.sessionId === sessionId);
}

export async function createChatMessage(
  data: Omit<ChatMessageRecord, "id" | "createdAt">
) {
  const message = {
    id: nextId("chatMessage"),
    createdAt: new Date(),
    ...data,
    signalScore: data.signalScore ?? null,
    aiRequests: data.aiRequests ?? null,
    tokensUsed: data.tokensUsed ?? null,
    latencyMs: data.latencyMs ?? null,
  };
  state.chatMessages.push(message);
  return message;
}

export async function createAnalyticsEvent() {}

export async function incrementCreditsUsed(userId: number) {
  const settings = ensureAccountSettings(userId);
  settings.creditsUsed += 1;
  settings.updatedAt = new Date();
}

export async function getAnalyticsByAgentId(
  agentId: number,
  startDate?: Date,
  endDate?: Date
) {
  return buildAnalytics(agentId, startDate, endDate);
}

export async function getOrCreateAccountSettings(userId: number) {
  return ensureAccountSettings(userId);
}

export async function updateAccountSettings(
  userId: number,
  data: Partial<AccountSettingsRecord>
) {
  const settings = ensureAccountSettings(userId);
  Object.assign(settings, data, { updatedAt: new Date() });
  return settings;
}

export async function getAlertsByUserId(userId: number, unreadOnly?: boolean) {
  return state.alerts.filter(
    alert => alert.userId === userId && (!unreadOnly || alert.isRead === 0)
  );
}

export async function markAlertAsRead(id: number, userId: number) {
  const alert = state.alerts.find(item => item.id === id && item.userId === userId);
  if (alert) {
    alert.isRead = 1;
  }
}

export async function markAllAlertsAsRead(userId: number) {
  state.alerts
    .filter(alert => alert.userId === userId)
    .forEach(alert => {
      alert.isRead = 1;
    });
}

export async function checkSignalScoreAlert() {}

export async function checkRetrainingAlert() {}

export async function createExportedFile(data: Record<string, unknown>) {
  return data;
}

export async function getExportedFilesByUserId() {
  return [];
}

export async function getOrCreateRagConfig(agentId: number) {
  return ensureRagConfig(agentId);
}

export async function updateRagConfig(
  agentId: number,
  data: Partial<RagConfigRecord>
) {
  const config = ensureRagConfig(agentId);
  Object.assign(config, data, { updatedAt: new Date() });
  return config;
}

export async function getTrainingDocumentsByAgentId(agentId: number) {
  return state.documents.filter(document => document.agentId === agentId);
}

export async function createTrainingDocument(
  data: Omit<TrainingDocumentRecord, "id" | "createdAt" | "updatedAt">
) {
  const document = withTimestamps({
    id: nextId("document"),
    ...data,
  });
  state.documents.push(document);
  return document;
}

export async function updateTrainingDocument(
  id: number,
  data: Partial<TrainingDocumentRecord>
) {
  const document = state.documents.find(item => item.id === id);
  if (!document) {
    return undefined;
  }

  Object.assign(document, data, { updatedAt: new Date() });
  return document;
}

export async function deleteTrainingDocument(documentId: number, userId: number) {
  state.documents = state.documents.filter(
    document => !(document.id === documentId && document.userId === userId)
  );
}

export async function createVectorEmbedding(
  data: Omit<VectorEmbeddingRecord, "id" | "createdAt">
) {
  const embedding = {
    id: nextId("embedding"),
    createdAt: new Date(),
    ...data,
  };
  state.embeddings.push(embedding);
  return embedding;
}

export async function getVectorEmbeddingsByAgentId(agentId: number) {
  return state.embeddings.filter(embedding => embedding.agentId === agentId);
}

export async function deleteVectorEmbeddingsByDocumentId(documentId: number) {
  state.embeddings = state.embeddings.filter(
    embedding => embedding.documentId !== documentId
  );
}

export async function getUiFlowsByUserId(userId: number) {
  return state.uiFlows.filter(flow => flow.userId === userId);
}

export async function getUiFlowById(id: number, userId: number) {
  return state.uiFlows.find(flow => flow.id === id && flow.userId === userId);
}

export async function createUiFlow(
  data: Omit<UiFlowRecord, "id" | "createdAt" | "updatedAt">
) {
  const flow = withTimestamps({
    id: nextId("uiFlow"),
    ...data,
  });
  state.uiFlows.push(flow);
  return flow;
}

export async function updateUiFlow(
  id: number,
  userId: number,
  data: Partial<UiFlowRecord>
) {
  const flow = state.uiFlows.find(item => item.id === id && item.userId === userId);
  if (!flow) return undefined;

  Object.assign(flow, data, { updatedAt: new Date() });
  return flow;
}

export async function deleteUiFlow(id: number, userId: number) {
  state.uiFlows = state.uiFlows.filter(
    flow => !(flow.id === id && flow.userId === userId)
  );
  state.uiFrames = state.uiFrames.filter(frame => frame.flowId !== id);
  state.uiConnections = state.uiConnections.filter(connection => connection.flowId !== id);
}

export async function getUiFramesByFlowId(flowId: number) {
  return state.uiFrames.filter(frame => frame.flowId === flowId);
}

export async function createUiFrame(
  data: Omit<UiFrameRecord, "id" | "createdAt" | "updatedAt">
) {
  const frame = withTimestamps({
    id: nextId("uiFrame"),
    ...data,
  });
  state.uiFrames.push(frame);
  return frame;
}

export async function updateUiFrame(id: number, data: Partial<UiFrameRecord>) {
  const frame = state.uiFrames.find(item => item.id === id);
  if (!frame) return undefined;

  Object.assign(frame, data, { updatedAt: new Date() });
  return frame;
}

export async function deleteUiFrame(id: number, flowId: number) {
  state.uiFrames = state.uiFrames.filter(
    frame => !(frame.id === id && frame.flowId === flowId)
  );
}

export async function getUiConnectionsByFlowId(flowId: number) {
  return state.uiConnections.filter(connection => connection.flowId === flowId);
}

export async function createUiConnection(
  data: Omit<UiConnectionRecord, "id" | "createdAt">
) {
  const connection = {
    id: nextId("uiConnection"),
    createdAt: new Date(),
    ...data,
  };
  state.uiConnections.push(connection);
  return connection;
}

export async function deleteUiConnection(id: number, flowId: number) {
  state.uiConnections = state.uiConnections.filter(
    connection => !(connection.id === id && connection.flowId === flowId)
  );
}
