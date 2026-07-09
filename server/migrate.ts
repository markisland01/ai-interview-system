import { db } from "./db";
import { interviewers, questionSets, questions } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

export async function migrateToQuestionSets() {
  console.log("Checking for data migration to question sets...");

  // すべての面接官を取得
  const allInterviewers = await db.select().from(interviewers);

  for (const interviewer of allInterviewers) {
    // この面接官の質問セットを確認
    const existingSets = await db
      .select()
      .from(questionSets)
      .where(eq(questionSets.interviewerId, interviewer.id));

    let defaultSet;

    if (existingSets.length === 0) {
      // デフォルト質問セットを作成
      const [newSet] = await db
        .insert(questionSets)
        .values({
          interviewerId: interviewer.id,
          name: "デフォルト質問セット",
          description: "既存の質問を移行したセット",
        })
        .returning();
      
      defaultSet = newSet;
      console.log(`Created default question set for interviewer ${interviewer.id}`);
    } else {
      // 既存のセットがある場合は最初のものを使用
      defaultSet = existingSets[0];
    }

    // questionSetId が null の質問をデフォルトセットに移行
    const questionsToMigrate = await db
      .select()
      .from(questions)
      .where(
        eq(questions.interviewerId, interviewer.id)
      );

    const nullQuestions = questionsToMigrate.filter(q => q.questionSetId === null);

    if (nullQuestions.length > 0) {
      for (const question of nullQuestions) {
        await db
          .update(questions)
          .set({ questionSetId: defaultSet.id })
          .where(eq(questions.id, question.id));
      }
      console.log(`Migrated ${nullQuestions.length} questions to default set for interviewer ${interviewer.id}`);
    }
  }

  console.log("Data migration completed successfully.");
}
