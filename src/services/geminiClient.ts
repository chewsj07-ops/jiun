export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export async function aiChat(params: {
  message: string;
  history?: ChatTurn[];
  systemInstruction: string;
}): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `AI_REQUEST_FAILED_${response.status}`);
  }

  const data = await response.json();
  return typeof data.text === 'string' ? data.text : '';
}

export async function aiGenerate(params: {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: string;
}): Promise<string> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `AI_REQUEST_FAILED_${response.status}`);
  }

  const data = await response.json();
  return typeof data.text === 'string' ? data.text : '';
}
