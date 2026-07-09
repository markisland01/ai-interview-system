// Reference: javascript_database blueprint for database setup
import {
  interviewers,
  questionSets,
  questions,
  interviewSessions,
  interviewAnswers,
  conversationLogs,
  type Interviewer,
  type InsertInterviewer,
  type QuestionSet,
  type InsertQuestionSet,
  type Question,
  type InsertQuestion,
  type InterviewSession,
  type InsertInterviewSession,
  type InterviewAnswer,
  type InsertInterviewAnswer,
  type ConversationLog,
  type InsertConversationLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Interviewers
  getInterviewer(id: string): Promise<Interviewer | undefined>;
  getAllInterviewers(): Promise<Interviewer[]>;
  createInterviewer(interviewer: InsertInterviewer): Promise<Interviewer>;
  updateInterviewer(id: string, interviewer: InsertInterviewer): Promise<Interviewer | undefined>;
  deleteInterviewer(id: string): Promise<boolean>;

  // Question Sets
  getQuestionSet(id: string): Promise<QuestionSet | undefined>;
  getQuestionSetsByInterviewer(interviewerId: string): Promise<QuestionSet[]>;
  createQuestionSet(questionSet: InsertQuestionSet): Promise<QuestionSet>;
  updateQuestionSet(id: string, questionSet: InsertQuestionSet): Promise<QuestionSet | undefined>;
  deleteQuestionSet(id: string): Promise<boolean>;

  // Questions
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsByInterviewer(interviewerId: string): Promise<Question[]>;
  getQuestionsByQuestionSet(questionSetId: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, question: InsertQuestion): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<boolean>;
  reorderQuestion(id: string, direction: "up" | "down"): Promise<boolean>;

  // Interview Sessions
  getSession(id: string): Promise<InterviewSession | undefined>;
  getSessionByUrl(sessionUrl: string): Promise<InterviewSession | undefined>;
  getSessionByVapiCallId(vapiCallId: string): Promise<InterviewSession | undefined>;
  getAllSessions(): Promise<InterviewSession[]>;
  createSession(session: InsertInterviewSession): Promise<InterviewSession>;
  updateSession(id: string, session: Partial<InterviewSession>): Promise<InterviewSession | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Interview Answers
  getAnswersBySession(sessionId: string): Promise<InterviewAnswer[]>;
  createAnswer(answer: InsertInterviewAnswer): Promise<InterviewAnswer>;
  deleteAnswersBySession(sessionId: string): Promise<void>;
  deleteAnswersByCallId(callId: string): Promise<void>;

  // Conversation Logs
  getLogsBySession(sessionId: string): Promise<ConversationLog[]>;
  createLog(log: InsertConversationLog): Promise<ConversationLog>;
  deleteLogsBySession(sessionId: string): Promise<void>;
  deleteLogsByCallId(callId: string): Promise<void>;

  // Stats
  getStats(): Promise<{
    interviewersCount: number;
    questionsCount: number;
    sessionsCount: number;
    activeSessions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Interviewers
  async getInterviewer(id: string): Promise<Interviewer | undefined> {
    const [interviewer] = await db.select().from(interviewers).where(eq(interviewers.id, id));
    return interviewer || undefined;
  }

  async getAllInterviewers(): Promise<Interviewer[]> {
    return await db.select().from(interviewers);
  }

  async createInterviewer(insertInterviewer: InsertInterviewer): Promise<Interviewer> {
    const [interviewer] = await db
      .insert(interviewers)
      .values(insertInterviewer)
      .returning();
    return interviewer;
  }

  async updateInterviewer(id: string, insertInterviewer: InsertInterviewer): Promise<Interviewer | undefined> {
    const [updated] = await db
      .update(interviewers)
      .set(insertInterviewer)
      .where(eq(interviewers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInterviewer(id: string): Promise<boolean> {
    const result = await db
      .delete(interviewers)
      .where(eq(interviewers.id, id))
      .returning();
    return result.length > 0;
  }

  // Question Sets
  async getQuestionSet(id: string): Promise<QuestionSet | undefined> {
    const [questionSet] = await db.select().from(questionSets).where(eq(questionSets.id, id));
    return questionSet || undefined;
  }

  async getQuestionSetsByInterviewer(interviewerId: string): Promise<QuestionSet[]> {
    return await db
      .select()
      .from(questionSets)
      .where(eq(questionSets.interviewerId, interviewerId))
      .orderBy(questionSets.createdAt);
  }

  async createQuestionSet(insertQuestionSet: InsertQuestionSet): Promise<QuestionSet> {
    const [questionSet] = await db
      .insert(questionSets)
      .values(insertQuestionSet)
      .returning();
    return questionSet;
  }

  async updateQuestionSet(id: string, insertQuestionSet: InsertQuestionSet): Promise<QuestionSet | undefined> {
    const [updated] = await db
      .update(questionSets)
      .set(insertQuestionSet)
      .where(eq(questionSets.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteQuestionSet(id: string): Promise<boolean> {
    const result = await db
      .delete(questionSets)
      .where(eq(questionSets.id, id))
      .returning();
    return result.length > 0;
  }

  // Questions
  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question || undefined;
  }

  async getQuestionsByInterviewer(interviewerId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.interviewerId, interviewerId))
      .orderBy(questions.order);
  }

  async getQuestionsByQuestionSet(questionSetId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.questionSetId, questionSetId))
      .orderBy(questions.order);
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values(insertQuestion)
      .returning();
    return question;
  }

  async updateQuestion(id: string, insertQuestion: InsertQuestion): Promise<Question | undefined> {
    const [updated] = await db
      .update(questions)
      .set(insertQuestion)
      .where(eq(questions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const result = await db
      .delete(questions)
      .where(eq(questions.id, id))
      .returning();
    return result.length > 0;
  }

  async reorderQuestion(id: string, direction: "up" | "down"): Promise<boolean> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    if (!question) return false;
    if (!question.questionSetId) return false; // 質問セットに属していない場合は並び替え不可

    const allQuestions = await this.getQuestionsByQuestionSet(question.questionSetId);
    const currentIndex = allQuestions.findIndex(q => q.id === id);
    
    if (currentIndex === -1) return false;
    if (direction === "up" && currentIndex === 0) return false;
    if (direction === "down" && currentIndex === allQuestions.length - 1) return false;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapQuestion = allQuestions[swapIndex];

    await db
      .update(questions)
      .set({ order: swapQuestion.order })
      .where(eq(questions.id, question.id));

    await db
      .update(questions)
      .set({ order: question.order })
      .where(eq(questions.id, swapQuestion.id));

    return true;
  }

  // Interview Sessions
  async getSession(id: string): Promise<InterviewSession | undefined> {
    const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, id));
    return session || undefined;
  }

  async getSessionByUrl(sessionUrl: string): Promise<InterviewSession | undefined> {
    const [session] = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.sessionUrl, sessionUrl));
    return session || undefined;
  }

  async getSessionByVapiCallId(vapiCallId: string): Promise<InterviewSession | undefined> {
    const [session] = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.vapiCallId, vapiCallId));
    return session || undefined;
  }

  async getAllSessions(): Promise<InterviewSession[]> {
    const sessions = await db
      .select({
        id: interviewSessions.id,
        interviewerId: interviewSessions.interviewerId,
        questionSetId: interviewSessions.questionSetId,
        candidateName: interviewSessions.candidateName,
        candidateEmail: interviewSessions.candidateEmail,
        sessionUrl: interviewSessions.sessionUrl,
        status: interviewSessions.status,
        currentQuestionIndex: interviewSessions.currentQuestionIndex,
        questionsSnapshot: interviewSessions.questionsSnapshot,
        vapiAssistantId: interviewSessions.vapiAssistantId,
        vapiCallId: interviewSessions.vapiCallId,
        recordingUrl: interviewSessions.recordingUrl,
        stereoRecordingUrl: interviewSessions.stereoRecordingUrl,
        startedAt: interviewSessions.startedAt,
        completedAt: interviewSessions.completedAt,
        createdAt: interviewSessions.createdAt,
        questionSetName: questionSets.name,
      })
      .from(interviewSessions)
      .leftJoin(questionSets, sql`${interviewSessions.questionSetId} = ${questionSets.id}`)
      .orderBy(sql`${interviewSessions.createdAt} DESC`);
    
    return sessions as any;
  }

  async createSession(insertSession: InsertInterviewSession): Promise<InterviewSession> {
    const sessionUrl = randomUUID().slice(0, 8);
    const [session] = await db
      .insert(interviewSessions)
      .values({
        ...insertSession,
        sessionUrl,
      })
      .returning();
    return session;
  }

  async updateSession(id: string, updates: Partial<InterviewSession>): Promise<InterviewSession | undefined> {
    const [updated] = await db
      .update(interviewSessions)
      .set(updates)
      .where(eq(interviewSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await db
      .delete(interviewSessions)
      .where(eq(interviewSessions.id, id))
      .returning();
    return result.length > 0;
  }

  // Interview Answers
  async getAnswersBySession(sessionId: string): Promise<InterviewAnswer[]> {
    return await db
      .select()
      .from(interviewAnswers)
      .where(eq(interviewAnswers.sessionId, sessionId))
      .orderBy(interviewAnswers.questionIndex);
  }

  async createAnswer(insertAnswer: InsertInterviewAnswer): Promise<InterviewAnswer> {
    const [answer] = await db
      .insert(interviewAnswers)
      .values(insertAnswer)
      .returning();
    return answer;
  }

  async deleteAnswersBySession(sessionId: string): Promise<void> {
    await db
      .delete(interviewAnswers)
      .where(eq(interviewAnswers.sessionId, sessionId));
  }

  async deleteAnswersByCallId(callId: string): Promise<void> {
    await db
      .delete(interviewAnswers)
      .where(eq(interviewAnswers.callId, callId));
  }

  // Conversation Logs
  async getLogsBySession(sessionId: string): Promise<ConversationLog[]> {
    return await db
      .select()
      .from(conversationLogs)
      .where(eq(conversationLogs.sessionId, sessionId))
      .orderBy(conversationLogs.timestamp);
  }

  async createLog(insertLog: InsertConversationLog): Promise<ConversationLog> {
    const [log] = await db
      .insert(conversationLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async deleteLogsBySession(sessionId: string): Promise<void> {
    await db
      .delete(conversationLogs)
      .where(eq(conversationLogs.sessionId, sessionId));
  }

  async deleteLogsByCallId(callId: string): Promise<void> {
    await db
      .delete(conversationLogs)
      .where(eq(conversationLogs.callId, callId));
  }

  // Stats
  async getStats() {
    const [interviewersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interviewers);
    
    const [questionsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions);
    
    const [sessionsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interviewSessions);
    
    const [activeSessions] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interviewSessions)
      .where(eq(interviewSessions.status, "in_progress"));

    return {
      interviewersCount: interviewersCount.count,
      questionsCount: questionsCount.count,
      sessionsCount: sessionsCount.count,
      activeSessions: activeSessions.count,
    };
  }
}

export const storage = new DatabaseStorage();
