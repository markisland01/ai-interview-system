import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInterviewerSchema, insertQuestionSetSchema, insertQuestionSchema, insertInterviewSessionSchema, type InterviewSession } from "@shared/schema";
import { z } from "zod";

// Track conversation state per call
interface CallState {
  sessionUrl: string;
  currentQuestionIndex: number;
  recordingConsentGiven: boolean;
  waitingForAnswer: boolean;
}

const callStates = new Map<string, CallState>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Interviewers endpoints
  app.get("/api/interviewers", async (req, res) => {
    try {
      const interviewers = await storage.getAllInterviewers();
      res.json(interviewers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interviewers" });
    }
  });

  app.get("/api/interviewers/:id", async (req, res) => {
    try {
      const interviewer = await storage.getInterviewer(req.params.id);
      if (!interviewer) {
        return res.status(404).json({ error: "Interviewer not found" });
      }
      res.json(interviewer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch interviewer" });
    }
  });

  app.post("/api/interviewers", async (req, res) => {
    try {
      const data = insertInterviewerSchema.parse(req.body);
      const interviewer = await storage.createInterviewer(data);
      res.json(interviewer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create interviewer" });
    }
  });

  app.patch("/api/interviewers/:id", async (req, res) => {
    try {
      const data = insertInterviewerSchema.parse(req.body);
      const interviewer = await storage.updateInterviewer(req.params.id, data);
      if (!interviewer) {
        return res.status(404).json({ error: "Interviewer not found" });
      }
      res.json(interviewer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update interviewer" });
    }
  });

  app.delete("/api/interviewers/:id", async (req, res) => {
    try {
      const success = await storage.deleteInterviewer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Interviewer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete interviewer" });
    }
  });

  // Question Sets endpoints
  app.get("/api/question-sets/:interviewerId", async (req, res) => {
    try {
      const questionSets = await storage.getQuestionSetsByInterviewer(req.params.interviewerId);
      
      // Fetch question counts for each question set
      const questionSetsWithCounts = await Promise.all(
        questionSets.map(async (qs) => {
          const questions = await storage.getQuestionsByQuestionSet(qs.id);
          return {
            ...qs,
            questionCount: questions.length,
          };
        })
      );
      
      res.json(questionSetsWithCounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch question sets" });
    }
  });

  app.get("/api/question-sets/detail/:id", async (req, res) => {
    try {
      const questionSet = await storage.getQuestionSet(req.params.id);
      if (!questionSet) {
        return res.status(404).json({ error: "Question set not found" });
      }
      res.json(questionSet);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch question set" });
    }
  });

  app.post("/api/question-sets", async (req, res) => {
    try {
      const data = insertQuestionSetSchema.parse(req.body);
      const questionSet = await storage.createQuestionSet(data);
      res.json(questionSet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create question set" });
    }
  });

  app.patch("/api/question-sets/:id", async (req, res) => {
    try {
      const data = insertQuestionSetSchema.parse(req.body);
      const questionSet = await storage.updateQuestionSet(req.params.id, data);
      if (!questionSet) {
        return res.status(404).json({ error: "Question set not found" });
      }
      res.json(questionSet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update question set" });
    }
  });

  app.delete("/api/question-sets/:id", async (req, res) => {
    try {
      const success = await storage.deleteQuestionSet(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Question set not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete question set" });
    }
  });

  // Questions endpoints
  app.get("/api/questions/:interviewerId", async (req, res) => {
    try {
      const questions = await storage.getQuestionsByInterviewer(req.params.interviewerId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.get("/api/questions/set/:questionSetId", async (req, res) => {
    try {
      const questions = await storage.getQuestionsByQuestionSet(req.params.questionSetId);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.post("/api/questions", async (req, res) => {
    try {
      const data = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(data);
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  app.patch("/api/questions/:id", async (req, res) => {
    try {
      const data = insertQuestionSchema.parse(req.body);
      const question = await storage.updateQuestion(req.params.id, data);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  app.delete("/api/questions/:id", async (req, res) => {
    try {
      const success = await storage.deleteQuestion(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  app.post("/api/questions/:id/reorder", async (req, res) => {
    try {
      const { direction } = req.body;
      if (direction !== "up" && direction !== "down") {
        return res.status(400).json({ error: "Invalid direction" });
      }
      const success = await storage.reorderQuestion(req.params.id, direction);
      if (!success) {
        return res.status(400).json({ error: "Cannot reorder" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder question" });
    }
  });

  // Interview Sessions endpoints
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id/logs", async (req, res) => {
    try {
      const logs = await storage.getLogsBySession(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/sessions/:id/answers", async (req, res) => {
    try {
      const answers = await storage.getAnswersBySession(req.params.id);
      res.json(answers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch answers" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertInterviewSessionSchema.parse(req.body);
      
      // Get current questions for snapshot
      let questions;
      if (data.questionSetId) {
        // Use question set if specified
        questions = await storage.getQuestionsByQuestionSet(data.questionSetId);
      } else {
        // Fallback to interviewer's questions for backward compatibility
        questions = await storage.getQuestionsByInterviewer(data.interviewerId);
      }
      
      const questionsSnapshot = questions.map((q, index) => ({
        id: q.id,
        text: `[質問${index + 1}] ${q.text}`, // Add question ID prefix for reliable extraction
        order: q.order,
        requiredFields: q.requiredFields || undefined,
        followUpLogic: q.followUpLogic || undefined,
      }));
      
      const session = await storage.createSession({
        ...data,
        questionsSnapshot,
      });
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/interview/:sessionUrl", async (req, res) => {
    try {
      const session = await storage.getSessionByUrl(req.params.sessionUrl);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/interview/:sessionUrl/start", async (req, res) => {
    try {
      const session = await storage.getSessionByUrl(req.params.sessionUrl);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Block completed sessions from restarting
      if (session.status === "completed") {
        return res.status(400).json({ error: "This interview session has already been completed" });
      }

      // Use questions snapshot from session (not current questions from interviewer)
      const questions = session.questionsSnapshot || [];
      if (questions.length === 0) {
        return res.status(400).json({ error: "No questions found for this interview" });
      }

      // Check for existing answers to determine progress
      const existingAnswers = await storage.getAnswersBySession(session.id);
      const answeredIndices = new Set(existingAnswers.map(a => a.questionIndex));
      
      // Find remaining questions
      const remainingQuestions = questions.filter((_, index) => !answeredIndices.has(index));
      const startIndex = questions.findIndex((_, index) => !answeredIndices.has(index));
      
      if (remainingQuestions.length === 0) {
        return res.status(400).json({ error: "All questions have been answered" });
      }

      console.log(`Resuming interview from question ${startIndex + 1}/${questions.length}`);
      
      // Get interviewer for Vapi config
      const interviewer = await storage.getInterviewer(session.interviewerId);
      
      // Check if Vapi credentials are available
      if (!process.env.VAPI_API_KEY || !process.env.VAPI_PUBLIC_KEY) {
        console.warn("Vapi credentials not configured - voice features unavailable");
        
        // Update session status and current question index
        const updated = await storage.updateSession(session.id, {
          status: "in_progress",
          startedAt: session.startedAt || new Date(),
          currentQuestionIndex: startIndex,
        });
        
        return res.json({ 
          ...updated, 
          assistantId: null,
          publicKey: null,
          questions: remainingQuestions,
          startIndex,
          error: "Vapi credentials not configured"
        });
      }
      
      // Create Vapi assistant with interviewer config
      const { createVapiAssistant, updateVapiAssistant } = await import("./vapi-service");
      const assistantId = await createVapiAssistant(
        req.params.sessionUrl,
        remainingQuestions[0].text, // Keep [質問X] prefix
        interviewer?.vapiConfig
      );

      // Update assistant with webhook configuration
      if (assistantId) {
        // Get webhook URL from environment
        const replitDomains = process.env.REPLIT_DOMAINS;
        const webhookUrl = replitDomains 
          ? `https://${replitDomains.split(',')[0]}/webhooks/vapi`
          : 'https://0d81177d-237e-4adf-92ec-2678821a1cb1-00-31yzmsrvukw1t.riker.replit.dev/webhooks/vapi';
        
        console.log(`Updating assistant ${assistantId} with webhook URL: ${webhookUrl}`);
        await updateVapiAssistant(assistantId, webhookUrl);
      }

      // Update session status and current question index
      const updated = await storage.updateSession(session.id, {
        status: "in_progress",
        startedAt: session.startedAt || new Date(),
        currentQuestionIndex: startIndex,
      });

      res.json({ 
        ...updated, 
        assistantId: assistantId || null,
        publicKey: process.env.VAPI_PUBLIC_KEY || null,
        questions: remainingQuestions,
        startIndex,
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ error: "Failed to start interview" });
    }
  });

  // Register call ID with session
  app.post("/api/interview/:sessionUrl/register-call", async (req, res) => {
    console.log("=== REGISTER-CALL ENDPOINT CALLED ===");
    console.log("Session URL:", req.params.sessionUrl);
    console.log("Request body:", req.body);
    
    try {
      const { sessionUrl } = req.params;
      const { callId } = req.body;

      console.log("Extracted - sessionUrl:", sessionUrl, "callId:", callId);

      if (!callId) {
        console.log("ERROR: No callId provided");
        res.status(400).json({ error: "Call ID is required" });
        return;
      }

      const session = await storage.getSessionByUrl(sessionUrl);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      // Save call ID to session for later lookup
      await storage.updateSession(session.id, {
        vapiCallId: callId,
      });

      // Initialize call state with this session
      callStates.set(callId, {
        sessionUrl,
        currentQuestionIndex: 0,
        recordingConsentGiven: false,
        waitingForAnswer: false,
      });

      console.log(`Registered call ${callId} for session ${sessionUrl}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to register call:", error);
      res.status(500).json({ error: "Failed to register call" });
    }
  });

  // Vapi Webhook endpoint
  app.post("/webhooks/vapi", async (req, res) => {
    try {
      console.log("=== VAPI WEBHOOK RECEIVED ===");
      console.log("Full body:", JSON.stringify(req.body, null, 2));
      
      // Vapi sends webhooks with message object containing type
      const message = req.body.message || req.body;
      const type = message.type;
      const call = message.call || req.body.call;

      console.log("Vapi webhook received:", { type, message, call });

      const callId = call?.id;
      // Get sessionUrl from variableValues (Web SDK doesn't support metadata)
      const sessionUrl = message.assistant?.variableValues?.sessionUrl || call?.metadata?.sessionUrl;

      // Initialize call state if this is the first event
      if (callId && sessionUrl && !callStates.has(callId)) {
        callStates.set(callId, {
          sessionUrl,
          currentQuestionIndex: 0,
          recordingConsentGiven: false,
          waitingForAnswer: false,
        });
        console.log(`Initialized call state for callId: ${callId}`);
      }

      const callState = callStates.get(callId);

      // conversation-update events are no longer needed - we process everything from end-of-call-report

      // Process end-of-call report to save answers
      if (type === "end-of-call-report" && callId) {
        console.log(`Processing end-of-call-report for callId: ${callId}`);
        
        // Get session from vapi call ID using direct lookup
        const session = await storage.getSessionByVapiCallId(callId);
        
        console.log(`Found session: ${session ? session.id : 'NOT FOUND'}`);
        console.log(`Questions snapshot exists: ${session?.questionsSnapshot ? 'YES' : 'NO'}`);
        
        if (session && session.questionsSnapshot) {
          try {
            // Delete existing logs and answers for this callId to prevent duplicates (idempotency)
            // This preserves logs from previous interview attempts on the same session
            console.log(`Clearing existing logs and answers for callId ${callId}`);
            await storage.deleteLogsByCallId(callId);
            await storage.deleteAnswersByCallId(callId);
            // Extract answers from transcript using AI analysis
            const messages = message.artifact?.messages || [];
            const questions = session.questionsSnapshot;
            const transcript = message.artifact?.transcript || message.transcript || "";
            
            console.log(`Total messages in artifact: ${messages.length}`);
            console.log(`Total questions in snapshot: ${questions.length}`);
            
            // Try AI-based transcript analysis first
            let aiAnalysisSuccess = false;
            
            try {
              if (transcript) {
                const { analyzeTranscriptWithAI, formatAnswerWithFollowUps } = await import("./transcript-analyzer");
                console.log("Attempting AI-based transcript analysis...");
                
                const analyzedAnswers = await analyzeTranscriptWithAI(transcript, questions);
                console.log(`AI extracted ${analyzedAnswers.length} answers`);
                
                // Verify that analyzed answers actually exist in transcript
                const transcriptLower = transcript.toLowerCase();
                let validAnswerCount = 0;
                
                for (const analyzed of analyzedAnswers) {
                  if (analyzed.questionIndex < questions.length) {
                    const question = questions[analyzed.questionIndex];
                    const mainAnswer = analyzed.mainAnswer || "";
                    
                    // Skip if answer is "回答が見つかりません" or empty
                    if (!mainAnswer || mainAnswer.includes("回答が見つかりません")) {
                      console.log(`Skipping invalid answer for question ${analyzed.questionIndex}: empty or not found`);
                      continue;
                    }
                    
                    // Verify answer exists in transcript (allow some flexibility with normalization)
                    const normalizedAnswer = mainAnswer.replace(/\s+/g, '').toLowerCase();
                    const normalizedTranscript = transcriptLower.replace(/\s+/g, '');
                    
                    // Answer must be at least 3 characters and exist in transcript
                    if (normalizedAnswer.length < 3 || !normalizedTranscript.includes(normalizedAnswer)) {
                      console.log(`Skipping hallucinated answer for question ${analyzed.questionIndex}: "${mainAnswer}" not found in transcript`);
                      continue;
                    }
                    
                    const formattedAnswer = formatAnswerWithFollowUps(
                      mainAnswer,
                      analyzed.followUpQA || []
                    );
                    
                    await storage.createAnswer({
                      sessionId: session.id,
                      callId: callId,
                      questionIndex: analyzed.questionIndex,
                      questionText: question.text,
                      answerText: formattedAnswer,
                    });
                    validAnswerCount++;
                    console.log(`Saved verified AI-analyzed answer for question ${analyzed.questionIndex}`);
                  }
                }
                
                aiAnalysisSuccess = validAnswerCount > 0;
                console.log(`AI analysis success: ${aiAnalysisSuccess} (${validAnswerCount} valid answers out of ${analyzedAnswers.length} extracted)`);
              }
            } catch (aiError) {
              console.error("AI analysis failed, falling back to pattern matching:", aiError);
            }
            
            // Fallback to pattern matching if AI analysis failed
            if (!aiAnalysisSuccess) {
              console.log("Using fallback pattern matching...");
              
              // Track question-answer pairs by detecting [質問X] pattern
              const answersMap = new Map<number, string[]>();
              let currentQuestionIndex: number | null = null;
              
              for (const msg of messages) {
                const content = msg.message || msg.content || "";
                const role = msg.role === "bot" ? "assistant" : msg.role;
                
                // Check if AI message contains [質問X] pattern
                if (role === "assistant") {
                  const match = content.match(/\[質問(\d+)\]/);
                  if (match) {
                    const questionNumber = parseInt(match[1]);
                    currentQuestionIndex = questionNumber - 1;
                    console.log(`Detected [質問${questionNumber}] - Index: ${currentQuestionIndex}`);
                    
                    if (!answersMap.has(currentQuestionIndex)) {
                      answersMap.set(currentQuestionIndex, []);
                    }
                  }
                }
                
                if (currentQuestionIndex !== null && role === "user") {
                  answersMap.get(currentQuestionIndex)?.push(content);
                }
              }
              
              if (answersMap.size > 0) {
                console.log(`Saving ${answersMap.size} answers ([質問X] pattern)`);
                for (const [questionIndex, answerParts] of Array.from(answersMap.entries())) {
                  if (answerParts.length > 0 && questionIndex < questions.length) {
                    const answerText = answerParts.join(" ").trim();
                    const question = questions[questionIndex];
                    
                    await storage.createAnswer({
                      sessionId: session.id,
                      callId: callId,
                      questionIndex: questionIndex,
                      questionText: question.text,
                      answerText: answerText,
                    });
                    console.log(`Saved answer for question ${questionIndex} (pattern match)`);
                  }
                }
              } else {
                // Legacy substring matching
                console.log("Using legacy substring matching...");
                for (let i = 0; i < questions.length; i++) {
                  const question = questions[i];
                  const cleanedText = question.text.replace(/^\[質問\d+\]\s*/, '');
                  const searchText = cleanedText.substring(0, 20).toLowerCase();
                  
                  let answerText = "";
                  let foundQuestion = false;
                  
                  for (const msg of messages) {
                    const content = msg.message || msg.content || "";
                    
                    if ((msg.role === "assistant" || msg.role === "bot") && 
                        content.toLowerCase().includes(searchText)) {
                      foundQuestion = true;
                      continue;
                    }
                    
                    if (foundQuestion && msg.role === "user") {
                      answerText += (answerText ? " " : "") + content;
                      
                      const nextQuestionIndex = i + 1;
                      if (nextQuestionIndex < questions.length) {
                        const nextMsg = messages[messages.indexOf(msg) + 1];
                        if (nextMsg && (nextMsg.role === "assistant" || nextMsg.role === "bot")) {
                          break;
                        }
                      }
                    }
                  }
                  
                  if (answerText.trim()) {
                    await storage.createAnswer({
                      sessionId: session.id,
                      callId: callId,
                      questionIndex: i,
                      questionText: question.text,
                      answerText: answerText.trim(),
                    });
                  }
                }
              }
            }
            
            // Extract recording URLs from artifact (before saving logs so we can include them)
            const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
            const stereoRecordingUrl = message.artifact?.stereoRecordingUrl || message.stereoRecordingUrl;
            
            // Save conversation logs from messages (exclude system messages and first assistant message)
            console.log(`Saving conversation logs...`);
            let savedLogsCount = 0;
            let isFirstAssistantMessage = true;
            let isFirstLog = true; // Track first log to add recording URLs
            
            for (const msg of messages) {
              const content = msg.message || msg.content || "";
              const role = msg.role === "bot" ? "assistant" : msg.role; // Normalize bot -> assistant
              
              // Skip system messages, empty messages, and first assistant message (Vapi's firstMessage)
              if (role === "system" || !content) {
                continue;
              }
              
              if (role === "assistant" && isFirstAssistantMessage) {
                isFirstAssistantMessage = false;
                continue; // Skip first assistant message
              }
              
              // Include recording URLs in the first log for this callId
              await storage.createLog({
                sessionId: session.id,
                callId: callId,
                role: role,
                message: content,
                questionId: null,
                isFollowUp: false,
                recordingUrl: isFirstLog ? recordingUrl : undefined,
                stereoRecordingUrl: isFirstLog ? stereoRecordingUrl : undefined,
              });
              isFirstLog = false; // Only first log gets recording URLs
              savedLogsCount++;
            }
            console.log(`Saved ${savedLogsCount} conversation logs (excluded system and first assistant message)`);
            
            console.log(`Extracting recording URLs:`);
            console.log(`  recordingUrl: ${recordingUrl}`);
            console.log(`  stereoRecordingUrl: ${stereoRecordingUrl}`);
            
            // Check if all questions were answered (excluding "回答が見つかりません" answers)
            const allAnswers = await storage.getAnswersBySession(session.id);
            const validAnswers = allAnswers.filter(answer => 
              answer.answerText && 
              answer.answerText.trim() !== "" &&
              !answer.answerText.includes("回答が見つかりません")
            );
            const totalQuestions = questions.length;
            const allQuestionsAnswered = validAnswers.length >= totalQuestions;
            
            console.log(`Interview completion check: ${validAnswers.length}/${totalQuestions} valid questions answered (${allAnswers.length} total answers)`);
            
            // Update session status based on completion
            const updateData: Partial<InterviewSession> = {
              status: allQuestionsAnswered ? "completed" : "cancelled",
              completedAt: new Date(),
              ...(recordingUrl && { recordingUrl }),
              ...(stereoRecordingUrl && { stereoRecordingUrl }),
            };
            
            console.log(`Updating session with:`, updateData);
            const updatedSession = await storage.updateSession(session.id, updateData);
            console.log(`Updated session result:`, updatedSession);
            
            console.log(`Interview finished (${updateData.status}) and answers saved for session ${session.id}`);
            if (recordingUrl) {
              console.log(`Recording URL saved: ${recordingUrl}`);
            }
          } catch (error) {
            console.error("Error saving answers:", error);
          }
        }
        
        console.log(`Cleaning up call state for callId: ${callId}`);
        callStates.delete(callId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Vapi webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
