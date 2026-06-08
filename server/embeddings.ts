/**
 * OpenAI Embeddings Integration
 * Production-ready embedding generation using OpenAI's text-embedding-3-small model
 */

import OpenAI from "openai";
import { ENV } from "./_core/env";

// Initialize OpenAI client - uses OPENAI_API_KEY from environment
const getOpenAIClient = (): OpenAI | null => {
  const apiKey = process.env.OPENAI_API_KEY || ENV.forgeApiKey;
  if (!apiKey) {
    console.warn("[Embeddings] No OpenAI API key configured. Using placeholder embeddings.");
    return null;
  }
  return new OpenAI({ apiKey });
};

/**
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  model?: "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002";
  dimensions?: number; // Only for text-embedding-3-* models
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  model: "text-embedding-3-small",
  dimensions: 1536,
  maxRetries: 3,
  retryDelayMs: 1000,
};

/**
 * Generate embedding for a single text
 */
export async function createEmbedding(
  text: string,
  config: EmbeddingConfig = {}
): Promise<number[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const client = getOpenAIClient();

  if (!client) {
    // Fallback to placeholder embedding for development
    return createPlaceholderEmbedding(text, mergedConfig.dimensions || 1536);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= (mergedConfig.maxRetries || 3); attempt++) {
    try {
      const response = await client.embeddings.create({
        model: mergedConfig.model || "text-embedding-3-small",
        input: text,
        ...(mergedConfig.model?.startsWith("text-embedding-3") && mergedConfig.dimensions
          ? { dimensions: mergedConfig.dimensions }
          : {}),
      });

      return response.data[0].embedding;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `[Embeddings] Attempt ${attempt} failed:`,
        (error as Error).message
      );

      if (attempt < (mergedConfig.maxRetries || 3)) {
        await sleep(mergedConfig.retryDelayMs || 1000);
      }
    }
  }

  throw new Error(
    `Failed to generate embedding after ${mergedConfig.maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI supports up to 2048 inputs per request
 */
export async function createEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig = {}
): Promise<number[][]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const client = getOpenAIClient();

  if (!client) {
    // Fallback to placeholder embeddings
    return texts.map((text) =>
      createPlaceholderEmbedding(text, mergedConfig.dimensions || 1536)
    );
  }

  // Process in batches of 100 to avoid rate limits
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    let lastError: Error | null = null;
    let success = false;

    for (let attempt = 1; attempt <= (mergedConfig.maxRetries || 3); attempt++) {
      try {
        const response = await client.embeddings.create({
          model: mergedConfig.model || "text-embedding-3-small",
          input: batch,
          ...(mergedConfig.model?.startsWith("text-embedding-3") && mergedConfig.dimensions
            ? { dimensions: mergedConfig.dimensions }
            : {}),
        });

        // Sort by index to ensure order is preserved
        const sortedEmbeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        results.push(...sortedEmbeddings);
        success = true;
        break;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[Embeddings] Batch attempt ${attempt} failed:`,
          (error as Error).message
        );

        if (attempt < (mergedConfig.maxRetries || 3)) {
          await sleep(mergedConfig.retryDelayMs || 1000);
        }
      }
    }

    if (!success) {
      throw new Error(
        `Failed to generate batch embeddings after ${mergedConfig.maxRetries} attempts: ${lastError?.message}`
      );
    }

    // Add a small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < texts.length) {
      await sleep(100);
    }
  }

  return results;
}

/**
 * Placeholder embedding function for development/testing
 * Uses a deterministic hash-based approach for consistency
 */
function createPlaceholderEmbedding(text: string, dimensions: number): number[] {
  console.warn(
    "[Embeddings] WARNING: Using placeholder embedding. Configure OPENAI_API_KEY for production!"
  );

  const embedding = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase();

  // Create embedding based on character frequencies and positions
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    // Use multiple indices for better distribution
    const indices = [
      charCode % dimensions,
      (charCode * 7) % dimensions,
      (charCode * 13 + i) % dimensions,
    ];
    for (const index of indices) {
      embedding[index] += 1 / (i + 1); // Weight by position
    }
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );
  return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

/**
 * Find top-k most similar embeddings
 */
export function findTopKSimilar(
  queryEmbedding: number[],
  embeddings: { embedding: number[]; id: number; content: string }[],
  k: number,
  minSimilarity: number = 0
): { id: number; content: string; score: number }[] {
  const scored = embeddings
    .map((item) => ({
      id: item.id,
      content: item.content,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .filter((item) => item.score >= minSimilarity)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if OpenAI API is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || ENV.forgeApiKey);
}
