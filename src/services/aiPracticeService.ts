import { ZEN_ASSISTANT_SYSTEM_PROMPT } from '../data/zenAssistantPrompt';
import { aiChat, ChatTurn } from './geminiClient';

export async function sendZenAssistantMessage(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const formattedHistory: ChatTurn[] = params.history
    .filter((item) => item.content.trim().length > 0)
    .slice(-12)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'model',
      text: item.content,
    }));

  return aiChat({
    message: params.message,
    history: formattedHistory,
    systemInstruction: ZEN_ASSISTANT_SYSTEM_PROMPT,
  });
}
