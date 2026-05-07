const defaultBaseUrl = typeof window !== 'undefined' ? '/api' : '';
const baseUrl = (import.meta.env.VITE_GEMINI_PROXY_URL || defaultBaseUrl).trim();
const apiKey = (import.meta.env.VITE_GEMINI_PROXY_API_KEY || '').trim();

async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text };
  }
}

function getErrorMessage(data) {
  if (!data || typeof data !== 'object') return '';
  return [
    data.error,
    data.message,
    data.status ? `status: ${data.status}` : '',
  ]
    .filter(Boolean)
    .join(' - ');
}

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

  const data = await readResponse(response);
  if (!response.ok) {
    const details = getErrorMessage(data);
    throw new Error(
      details
        ? `Assistant request failed (${response.status}): ${details}`
        : `Assistant request failed (${response.status}).`
    );
  }

  return data || {};
}
