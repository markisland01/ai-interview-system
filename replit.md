# AI Interview System - Replit Configuration

## Overview

This is an AI-powered interview system that automates candidate interviews using voice AI technology. The application enables HR professionals to create and manage interview sessions, define interview questions with follow-up logic, and conduct automated voice-based interviews with candidates. The system leverages Vapi for voice AI capabilities and OpenAI (GPT-5) for intelligent follow-up question generation.

**Core Purpose**: Streamline the interview process by automating initial candidate screening through AI-driven voice interviews while maintaining a high quality of assessment through intelligent question follow-ups.

## Recent Changes

### October 17, 2025 - Question Sets Feature
- **Question Set Management**: Implemented a complete question set system for organizing interview questions
  - Multiple question sets per interviewer (e.g., "Sales Interview", "Admin Interview")
  - Full CRUD operations: create, read, update, delete question sets
  - Each question now belongs to a specific question set
- **Database Schema Updates**:
  - New `question_sets` table with name, description, and interviewer reference
  - Added `questionSetId` foreign key to `questions` table
  - Added `questionSetId` foreign key to `interview_sessions` table for tracking which set was used
  - Cascade deletion ensures data integrity when sets are deleted
- **Data Migration**: Automatic migration on server startup
  - Creates default question set "デフォルト質問セット" for each interviewer
  - Migrates all existing questions to their interviewer's default set
  - Migrates all existing sessions to use default question sets
  - Idempotent implementation prevents duplicate migrations
- **API Enhancements**:
  - `/api/question-sets/:interviewerId` - List all question sets with question counts
  - `/api/question-sets` (POST) - Create new question set
  - `/api/question-sets/:id` (PATCH/DELETE) - Update/delete question set
  - `/api/questions/:questionSetId` - Get questions by question set
  - `/api/sessions` (POST) - Now accepts questionSetId for session creation
  - `/api/sessions` (GET) - Returns question set name with each session (via LEFT JOIN)
- **UI Updates**:
  - Question management page redesigned with two-step flow: select question set → manage questions
  - Session creation form now includes question set selection (shows after interviewer selection)
  - Session list displays question set name for each session
  - Session detail dialog shows question set information
- **Implementation Files**:
  - `shared/schema.ts`: Schema definitions and relations
  - `server/storage.ts`: Storage layer with question set CRUD
  - `server/routes.ts`: API endpoints for question sets
  - `server/migrate.ts`: Data migration logic
  - `client/src/pages/questions.tsx`: Question set selection and management UI
  - `client/src/pages/sessions.tsx`: Question set display and selection

### October 16, 2025 - AI-Powered Transcript Analysis
- **OpenAI Integration**: Implemented AI-powered transcript analysis using GPT-4o to extract interview answers
  - Primary extraction method: AI analyzes full transcript to identify main questions and follow-up Q&A
  - Handles speech recognition inconsistencies (e.g., "質問1" → "七問一", "しつもんいち")
  - Tolerates ASR artifacts: fillers, partial words, and incomplete utterances
- **Enhanced Answer Format**: Answers now include both main responses and follow-up questions/answers
  - Structured text format: main answer + labeled follow-up Q&A blocks
  - Preserves complete context without schema changes
- **Three-Tier Extraction Strategy**:
  1. Primary: AI-powered transcript analysis (most reliable)
  2. Fallback 1: [質問X] pattern detection in messages
  3. Fallback 2: Legacy substring matching for backward compatibility
- **Error Handling**: Graceful degradation with automatic fallback when AI analysis fails
- **Implementation Files**: 
  - `server/transcript-analyzer.ts`: AI analysis and formatting logic
  - `server/routes.ts`: Integration with end-of-call-report webhook

### October 15, 2025 - Batch Processing Migration & Performance Optimization
- **Batch Processing**: Migrated from real-time conversation logging to batch processing via end-of-call-report
  - All conversation logs are now saved in batch after interview completion
  - Answers are extracted from the final transcript and saved together
  - Recording URLs (recordingUrl, stereoRecordingUrl) are saved with session completion
- **Idempotency & Data Integrity**: 
  - Existing logs and answers are deleted before saving new data to prevent duplicates on webhook retries
  - Added `deleteLogsBySession()` and `deleteAnswersBySession()` methods
- **Performance Optimization**:
  - Added `getSessionByVapiCallId()` method for direct session lookup by Vapi call ID
  - Eliminated inefficient `getAllSessions()` scanning in webhook handler
- **Code Cleanup**: Removed unused real-time conversation-update processing logic

### October 15, 2025 - Interview Resume Functionality
- **Question Snapshot System**: Questions are now frozen as a snapshot (JSONB) at session creation time, ensuring interview consistency even if the interviewer modifies the master questions later
- **Answer Persistence**: New `interview_answers` table stores all candidate responses with question index mapping for efficient retrieval
- **Resume Capability**: Interviews can now resume from the last answered question. The system:
  - Checks existing answers on session start
  - Calculates remaining questions based on answered indices
  - Passes only unanswered questions to Vapi
  - Updates UI progress bar to show absolute position in total question set
- **End-of-Call Processing**: Answers are automatically extracted from Vapi's end-of-call-report transcript and saved to the database
- **Progress Tracking**: UI now correctly displays "Question X / Total" accounting for resume scenarios

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**:
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with a custom design system

**Design System**:
- Modern Enterprise UI approach combining Material Design and Fluent Design elements
- Dark mode as default with light mode support
- Custom color palette defined in CSS variables for consistent theming
- Professional, trust-building visual design optimized for HR applications
- Inter font family for primary text, JetBrains Mono for transcription display

**Key Architectural Decisions**:
- **Component Structure**: Modular UI components using Radix UI primitives for accessibility and consistency
- **State Management**: React Query handles all server state, eliminating need for Redux/Context for API data
- **Routing Strategy**: Wouter chosen for minimal bundle size over React Router
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Theme Management**: CSS variables with class-based theme switching (dark/light modes)

### Backend Architecture

**Technology Stack**:
- Node.js with Express.js framework
- TypeScript for type safety across the stack
- Drizzle ORM for database interactions
- Neon serverless PostgreSQL as the database
- WebSocket support via ws package for real-time capabilities

**API Design**:
- RESTful API architecture with consistent endpoint patterns
- Endpoints organized by resource (interviewers, questions, sessions, logs)
- Zod schemas for request/response validation shared between client and server
- Error handling middleware for consistent error responses

**Key Architectural Decisions**:
- **Server Architecture**: Express middleware pattern with route registration system
- **Database Layer**: Drizzle ORM chosen for type-safe SQL queries and schema management
- **Validation Strategy**: Shared Zod schemas between frontend and backend ensure type consistency
- **Development Experience**: Hot module replacement in development with Vite integration
- **Production Build**: esbuild for fast server-side bundling

### Database Schema

**Core Tables**:
1. **interviewers**: Stores interviewer profiles with name and email
2. **question_sets**: Organizes questions into named sets (e.g., "Sales Interview", "Admin Interview")
   - Belongs to an interviewer (one-to-many)
   - Includes name and optional description
   - Cascade deletion removes associated questions when deleted
3. **questions**: Interview questions with order, required fields, and follow-up logic
   - Belongs to a question set (one-to-many)
   - Links to interviewer via question set
4. **interview_sessions**: Active and completed interview sessions with status tracking
   - **questionSetId**: References the question set used for this session
   - **questionsSnapshot** (JSONB): Frozen copy of questions at session creation time, ensuring interview consistency even if interviewer modifies questions later
   - **currentQuestionIndex**: Tracks progress for resume functionality
5. **interview_answers**: Stores candidate answers for each question
   - Links to sessions via sessionId
   - Indexed by questionIndex for efficient resume logic
   - Stores both question text and answer text for historical record
6. **conversation_logs**: Complete conversation history with role-based message tracking

**Relationships**:
- Interviewers have multiple question sets (one-to-many)
- Question sets belong to interviewers (many-to-one)
- Questions belong to question sets (many-to-one)
- Interview sessions reference question sets (many-to-one)
- Interview sessions belong to interviewers (many-to-one)
- Interview answers belong to sessions (one-to-many)
- Conversation logs belong to sessions (one-to-many)
- Questions can be referenced in conversation logs (optional foreign key)

**Key Design Decisions**:
- UUID primary keys for all tables using PostgreSQL's gen_random_uuid()
- Cascade deletion to maintain referential integrity
- JSONB fields for flexible data storage (requiredFields array, questionsSnapshot)
- Timestamp tracking for all entities
- Unique constraints on critical fields (email, sessionUrl)
- **Interview Resume System**: Questions are frozen as snapshot at session creation, answers are tracked separately, enabling interviews to resume from last completed question

### External Dependencies

**AI & Voice Services**:
- **Vapi API**: Voice AI platform for conducting audio interviews
  - Assistant creation with custom prompts
  - Voice synthesis using 11labs provider
  - Real-time conversation handling
- **OpenAI API (GPT-5)**: Intelligent follow-up question generation
  - Analyzes candidate responses against required fields
  - Generates contextual follow-up questions
  - JSON-formatted responses for structured data

**Database**:
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database
  - WebSocket-based connection for serverless compatibility
  - Environment variable configuration (DATABASE_URL)
  - Drizzle ORM migration support

**UI Component Libraries**:
- **Radix UI**: Accessible, unstyled component primitives
  - Complete component coverage (dialogs, dropdowns, tooltips, etc.)
  - ARIA-compliant implementations
  - Full keyboard navigation support
- **Tailwind CSS**: Utility-first CSS framework
  - Custom configuration for design system
  - CSS variables for dynamic theming
  - Responsive design utilities

**Development Tools**:
- **Replit-specific plugins**: Development banner, cartographer, runtime error overlay
- **TypeScript**: Type checking across entire codebase
- **ESBuild & Vite**: Fast build tools for development and production

**Session Management**:
- Express sessions with PostgreSQL store (connect-pg-simple)
- Unique session URLs for candidate interview access
- Status tracking (pending, in_progress, completed, cancelled)

**Authentication & Security**:
- Environment-based API key management (VAPI_API_KEY, OPENAI_API_KEY)
- Credentials included in fetch requests for session persistence
- CORS and security headers configured via Express middleware