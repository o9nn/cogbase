/**
 * Document Processing Utilities
 * Handles extraction and parsing of various document formats for RAG training
 */

import * as fs from "fs";
import * as path from "path";

// Dynamic imports for optional dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: any = null;
let mammoth: typeof import("mammoth") | null = null;

/**
 * Initialize optional dependencies
 */
async function initDependencies() {
  if (!pdfParse) {
    try {
      const pdfModule = await import("pdf-parse");
      pdfParse = (pdfModule as any).default || pdfModule;
    } catch {
      console.warn("[DocumentProcessor] pdf-parse not available");
    }
  }
  if (!mammoth) {
    try {
      mammoth = await import("mammoth");
    } catch {
      console.warn("[DocumentProcessor] mammoth not available");
    }
  }
}

/**
 * Supported file types for document processing
 */
export type SupportedFileType =
  | "text/plain"
  | "text/markdown"
  | "application/pdf"
  | "text/csv"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * File type detection result
 */
export interface FileTypeResult {
  isValid: boolean;
  detectedType: string | null;
  extension: string | null;
  message: string;
}

/**
 * Common file signatures (magic bytes)
 */
const FILE_SIGNATURES: Record<string, { bytes: number[]; offset?: number }> = {
  pdf: { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  docx: { bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP signature (DOCX is a ZIP)
  xlsx: { bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP signature (XLSX is a ZIP)
  png: { bytes: [0x89, 0x50, 0x4e, 0x47] },
  jpg: { bytes: [0xff, 0xd8, 0xff] },
  gif: { bytes: [0x47, 0x49, 0x46] },
};

/**
 * Allowed extensions for RAG training
 */
const ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".pdf",
  ".csv",
  ".docx",
  ".xlsx",
]);

/**
 * Validate file type using magic bytes and extension
 */
export async function validateFileType(
  buffer: Buffer,
  fileName: string,
  declaredMimeType?: string
): Promise<FileTypeResult> {
  const extension = path.extname(fileName).toLowerCase();

  // Check if extension is allowed
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      isValid: false,
      detectedType: null,
      extension,
      message: `File extension '${extension}' is not allowed. Allowed: ${Array.from(
        ALLOWED_EXTENSIONS
      ).join(", ")}`,
    };
  }

  // For text files, check if content is valid UTF-8
  if (extension === ".txt" || extension === ".md" || extension === ".csv") {
    if (!isValidUtf8(buffer)) {
      return {
        isValid: false,
        detectedType: "binary",
        extension,
        message: "File appears to be binary, not text",
      };
    }
    return {
      isValid: true,
      detectedType: extension === ".csv" ? "text/csv" : "text/plain",
      extension,
      message: "Valid text file",
    };
  }

  // Check magic bytes for binary formats
  if (extension === ".pdf") {
    if (matchesMagicBytes(buffer, FILE_SIGNATURES.pdf)) {
      return {
        isValid: true,
        detectedType: "application/pdf",
        extension,
        message: "Valid PDF file",
      };
    }
    return {
      isValid: false,
      detectedType: null,
      extension,
      message: "File does not appear to be a valid PDF",
    };
  }

  if (extension === ".docx") {
    if (matchesMagicBytes(buffer, FILE_SIGNATURES.docx)) {
      return {
        isValid: true,
        detectedType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        extension,
        message: "Valid DOCX file",
      };
    }
    return {
      isValid: false,
      detectedType: null,
      extension,
      message: "File does not appear to be a valid DOCX",
    };
  }

  if (extension === ".xlsx") {
    if (matchesMagicBytes(buffer, FILE_SIGNATURES.xlsx)) {
      return {
        isValid: true,
        detectedType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension,
        message: "Valid XLSX file",
      };
    }
    return {
      isValid: false,
      detectedType: null,
      extension,
      message: "File does not appear to be a valid XLSX",
    };
  }

  return {
    isValid: false,
    detectedType: null,
    extension,
    message: "Unknown file type",
  };
}

function matchesMagicBytes(
  buffer: Buffer,
  signature: { bytes: number[]; offset?: number }
): boolean {
  const offset = signature.offset || 0;
  if (buffer.length < offset + signature.bytes.length) return false;

  for (let i = 0; i < signature.bytes.length; i++) {
    if (buffer[offset + i] !== signature.bytes[i]) return false;
  }
  return true;
}

function isValidUtf8(buffer: Buffer): boolean {
  try {
    const text = buffer.toString("utf8");
    // Check for null bytes or other binary indicators
    if (text.includes("\x00")) return false;
    // Simple heuristic: if more than 10% are control characters, probably binary
    // controlChars is the count of NON-control characters after removing control chars
    const nonControlChars = text.replace(/[\x00-\x1f\x7f-\x9f]/g, "").length;
    const ratio = nonControlChars / text.length;
    // If ratio > 0.8, most characters are printable (valid text)
    return ratio > 0.8;
  } catch {
    return false;
  }
}

/**
 * Extract text from PDF
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  await initDependencies();

  if (!pdfParse) {
    throw new Error("pdf-parse library not available");
  }

  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("[DocumentProcessor] PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${(error as Error).message}`);
  }
}

/**
 * Extract text from DOCX
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  await initDependencies();

  if (!mammoth) {
    throw new Error("mammoth library not available");
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("[DocumentProcessor] DOCX extraction error:", error);
    throw new Error(`Failed to extract text from DOCX: ${(error as Error).message}`);
  }
}

/**
 * Parse CSV to structured text
 */
export function parseCSV(content: string): string {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return "";

  // Simple CSV parsing - for complex CSVs, use a proper library
  const results: string[] = [];
  const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  if (!headers) return content;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const row: string[] = [];

    for (let j = 0; j < headers.length && j < values.length; j++) {
      row.push(`${headers[j]}: ${values[j]}`);
    }

    results.push(row.join(", "));
  }

  return results.join("\n");
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Process document content based on file type
 */
export async function processDocument(
  content: string | Buffer,
  fileName: string,
  fileType: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
  const extension = path.extname(fileName).toLowerCase();

  let text: string;
  const metadata: Record<string, unknown> = {
    fileName,
    fileType,
    extension,
    processedAt: new Date().toISOString(),
  };

  if (Buffer.isBuffer(content)) {
    switch (extension) {
      case ".pdf":
        text = await extractPdfText(content);
        metadata.extractionMethod = "pdf-parse";
        break;
      case ".docx":
        text = await extractDocxText(content);
        metadata.extractionMethod = "mammoth";
        break;
      default:
        text = content.toString("utf8");
    }
  } else {
    text = content;
  }

  // Handle CSV formatting
  if (extension === ".csv") {
    text = parseCSV(text);
    metadata.extractionMethod = "csv-parser";
  }

  // Clean up text
  text = cleanText(text);
  metadata.characterCount = text.length;
  metadata.wordCount = text.split(/\s+/).filter(Boolean).length;

  return { text, metadata };
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ") // Replace tabs with spaces
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
    .replace(/ {2,}/g, " ") // Limit consecutive spaces
    .trim();
}

/**
 * Advanced chunking strategies
 */
export interface ChunkingOptions {
  strategy: "fixed" | "sentence" | "paragraph" | "semantic";
  chunkSize: number;
  overlap: number;
  minChunkSize?: number;
}

/**
 * Chunk text using various strategies
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {
    strategy: "fixed",
    chunkSize: 512,
    overlap: 50,
  }
): string[] {
  switch (options.strategy) {
    case "sentence":
      return chunkBySentence(text, options.chunkSize, options.overlap);
    case "paragraph":
      return chunkByParagraph(text, options.chunkSize, options.overlap);
    case "semantic":
      return chunkSemantic(text, options.chunkSize, options.overlap);
    case "fixed":
    default:
      return chunkFixed(text, options.chunkSize, options.overlap);
  }
}

/**
 * Fixed-size chunking
 */
function chunkFixed(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));

    const nextStart = end - overlap;
    if (nextStart <= start || end >= text.length) break;
    start = nextStart;
  }

  return chunks;
}

/**
 * Sentence-aware chunking
 */
function chunkBySentence(
  text: string,
  maxChunkSize: number,
  overlap: number
): string[] {
  // Split by sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";
  let overlapBuffer: string[] = [];

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());

      // Calculate overlap from previous sentences
      const overlapText = overlapBuffer.join(" ");
      currentChunk =
        overlapText.length <= overlap
          ? overlapText + " " + sentence
          : sentence;
      overlapBuffer = [];
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }

    // Track sentences for overlap
    overlapBuffer.push(sentence);
    while (
      overlapBuffer.join(" ").length > overlap &&
      overlapBuffer.length > 1
    ) {
      overlapBuffer.shift();
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Paragraph-aware chunking
 */
function chunkByParagraph(
  text: string,
  maxChunkSize: number,
  overlap: number
): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (
      currentChunk.length + paragraph.length > maxChunkSize &&
      currentChunk
    ) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from end of previous
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Semantic chunking - combines paragraph and sentence awareness
 */
function chunkSemantic(
  text: string,
  maxChunkSize: number,
  overlap: number
): string[] {
  // Split by major section breaks first
  const sections = text.split(/\n(?=[A-Z#]|\d+\.)/);

  if (sections.length > 1) {
    // Process each section separately, then combine
    return sections.flatMap((section) =>
      chunkByParagraph(section, maxChunkSize, overlap)
    );
  }

  // Fall back to paragraph chunking
  return chunkByParagraph(text, maxChunkSize, overlap);
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}
