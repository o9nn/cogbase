/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Handles document retrieval and context injection for chatbot responses
 */

import * as db from "./db";
import {
  createEmbedding,
  createEmbeddingsBatch,
  cosineSimilarity,
  isOpenAIConfigured,
} from "./embeddings";
import {
  processDocument as processDocumentContent,
  chunkText as chunkTextAdvanced,
  ChunkingOptions,
  validateFileType,
} from "./documentProcessor";

// Re-export for backward compatibility
export { validateFileType };

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
    
    // Create embedding for the query using production OpenAI API
    const queryEmbedding = await createEmbedding(query);
    
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
 * Supports multiple strategies: fixed, sentence, paragraph, semantic
 */
export function chunkText(
  text: string, 
  chunkSize: number = 512, 
  overlap: number = 50,
  strategy: "fixed" | "sentence" | "paragraph" | "semantic" = "fixed"
): string[] {
  return chunkTextAdvanced(text, {
    strategy,
    chunkSize,
    overlap,
  });
}

/**
 * Process a document for RAG training
 * Creates chunks and generates embeddings using OpenAI API
 */
export async function processDocumentForRAG(
  documentId: number,
  agentId: number,
  content: string,
  fileName?: string,
  fileType?: string
): Promise<void> {
  try {
    // Get RAG configuration
    const config = await db.getOrCreateRagConfig(agentId);
    
    // Update document status
    await db.updateTrainingDocument(documentId, { status: "processing" });
    
    // Process document content if file info provided
    let processedText = content;
    let metadata: Record<string, unknown> = {};
    
    if (fileName && fileType) {
      try {
        const result = await processDocumentContent(content, fileName, fileType);
        processedText = result.text;
        metadata = result.metadata;
      } catch (error) {
        console.warn("[RAG] Document processing error, using raw content:", error);
      }
    }
    
    // Determine chunking strategy based on configuration or content type
    const chunkingStrategy = determineChunkingStrategy(processedText, config);
    
    // Chunk the content
    const chunks = chunkText(
      processedText, 
      config.chunkSize || 512, 
      config.chunkOverlap || 50,
      chunkingStrategy
    );
    
    // Generate embeddings in batches using OpenAI API
    console.log(`[RAG] Generating embeddings for ${chunks.length} chunks...`);
    
    const embeddings = await createEmbeddingsBatch(chunks, {
      model: (config.embeddingModel as "text-embedding-3-small") || "text-embedding-3-small",
    });
    
    // Store embeddings in database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      
      await db.createVectorEmbedding({
        documentId,
        agentId,
        chunkIndex: i,
        content: chunk,
        embedding,
        metadata: {
          chunkSize: chunk.length,
          chunkingStrategy,
          ...metadata,
        },
      });
    }
    
    // Update document status
    await db.updateTrainingDocument(documentId, {
      status: "completed",
      chunkCount: chunks.length,
    });
    
    console.log(`[RAG] Successfully processed document ${documentId} with ${chunks.length} chunks`);
  } catch (error) {
    console.error("[RAG] Error processing document:", error);
    await db.updateTrainingDocument(documentId, { status: "failed" });
    throw error;
  }
}

/**
 * Determine optimal chunking strategy based on content
 */
function determineChunkingStrategy(
  text: string,
  _config: db.RagConfiguration
): "fixed" | "sentence" | "paragraph" | "semantic" {
  // If content has clear paragraph structure, use paragraph chunking
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length > 3) {
    return "paragraph";
  }
  
  // If content has clear sentence structure, use sentence chunking
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (sentences.length > 10) {
    return "sentence";
  }
  
  // Default to fixed chunking
  return "fixed";
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

/**
 * Check if RAG system is properly configured for production
 */
export function checkRAGConfiguration(): {
  isConfigured: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  if (!isOpenAIConfigured()) {
    warnings.push("OpenAI API key not configured - using placeholder embeddings");
  }
  
  return {
    isConfigured: warnings.length === 0,
    warnings,
  };
}

/**
 * Get RAG system status
 */
export async function getRAGStatus(agentId: number): Promise<{
  enabled: boolean;
  documentsCount: number;
  chunksCount: number;
  isProductionReady: boolean;
}> {
  const config = await db.getOrCreateRagConfig(agentId);
  const documents = await db.getTrainingDocumentsByAgentId(agentId);
  const embeddings = await db.getVectorEmbeddingsByAgentId(agentId);
  
  return {
    enabled: config.enabled === 1,
    documentsCount: documents.length,
    chunksCount: embeddings.length,
    isProductionReady: isOpenAIConfigured(),
  };
}
