/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Handles document retrieval and context injection for chatbot responses
 */

import * as db from "./db";

/**
 * Simple cosine similarity calculation between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple text embedding using character frequencies
 * 
 * ⚠️ WARNING: THIS IS A DEVELOPMENT PLACEHOLDER ONLY ⚠️
 * 
 * This implementation is NOT suitable for production use. It creates embeddings
 * based on character frequencies which will not produce meaningful semantic
 * similarity results.
 * 
 * For production, replace this with OpenAI's embedding API:
 * - Use `text-embedding-ada-002` or `text-embedding-3-small`
 * - Call OpenAI API: `POST https://api.openai.com/v1/embeddings`
 * - Store the returned 1536-dimensional vector
 * 
 * @deprecated Replace with proper embedding API before production deployment
 */
function createSimpleEmbedding(text: string): number[] {
  console.warn("[RAG] WARNING: Using placeholder embedding function. Replace with OpenAI API for production!");
  
  const embedding = new Array(128).fill(0);
  const normalized = text.toLowerCase();
  
  // Create a simple embedding based on character frequencies
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = charCode % 128;
    embedding[index] += 1;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
}

/**
 * Retrieve relevant context from training documents using RAG
 */
export async function retrieveRelevantContext(
  agentId: number,
  query: string
): Promise<string | null> {
  try {
    // Get RAG configuration
    const config = await db.getOrCreateRagConfig(agentId);
    
    // Check if RAG is enabled
    if (config.enabled !== 1) {
      return null;
    }
    
    // Get all embeddings for this agent
    const embeddings = await db.getVectorEmbeddingsByAgentId(agentId);
    
    if (embeddings.length === 0) {
      return null;
    }
    
    // Create embedding for the query
    // In production, use OpenAI's embedding API
    const queryEmbedding = createSimpleEmbedding(query);
    
    // Calculate similarity scores
    const scoredEmbeddings = embeddings
      .map(embedding => {
        if (!embedding.embedding || !Array.isArray(embedding.embedding)) {
          return { embedding, score: 0 };
        }
        
        const score = cosineSimilarity(queryEmbedding, embedding.embedding);
        return { embedding, score };
      })
      .filter(item => {
        const threshold = parseFloat(config.similarityThreshold || "0.7");
        return item.score >= threshold;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK || 3);
    
    if (scoredEmbeddings.length === 0) {
      return null;
    }
    
    // Build context from top results
    const contextChunks = scoredEmbeddings.map(item => item.embedding.content);
    const context = contextChunks.join("\n\n");
    
    return context;
  } catch (error) {
    console.error("[RAG] Error retrieving context:", error);
    return null;
  }
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(text: string, chunkSize: number = 512, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    
    // Move start position with overlap
    const nextStart = end - overlap;
    
    // Avoid infinite loop if overlap is too large or we've reached the end
    if (nextStart <= start || end >= text.length) {
      break;
    }
    
    start = nextStart;
  }
  
  return chunks;
}

/**
 * Process a document for RAG training
 * Creates chunks and generates embeddings
 */
export async function processDocumentForRAG(
  documentId: number,
  agentId: number,
  content: string
): Promise<void> {
  try {
    // Get RAG configuration
    const config = await db.getOrCreateRagConfig(agentId);
    
    // Update document status
    await db.updateTrainingDocument(documentId, { status: "processing" });
    
    // Chunk the content
    const chunks = chunkText(content, config.chunkSize || 512, config.chunkOverlap || 50);
    
    // Create embeddings for each chunk
    // In production, this would use OpenAI's embedding API in batches
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = createSimpleEmbedding(chunk);
      
      await db.createVectorEmbedding({
        documentId,
        agentId,
        chunkIndex: i,
        content: chunk,
        embedding,
        metadata: {
          chunkSize: chunk.length,
        },
      });
    }
    
    // Update document status
    await db.updateTrainingDocument(documentId, {
      status: "completed",
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error("[RAG] Error processing document:", error);
    await db.updateTrainingDocument(documentId, { status: "failed" });
    throw error;
  }
}

/**
 * Build augmented prompt with retrieved context
 */
export function buildAugmentedPrompt(
  originalPrompt: string,
  context: string
): string {
  return `Context information from training documents:
---
${context}
---

Using the context above, please respond to the following:
${originalPrompt}`;
}
