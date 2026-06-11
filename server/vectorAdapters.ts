/**
 * Vector Database Adapters
 * Provides abstraction layer for different vector database backends
 * Supports: MySQL (default), Pinecone, Weaviate
 */

import * as db from "./db";
import { cosineSimilarity } from "./embeddings";

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: number;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Vector adapter configuration
 */
export interface VectorAdapterConfig {
  type: "mysql" | "pinecone" | "weaviate";
  // Pinecone config
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndex?: string;
  // Weaviate config
  weaviateUrl?: string;
  weaviateApiKey?: string;
  weaviateClassName?: string;
}

/**
 * Base vector adapter interface
 */
export interface VectorAdapter {
  name: string;
  isConfigured(): boolean;
  store(params: {
    documentId: number;
    agentId: number;
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  search(params: {
    agentId: number;
    queryEmbedding: number[];
    topK: number;
    minScore: number;
  }): Promise<VectorSearchResult[]>;
  delete(params: { documentId: number }): Promise<void>;
  deleteByAgent(params: { agentId: number }): Promise<void>;
}

/**
 * MySQL Vector Adapter (default)
 * Uses JSON column for embeddings with in-memory similarity search
 */
export class MySQLVectorAdapter implements VectorAdapter {
  name = "mysql";

  isConfigured(): boolean {
    return true; // Always available as fallback
  }

  async store(params: {
    documentId: number;
    agentId: number;
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await db.createVectorEmbedding({
      documentId: params.documentId,
      agentId: params.agentId,
      chunkIndex: params.chunkIndex,
      content: params.content,
      embedding: params.embedding,
      metadata: params.metadata,
    });
  }

  async search(params: {
    agentId: number;
    queryEmbedding: number[];
    topK: number;
    minScore: number;
  }): Promise<VectorSearchResult[]> {
    const embeddings = await db.getVectorEmbeddingsByAgentId(params.agentId);

    const scored = embeddings
      .map((emb) => {
        if (!emb.embedding || !Array.isArray(emb.embedding)) {
          return { emb, score: 0 };
        }
        const score = cosineSimilarity(params.queryEmbedding, emb.embedding);
        return { emb, score };
      })
      .filter((item) => item.score >= params.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, params.topK);

    return scored.map((item) => ({
      id: item.emb.id,
      content: item.emb.content,
      score: item.score,
      metadata: item.emb.metadata || undefined,
    }));
  }

  async delete(params: { documentId: number }): Promise<void> {
    await db.deleteVectorEmbeddingsByDocumentId(params.documentId);
  }

  async deleteByAgent(params: { agentId: number }): Promise<void> {
    await db.deleteVectorEmbeddingsByAgentId(params.agentId);
  }
}

/**
 * Pinecone Vector Adapter
 * Uses Pinecone cloud vector database
 */
export class PineconeVectorAdapter implements VectorAdapter {
  name = "pinecone";
  private config: VectorAdapterConfig;

  constructor(config: VectorAdapterConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.pineconeApiKey &&
        this.config.pineconeEnvironment &&
        this.config.pineconeIndex
    );
  }

  async store(params: {
    documentId: number;
    agentId: number;
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Pinecone is not configured");
    }

    const vectorId = `doc-${params.documentId}-chunk-${params.chunkIndex}`;

    const response = await fetch(
      `https://${this.config.pineconeIndex}.svc.${this.config.pineconeEnvironment}.pinecone.io/vectors/upsert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.config.pineconeApiKey!,
        },
        body: JSON.stringify({
          vectors: [
            {
              id: vectorId,
              values: params.embedding,
              metadata: {
                documentId: params.documentId,
                agentId: params.agentId,
                chunkIndex: params.chunkIndex,
                content: params.content,
                ...params.metadata,
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone upsert failed: ${error}`);
    }

    // Also store in MySQL for content retrieval
    await db.createVectorEmbedding({
      documentId: params.documentId,
      agentId: params.agentId,
      chunkIndex: params.chunkIndex,
      content: params.content,
      embedding: null, // Store in Pinecone, not MySQL
      metadata: { ...params.metadata, vectorDb: "pinecone", vectorId },
    });
  }

  async search(params: {
    agentId: number;
    queryEmbedding: number[];
    topK: number;
    minScore: number;
  }): Promise<VectorSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error("Pinecone is not configured");
    }

    const response = await fetch(
      `https://${this.config.pineconeIndex}.svc.${this.config.pineconeEnvironment}.pinecone.io/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.config.pineconeApiKey!,
        },
        body: JSON.stringify({
          vector: params.queryEmbedding,
          topK: params.topK,
          includeMetadata: true,
          filter: {
            agentId: { $eq: params.agentId },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone query failed: ${error}`);
    }

    const data = (await response.json()) as {
      matches: Array<{
        id: string;
        score: number;
        metadata?: {
          documentId?: number;
          content?: string;
          [key: string]: unknown;
        };
      }>;
    };

    return data.matches
      .filter((match) => match.score >= params.minScore)
      .map((match) => ({
        id: match.metadata?.documentId || 0,
        content: (match.metadata?.content as string) || "",
        score: match.score,
        metadata: match.metadata,
      }));
  }

  async delete(params: { documentId: number }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Pinecone is not configured");
    }

    const response = await fetch(
      `https://${this.config.pineconeIndex}.svc.${this.config.pineconeEnvironment}.pinecone.io/vectors/delete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.config.pineconeApiKey!,
        },
        body: JSON.stringify({
          filter: {
            documentId: { $eq: params.documentId },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone delete failed: ${error}`);
    }

    // Also delete from MySQL
    await db.deleteVectorEmbeddingsByDocumentId(params.documentId);
  }

  async deleteByAgent(params: { agentId: number }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Pinecone is not configured");
    }

    const response = await fetch(
      `https://${this.config.pineconeIndex}.svc.${this.config.pineconeEnvironment}.pinecone.io/vectors/delete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.config.pineconeApiKey!,
        },
        body: JSON.stringify({
          filter: {
            agentId: { $eq: params.agentId },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinecone delete failed: ${error}`);
    }

    await db.deleteVectorEmbeddingsByAgentId(params.agentId);
  }
}

/**
 * Weaviate Vector Adapter
 * Uses Weaviate cloud or self-hosted vector database
 */
export class WeaviateVectorAdapter implements VectorAdapter {
  name = "weaviate";
  private config: VectorAdapterConfig;

  constructor(config: VectorAdapterConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(this.config.weaviateUrl && this.config.weaviateClassName);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.weaviateApiKey) {
      headers["Authorization"] = "Bearer " + this.config.weaviateApiKey;
    }
    return headers;
  }

  async store(params: {
    documentId: number;
    agentId: number;
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Weaviate is not configured");
    }

    const response = await fetch(`${this.config.weaviateUrl}/v1/objects`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        class: this.config.weaviateClassName,
        properties: {
          documentId: params.documentId,
          agentId: params.agentId,
          chunkIndex: params.chunkIndex,
          content: params.content,
          metadata: JSON.stringify(params.metadata || {}),
        },
        vector: params.embedding,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weaviate store failed: ${error}`);
    }

    const data = (await response.json()) as { id: string };

    // Also store reference in MySQL
    await db.createVectorEmbedding({
      documentId: params.documentId,
      agentId: params.agentId,
      chunkIndex: params.chunkIndex,
      content: params.content,
      embedding: null,
      metadata: {
        ...params.metadata,
        vectorDb: "weaviate",
        weaviateId: data.id,
      },
    });
  }

  async search(params: {
    agentId: number;
    queryEmbedding: number[];
    topK: number;
    minScore: number;
  }): Promise<VectorSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error("Weaviate is not configured");
    }

    // GraphQL query for nearVector search
    const graphqlQuery = {
      query: `{
        Get {
          ${this.config.weaviateClassName}(
            nearVector: {
              vector: [${params.queryEmbedding.join(",")}]
              certainty: ${params.minScore}
            }
            where: {
              path: ["agentId"]
              operator: Equal
              valueInt: ${params.agentId}
            }
            limit: ${params.topK}
          ) {
            documentId
            chunkIndex
            content
            metadata
            _additional {
              certainty
            }
          }
        }
      }`,
    };

    const response = await fetch(`${this.config.weaviateUrl}/v1/graphql`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weaviate search failed: ${error}`);
    }

    const data = (await response.json()) as {
      data: {
        Get: {
          [key: string]: Array<{
            documentId: number;
            content: string;
            metadata: string;
            _additional: { certainty: number };
          }>;
        };
      };
    };

    const results = data.data.Get[this.config.weaviateClassName!] || [];

    return results.map((item) => ({
      id: item.documentId,
      content: item.content,
      score: item._additional.certainty,
      metadata: JSON.parse(item.metadata || "{}"),
    }));
  }

  async delete(params: { documentId: number }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Weaviate is not configured");
    }

    // Batch delete by documentId
    const response = await fetch(`${this.config.weaviateUrl}/v1/batch/objects`, {
      method: "DELETE",
      headers: this.getHeaders(),
      body: JSON.stringify({
        match: {
          class: this.config.weaviateClassName,
          where: {
            path: ["documentId"],
            operator: "Equal",
            valueInt: params.documentId,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weaviate delete failed: ${error}`);
    }

    await db.deleteVectorEmbeddingsByDocumentId(params.documentId);
  }

  async deleteByAgent(params: { agentId: number }): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Weaviate is not configured");
    }

    const response = await fetch(`${this.config.weaviateUrl}/v1/batch/objects`, {
      method: "DELETE",
      headers: this.getHeaders(),
      body: JSON.stringify({
        match: {
          class: this.config.weaviateClassName,
          where: {
            path: ["agentId"],
            operator: "Equal",
            valueInt: params.agentId,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Weaviate delete failed: ${error}`);
    }

    await db.deleteVectorEmbeddingsByAgentId(params.agentId);
  }
}

/**
 * Get vector adapter based on configuration
 */
export function getVectorAdapter(config?: VectorAdapterConfig): VectorAdapter {
  const envConfig: VectorAdapterConfig = {
    type:
      (process.env.VECTOR_DB_TYPE as "mysql" | "pinecone" | "weaviate") ||
      "mysql",
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
    pineconeIndex: process.env.PINECONE_INDEX,
    weaviateUrl: process.env.WEAVIATE_URL,
    weaviateApiKey: process.env.WEAVIATE_API_KEY,
    weaviateClassName: process.env.WEAVIATE_CLASS_NAME || "DocumentChunk",
  };

  const finalConfig = { ...envConfig, ...config };

  switch (finalConfig.type) {
    case "pinecone": {
      const adapter = new PineconeVectorAdapter(finalConfig);
      if (adapter.isConfigured()) return adapter;
      console.warn(
        "[VectorAdapter] Pinecone not configured, falling back to MySQL"
      );
      return new MySQLVectorAdapter();
    }
    case "weaviate": {
      const adapter = new WeaviateVectorAdapter(finalConfig);
      if (adapter.isConfigured()) return adapter;
      console.warn(
        "[VectorAdapter] Weaviate not configured, falling back to MySQL"
      );
      return new MySQLVectorAdapter();
    }
    case "mysql":
    default:
      return new MySQLVectorAdapter();
  }
}

/**
 * Get available vector adapters info
 */
export function getAvailableAdapters(): Array<{
  name: string;
  type: string;
  configured: boolean;
}> {
  const mysql = new MySQLVectorAdapter();
  const pinecone = new PineconeVectorAdapter({
    type: "pinecone",
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
    pineconeIndex: process.env.PINECONE_INDEX,
  });
  const weaviate = new WeaviateVectorAdapter({
    type: "weaviate",
    weaviateUrl: process.env.WEAVIATE_URL,
    weaviateApiKey: process.env.WEAVIATE_API_KEY,
    weaviateClassName: process.env.WEAVIATE_CLASS_NAME,
  });

  return [
    {
      name: "MySQL (Built-in)",
      type: "mysql",
      configured: mysql.isConfigured(),
    },
    { name: "Pinecone", type: "pinecone", configured: pinecone.isConfigured() },
    { name: "Weaviate", type: "weaviate", configured: weaviate.isConfigured() },
  ];
}
