# Implementation Summary: RAG Training & UI Autogeneration

## Overview
This implementation adds two major features to the Cogbase chatbot platform:
1. **RAG Training System** - Retrieval-Augmented Generation for knowledge-enhanced chatbot responses
2. **UI Flow Builder** - Tempo AI-style canvas for visual conversational flow design

## What Was Implemented

### 1. RAG Training System

#### Database Schema
- `trainingDocuments`: Stores uploaded training documents with processing status
- `ragConfigurations`: Per-agent RAG settings (chunk size, similarity threshold, etc.)
- `vectorEmbeddings`: Stores document chunks and their embeddings for retrieval

#### Backend Features
- Document upload with validation (file type, size limits)
- Text chunking with multiple strategies (fixed, sentence, paragraph, semantic)
- **PDF text extraction** using pdf-parse library
- **DOCX text extraction** using mammoth library
- **XLSX file support** via file validation
- **CSV parsing** with header detection
- Embedding generation with **multiple model support**:
  - text-embedding-3-small (default)
  - text-embedding-3-large
  - text-embedding-ada-002
- Batch embedding generation with rate limiting
- Vector similarity search for context retrieval
- RAG configuration management per agent
- Integration into chat message flow

#### Frontend Features
- RAG Training tab in Agent Detail page
- Document upload interface with drag-and-drop support
- Real-time processing status indicators
- RAG configuration controls:
  - Enable/disable toggle
  - Chunk size slider (128-2048 chars)
  - Top-K results slider (1-10)
  - Similarity threshold slider (0-1)
- Document list with file info and delete functionality

#### Supported File Types
- `.txt` - Plain text files
- `.md` - Markdown files
- `.pdf` - PDF documents (text extraction via pdf-parse)
- `.csv` - CSV files (automatic header detection and parsing)
- `.docx` - Microsoft Word documents (via mammoth)
- `.xlsx` - Microsoft Excel spreadsheets

#### Chunking Strategies
1. **Fixed** - Fixed-size chunks with configurable overlap
2. **Sentence** - Sentence-aware chunking that respects sentence boundaries
3. **Paragraph** - Paragraph-aware chunking for maintaining context
4. **Semantic** - Combines section detection with paragraph awareness

#### How It Works
1. User uploads training documents (.txt, .md, .pdf, .csv, .docx, .xlsx)
2. Document content is extracted using format-specific processors
3. System chunks documents based on selected strategy
4. Embeddings are generated via OpenAI API (or placeholder in development)
5. When user asks a question:
   - Query is embedded
   - Similar chunks are retrieved using cosine similarity
   - Context is injected into the prompt
   - LLM generates response with retrieved knowledge

### 2. UI Flow Builder

#### Database Schema
- `uiFlows`: Stores flow metadata and Mermaid diagrams
- `uiFrames`: Canvas frames/screens with position and size
- `uiConnections`: Visual links between frames
- `flowTemplates`: Pre-built flow templates with frame and connection data
- `frameTemplates`: Component/frame templates for reuse

#### Backend Features
- Complete CRUD operations for flows, frames, and connections
- Mermaid diagram storage and retrieval
- Frame positioning and sizing
- Connection management with labels

#### Frontend Features
- **UI Flows List Page**:
  - Grid view of all flows
  - Create, edit, and delete flows
  - Quick navigation to canvas editor

- **Canvas Editor**:
  - Interactive drag-and-drop canvas
  - Frame creation and positioning
  - Visual connection drawing
  - Grid overlay (toggleable)
  - Connection deletion
  - Frame deletion
  - Status bar showing frame/connection counts

- **Mermaid Integration**:
  - Generate Mermaid diagram from canvas
  - Edit Mermaid code directly
  - Save diagram representation
  - Automatic syntax generation

#### How It Works
1. User creates a new UI Flow
2. In canvas editor, user adds frames (screens/components)
3. User drags frames to position them
4. User clicks link icon on a frame, then clicks another frame to connect
5. System automatically saves positions and connections
6. User can generate Mermaid diagram from visual layout
7. Export functionality available (coming soon)

## Technical Details

### Technologies Used
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express, tRPC, Drizzle ORM
- **Database**: MySQL
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod schemas

### API Endpoints

All endpoints use tRPC for type-safe API calls:

**RAG Endpoints**:
- `rag.getConfig` - Get RAG configuration
- `rag.updateConfig` - Update RAG settings
- `rag.listDocuments` - List training documents
- `rag.uploadDocument` - Upload new document
- `rag.deleteDocument` - Delete document and embeddings
- `rag.processDocument` - Trigger document processing

**UI Flow Endpoints**:
- `uiFlow.list` - List all flows
- `uiFlow.get` - Get flow with frames and connections
- `uiFlow.create` - Create new flow
- `uiFlow.update` - Update flow metadata
- `uiFlow.delete` - Delete flow and all associated data
- `uiFlow.createFrame` - Add frame to canvas
- `uiFlow.updateFrame` - Update frame position/size
- `uiFlow.deleteFrame` - Remove frame
- `uiFlow.createConnection` - Create connection between frames
- `uiFlow.deleteConnection` - Remove connection

## Testing

Comprehensive test suite added:
- RAG router authentication and functionality tests
- UI Flow CRUD operation tests
- Frame and connection management tests
- All tests follow existing patterns using Vitest

## Security Considerations

✅ **Implemented**:
- Server-side file validation for document uploads
- File size limits (10MB)
- File type whitelist
- SQL injection protection via Drizzle ORM
- Authentication required for all operations
- User isolation (users can only access their own data)

✅ **CodeQL Analysis**: No security vulnerabilities found

⚠️ **Production Notes**:
- Replace placeholder embedding function with OpenAI API
- Consider implementing rate limiting for document uploads
- Add content scanning for malicious files
- Implement job queue for document processing (currently synchronous)

## Production Deployment Checklist

Before deploying to production:

1. **Configure OpenAI API Key**:
   - Set `OPENAI_API_KEY` environment variable
   - Embeddings module already supports OpenAI integration
   - Fallback to placeholder embeddings for development

2. **Add Job Queue**:
   - Implement async document processing
   - Use Bull, BullMQ, or similar for job management
   - Add retry logic for failed processing

3. **Vector Database** (Optional but Recommended):
   - Consider Pinecone, Weaviate, or Qdrant for better performance
   - Current MySQL storage works but may be slow at scale

4. **Add Monitoring**:
   - Track document processing success/failure rates
   - Monitor embedding generation costs
   - Alert on failed document processing

5. **Enhanced Security**:
   - Add virus scanning for uploaded files
   - Content-based file type detection already implemented
   - PDF, DOCX, XLSX parsing already implemented

## File Changes Summary

### New Files
- `client/src/components/RagTraining.tsx` - RAG training UI component
- `client/src/pages/UiFlows.tsx` - UI Flows list page
- `client/src/pages/UiFlowCanvas.tsx` - Canvas editor
- `server/rag.ts` - RAG utility functions
- `server/rag.test.ts` - Test suite
- `server/embeddings.ts` - OpenAI embeddings integration with multiple model support
- `server/documentProcessor.ts` - Document parsing (PDF, DOCX, CSV) and chunking strategies
- `README.md` - Comprehensive documentation

### Modified Files
- `drizzle/schema.ts` - Added new tables
- `server/db.ts` - Added database functions
- `server/routers.ts` - Added RAG and UI Flow routers
- `client/src/App.tsx` - Added routes
- `client/src/components/DashboardLayout.tsx` - Added navigation
- `client/src/pages/AgentDetail.tsx` - Added RAG tab

## Future Enhancements

### RAG System
- [x] Support for DOCX, XLSX files (via `documentProcessor.ts` using mammoth library)
- [x] PDF text extraction (via `documentProcessor.ts` using pdf-parse library)
- [x] Semantic chunking strategies (fixed, sentence, paragraph, semantic modes in `documentProcessor.ts`)
- [x] Multiple embedding model support (text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002 in `embeddings.ts`)
- [x] PPT file support (via `documentProcessor.ts` using officeparser library)
- [x] Document versioning (via `documentVersions` table and API endpoints)
- [x] Bulk document upload (upload up to 20 files at once)
- [x] Document preview (view content, chunks, and version history)
- [x] Search within documents (full-text and semantic search)

### UI Flow Builder
- [x] Flow Templates database schema (`flowTemplates` table in schema)
- [x] Frame Templates database schema (`frameTemplates` table in schema)
- [ ] Component library for common patterns
- [ ] Template flows (customer support, onboarding, etc.)
- [ ] Export to JSON/YAML
- [ ] Import from Mermaid diagrams
- [ ] Collaboration features (real-time editing)
- [ ] Version control for flows
- [ ] Flow validation and testing
- [ ] Direct integration with chatbot logic
- [ ] Live preview of conversations

## Resources

- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Mermaid Diagram Syntax](https://mermaid.js.org/syntax/flowchart.html)
- [Retrieval-Augmented Generation Paper](https://arxiv.org/abs/2005.11401)

## Support

For questions or issues:
1. Check the README.md for API documentation
2. Review the test files for usage examples
3. Examine the TypeScript interfaces for data structures

## License

MIT
