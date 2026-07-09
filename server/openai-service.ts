// Reference: javascript_openai blueprint
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateFollowUpQuestion(
  originalQuestion: string,
  candidateResponse: string,
  requiredFields: string[],
  followUpLogic?: string | null
): Promise<string | null> {
  try {
    // Check if required fields are mentioned in the response
    const missingFields = requiredFields.filter(
      field => !candidateResponse.toLowerCase().includes(field.toLowerCase())
    );

    if (missingFields.length === 0) {
      // All required fields are covered, no follow-up needed
      return null;
    }

    // Generate follow-up question using OpenAI
    const systemPrompt = `あなたは面接官です。候補者の回答を分析し、必要に応じて適切な深掘り質問を生成してください。

元の質問: ${originalQuestion}
候補者の回答: ${candidateResponse}
不足している要素: ${missingFields.join(", ")}
${followUpLogic ? `深掘りロジック: ${followUpLogic}` : ""}

回答に不足している要素について、自然で適切な深掘り質問を1つ生成してください。
質問は簡潔で、候補者が答えやすいものにしてください。
JSONフォーマットで応答してください: { "followUpQuestion": "質問文" }`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates follow-up interview questions in Japanese.",
        },
        {
          role: "user",
          content: systemPrompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.followUpQuestion || null;
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    return null;
  }
}
