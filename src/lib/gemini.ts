import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in your Settings.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export async function requestGeminiCompletion(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const ai = getAiClient();
  
  const formattedMessages: string[] = messages.map(m => m.content);
  const combinedPrompt = systemPrompt 
    ? `System Instruction: ${systemPrompt}\n\n${formattedMessages.join('\n\n')}`
    : formattedMessages.join('\n\n');

  try {
    console.log(`[Gemini API] Attempting completion...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: combinedPrompt,
      config: {
        temperature: options.temperature ?? 0.7,
      }
    });

    if (response.text) {
      return response.text;
    }
    throw new Error("Gemini returned empty response");
  } catch (err: any) {
    console.warn(`[Gemini API] Error:`, err.message || err);
    throw err;
  }
}
