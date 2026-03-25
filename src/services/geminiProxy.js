const baseUrl = (import.meta.env.VITE_GEMINI_PROXY_URL || '').trim();
const apiKey = (import.meta.env.VITE_GEMINI_PROXY_API_KEY || '').trim();

export async function sendGeminiChat({ message, history = [], attachments = [] }) {
  if (!baseUrl) {
    throw new Error('Missing VITE_GEMINI_PROXY_URL.');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      message,
      history,
      attachments,
      locale: 'ar',
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini proxy error: ${response.status}`);
  }

  return response.json();
}
