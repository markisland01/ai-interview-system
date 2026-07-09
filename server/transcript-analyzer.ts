import OpenAI from "openai";
import type { QuestionSnapshot } from "@shared/schema";

export interface AnalyzedAnswer {
  questionIndex: number;
  mainAnswer: string;
  followUpQA: Array<{
    question: string;
    answer: string;
  }>;
}

export async function analyzeTranscriptWithAI(
  transcript: string,
  questions: QuestionSnapshot[]
): Promise<AnalyzedAnswer[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build the prompt
    const questionsList = questions
      .map((q, i) => `${i + 1}. ${q.text.replace(/^\[質問\d+\]\s*/, '')}`)
      .join('\n');

    const prompt = `以下は音声面接のtranscriptです。
全部で${questions.length}個のメイン質問があります。

【重要な制約】
あなたは情報抽出のみを行うツールです。推測、想像、補完は一切禁止です。

あなたのタスク：
1. transcriptに実際に存在する回答のみを抽出する
2. transcript内で明確に質問されて回答されている内容だけを記録する
3. 深掘り質問とその回答のペアを抽出する

絶対に守るべきルール：
❌ transcriptに存在しない回答を作らない
❌ 推測や想像で回答を補わない
❌ 「よろしくお願いします」などの挨拶を回答として扱わない
✅ transcript内のUser発言のみが回答候補
✅ 質問に対する具体的な回答のみを抽出する
✅ 回答がない質問は結果に含めない

メイン質問リスト：
${questionsList}

Transcript:
${transcript}

以下のJSON形式で回答してください：
{
  "answers": [
    {
      "questionIndex": 0,
      "mainAnswer": "transcriptに実際に存在する回答テキスト",
      "followUpQA": [
        {"question": "深掘り質問1", "answer": "深掘り回答1"}
      ]
    }
  ]
}

注意：
- questionIndexは0から始まります（0 = 質問1, 1 = 質問2...）
- 深掘り質問がない場合は followUpQA は空配列にしてください
- 回答が見つからない質問は answers 配列に含めないでください
- 挨拶、相槌、フィラーは回答ではありません
- transcriptに実際に書かれている内容のみを抽出してください`;

    console.log("Analyzing transcript with OpenAI...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "あなたは面接transcriptから情報を正確に抽出する専門ツールです。transcriptに実際に存在する内容のみを抽出してください。推測、想像、補完は一切禁止です。存在しない情報を作り出すことは絶対にしてはいけません。JSON形式で回答してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.0,
    });

    const responseText = completion.choices[0].message.content || "{}";
    console.log("OpenAI response:", responseText);
    
    const parsed = JSON.parse(responseText);
    return parsed.answers || [];
  } catch (error) {
    console.error("Error analyzing transcript with AI:", error);
    throw error;
  }
}

export function formatAnswerWithFollowUps(
  mainAnswer: string,
  followUpQA: Array<{ question: string; answer: string }>
): string {
  let formatted = mainAnswer;
  
  if (followUpQA && followUpQA.length > 0) {
    formatted += "\n\n【深掘り質問と回答】";
    followUpQA.forEach((qa, index) => {
      formatted += `\nQ${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`;
    });
  }
  
  return formatted;
}
