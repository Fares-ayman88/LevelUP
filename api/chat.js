function buildInput({ message, history, attachments }) {
  const input = [];

  for (const item of history) {
    const role = item?.role === 'assistant' ? 'assistant' : 'user';
    const text = String(item?.text ?? '').trim();
    if (!text) continue;
    input.push({
      role,
      content: [{ type: 'input_text', text }],
    });
  }

  const content = [];
  if (message) {
    content.push({ type: 'input_text', text: message });
  }

  for (const attachment of attachments) {
    const type = String(attachment?.type ?? '').toLowerCase();
    if (type === 'image' && attachment?.data) {
      const mime = attachment?.mime || 'image/jpeg';
      content.push({
        type: 'input_image',
        image_url: `data:${mime};base64,${attachment.data}`,
      });
      continue;
    }

    if (type === 'file') {
      const name = String(attachment?.name ?? 'file');
      const note = String(attachment?.note ?? '').trim();
      const text = String(attachment?.text ?? '').trim();
      if (text) {
        content.push({
          type: 'input_text',
          text: `File "${name}" content:\n${text}`,
        });
      } else if (note) {
        content.push({
          type: 'input_text',
          text: `File "${name}": ${note}`,
        });
      } else {
        content.push({
          type: 'input_text',
          text: `File "${name}" attached.`,
        });
      }
    }
  }

  input.push({ role: 'user', content });
  return input;
}

function buildGeminiContents({ message, history, attachments }) {
  const contents = [];

  for (const item of history) {
    const role = item?.role === 'assistant' ? 'model' : 'user';
    const text = String(item?.text ?? '').trim();
    if (!text) continue;
    contents.push({
      role,
      parts: [{ text }],
    });
  }

  const parts = [];
  if (message) {
    parts.push({ text: message });
  }

  for (const attachment of attachments) {
    const type = String(attachment?.type ?? '').toLowerCase();
    if (type === 'image' && attachment?.data) {
      parts.push({
        inline_data: {
          mime_type: attachment?.mime || 'image/jpeg',
          data: attachment.data,
        },
      });
      continue;
    }

    if (type === 'file') {
      const name = String(attachment?.name ?? 'file');
      const note = String(attachment?.note ?? '').trim();
      const text = String(attachment?.text ?? '').trim();
      if (text) {
        parts.push({ text: `File "${name}" content:\n${text}` });
      } else if (note) {
        parts.push({ text: `File "${name}": ${note}` });
      } else {
        parts.push({ text: `File "${name}" attached.` });
      }
    }
  }

  contents.push({ role: 'user', parts });
  return contents;
}

function extractOutputText(data) {
  if (!data || !Array.isArray(data.output)) return '';
  const texts = [];
  for (const item of data.output) {
    if (item?.type !== 'message') continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === 'output_text' && part?.text) {
        texts.push(String(part.text));
      }
    }
  }
  return texts.join('').trim();
}

function extractGeminiText(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const parts = Array.isArray(candidates[0]?.content?.parts)
    ? candidates[0].content.parts
    : [];
  return parts
    .map((part) => String(part?.text || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const message = String(req.body?.message ?? '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (geminiApiKey) {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: buildGeminiContents({ message, history, attachments }),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return res.status(response.status).json({
          error: 'Gemini API error',
          status: response.status,
          body,
        });
      }

      const data = await response.json();
      const reply = extractGeminiText(data);
      if (!reply) {
        return res.status(502).json({ error: 'Empty reply from Gemini' });
      }

      return res.status(200).json({ reply });
    } catch (error) {
      return res.status(500).json({
        error: 'Gemini proxy failed',
        message: String(error?.message || error),
      });
    }
  }

  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY or OPENAI_API_KEY' });
  }

  const endpoint = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/responses';
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const input = buildInput({ message, history, attachments });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({
        error: 'OpenAI API error',
        status: response.status,
        body,
      });
    }

    const data = await response.json();
    const reply = extractOutputText(data);
    if (!reply) {
      return res.status(502).json({ error: 'Empty reply from OpenAI' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: 'Proxy failed',
      message: String(error?.message || error),
    });
  }
}
