import type { VapiConfig } from "@shared/schema";

export interface VapiAssistant {
  name: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{
      role: string;
      content: string;
    }>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage?: string;
  server?: {
    url: string;
    timeoutSeconds?: number;
  };
  serverMessages?: string[];
}

export async function createVapiAssistant(
  sessionUrl: string,
  firstQuestion: string,
  vapiConfig?: VapiConfig | null
): Promise<string | null> {
  try {
    if (!process.env.VAPI_API_KEY) {
      console.error("VAPI_API_KEY is not set");
      return null;
    }

    // デフォルト設定
    const defaultConfig: VapiConfig = {
      voiceProvider: "11labs",
      voiceId: "burt",
      model: "gpt-4",
      systemPrompt: "あなたはプロフェッショナルな面接官です。",
    };

    const config = vapiConfig || defaultConfig;

    // 既存のアシスタントIDが設定されている場合はそれを使用
    if (config.assistantId) {
      console.log(`Using existing Vapi assistant: ${config.assistantId}`);
      return config.assistantId;
    }

    // アシスタントIDが設定されていない場合はエラー
    console.error("No assistant ID configured in Vapi config");
    return null;
  } catch (error) {
    console.error("Error in createVapiAssistant:", error);
    return null;
  }
}

export async function startVapiCall(
  assistantId: string,
  sessionUrl: string
): Promise<string | null> {
  try {
    if (!process.env.VAPI_API_KEY) {
      console.error("VAPI_API_KEY is not set");
      return null;
    }

    const response = await fetch("https://api.vapi.ai/call/web", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        metadata: {
          sessionUrl,
        },
      }),
    });

    if (!response.ok) {
      console.error("Failed to start Vapi call:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("Error starting Vapi call:", error);
    return null;
  }
}

export async function endVapiCall(callId: string): Promise<boolean> {
  try {
    if (!process.env.VAPI_API_KEY) {
      console.error("VAPI_API_KEY is not set");
      return false;
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error ending Vapi call:", error);
    return false;
  }
}

export async function updateVapiAssistant(
  assistantId: string,
  webhookUrl: string
): Promise<boolean> {
  try {
    if (!process.env.VAPI_API_KEY) {
      console.error("VAPI_API_KEY is not set");
      return false;
    }

    const updateData = {
      server: {
        url: webhookUrl,
        timeoutSeconds: 20,
      },
      serverMessages: [
        "conversation-update",
        "end-of-call-report",
        "status-update",
      ],
    };

    console.log(`Updating Vapi assistant ${assistantId} with webhook config:`, updateData);

    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to update Vapi assistant:", errorText);
      return false;
    }

    const data = await response.json();
    console.log("Vapi assistant updated successfully:", data);
    return true;
  } catch (error) {
    console.error("Error updating Vapi assistant:", error);
    return false;
  }
}
