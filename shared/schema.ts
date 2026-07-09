import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vapi設定の型定義
export type VapiConfig = {
  assistantId?: string; // 既存のVapiアシスタントIDを使用する場合
  voiceProvider: string;
  voiceId: string;
  model: string;
  systemPrompt?: string;
};

// 面接官テーブル
export const interviewers = pgTable("interviewers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  vapiConfig: jsonb("vapi_config").$type<VapiConfig>(), // Vapi設定
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 質問セットテーブル
export const questionSets = pgTable("question_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewerId: varchar("interviewer_id").notNull().references(() => interviewers.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 例: "営業職面接"、"事務職面接"
  description: text("description"), // セットの説明
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 質問テーブル
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewerId: varchar("interviewer_id").notNull().references(() => interviewers.id, { onDelete: "cascade" }),
  questionSetId: varchar("question_set_id").references(() => questionSets.id, { onDelete: "cascade" }), // 移行のため一時的にnullable
  text: text("text").notNull(),
  order: integer("order").notNull(),
  requiredFields: jsonb("required_fields").$type<string[]>().default([]), // 必須フィールド（回答で言及すべきキーワード）
  followUpLogic: text("follow_up_logic"), // 深掘りロジックの説明
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 質問のスナップショット型
export type QuestionSnapshot = {
  id: string;
  text: string;
  order: number;
  requiredFields?: string[];
  followUpLogic?: string;
};

// 面接セッションテーブル
export const interviewSessions = pgTable("interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewerId: varchar("interviewer_id").notNull().references(() => interviewers.id, { onDelete: "cascade" }),
  questionSetId: varchar("question_set_id").references(() => questionSets.id, { onDelete: "set null" }), // 使用した質問セット
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email"),
  sessionUrl: text("session_url").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  questionsSnapshot: jsonb("questions_snapshot").$type<QuestionSnapshot[]>(), // セッション作成時の質問スナップショット
  vapiAssistantId: text("vapi_assistant_id"),
  vapiCallId: text("vapi_call_id"),
  recordingUrl: text("recording_url"), // 面接の音声録音URL（モノラル）
  stereoRecordingUrl: text("stereo_recording_url"), // 面接の音声録音URL（ステレオ）
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 面接回答テーブル
export const interviewAnswers = pgTable("interview_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
  callId: text("call_id"),
  questionIndex: integer("question_index").notNull(),
  questionText: text("question_text").notNull(),
  answerText: text("answer_text").notNull(),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

// 会話ログテーブル
export const conversationLogs = pgTable("conversation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
  callId: text("call_id"),
  role: text("role").notNull(), // assistant, user, system
  message: text("message").notNull(),
  questionId: varchar("question_id").references(() => questions.id),
  isFollowUp: boolean("is_follow_up").notNull().default(false),
  recordingUrl: text("recording_url"), // 面接の音声録音URL（モノラル）
  stereoRecordingUrl: text("stereo_recording_url"), // 面接の音声録音URL（ステレオ）
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// リレーション定義
export const interviewersRelations = relations(interviewers, ({ many }) => ({
  questionSets: many(questionSets),
  questions: many(questions),
  sessions: many(interviewSessions),
}));

export const questionSetsRelations = relations(questionSets, ({ one, many }) => ({
  interviewer: one(interviewers, {
    fields: [questionSets.interviewerId],
    references: [interviewers.id],
  }),
  questions: many(questions),
  sessions: many(interviewSessions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  interviewer: one(interviewers, {
    fields: [questions.interviewerId],
    references: [interviewers.id],
  }),
  questionSet: one(questionSets, {
    fields: [questions.questionSetId],
    references: [questionSets.id],
  }),
  logs: many(conversationLogs),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  interviewer: one(interviewers, {
    fields: [interviewSessions.interviewerId],
    references: [interviewers.id],
  }),
  questionSet: one(questionSets, {
    fields: [interviewSessions.questionSetId],
    references: [questionSets.id],
  }),
  answers: many(interviewAnswers),
  logs: many(conversationLogs),
}));

export const interviewAnswersRelations = relations(interviewAnswers, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [interviewAnswers.sessionId],
    references: [interviewSessions.id],
  }),
}));

export const conversationLogsRelations = relations(conversationLogs, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [conversationLogs.sessionId],
    references: [interviewSessions.id],
  }),
  question: one(questions, {
    fields: [conversationLogs.questionId],
    references: [questions.id],
  }),
}));

// Insert schemas
const vapiConfigSchema = z.object({
  assistantId: z.string().optional(),
  voiceProvider: z.string(),
  voiceId: z.string(),
  model: z.string(),
  systemPrompt: z.string().optional(),
}).optional();

export const insertInterviewerSchema = createInsertSchema(interviewers).omit({
  id: true,
  createdAt: true,
}).extend({
  vapiConfig: vapiConfigSchema,
});

export const insertQuestionSetSchema = createInsertSchema(questionSets).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
}).extend({
  requiredFields: z.array(z.string()).optional(),
});

const questionSnapshotSchema = z.object({
  id: z.string(),
  text: z.string(),
  order: z.number(),
  requiredFields: z.array(z.string()).optional(),
  followUpLogic: z.string().optional(),
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  createdAt: true,
  sessionUrl: true,
  startedAt: true,
  completedAt: true,
}).extend({
  questionsSnapshot: z.array(questionSnapshotSchema).optional(),
});

export const insertConversationLogSchema = createInsertSchema(conversationLogs).omit({
  id: true,
  timestamp: true,
});

export const insertInterviewAnswerSchema = createInsertSchema(interviewAnswers).omit({
  id: true,
  answeredAt: true,
});

// Types
export type Interviewer = typeof interviewers.$inferSelect;
export type InsertInterviewer = z.infer<typeof insertInterviewerSchema>;

export type QuestionSet = typeof questionSets.$inferSelect;
export type InsertQuestionSet = z.infer<typeof insertQuestionSetSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;

export type InterviewAnswer = typeof interviewAnswers.$inferSelect;
export type InsertInterviewAnswer = z.infer<typeof insertInterviewAnswerSchema>;

export type ConversationLog = typeof conversationLogs.$inferSelect;
export type InsertConversationLog = z.infer<typeof insertConversationLogSchema>;
