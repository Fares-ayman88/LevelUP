import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

const PORT = process.env.PORT || 8787;
const PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
const OPENAI_ENDPOINT =
  process.env.OPENAI_ENDPOINT || "https://api.openai.com/v1/chat/completions";
const OLLAMA_BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3:instruct";
const LLM_ENDPOINT =
  process.env.LLM_ENDPOINT || "http://localhost:1234/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL || "phi-3-mini-instruct";

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "gemini-proxy" });
});

function buildInput({ message, history, attachments }) {
  const input = [];
  for (const item of history) {
    const role = item?.role === "assistant" ? "assistant" : "user";
    const text = String(item?.text ?? "").trim();
    if (!text) continue;
    input.push({
      role,
      content: [{ type: "input_text", text }],
    });
  }

  const content = [];
  if (message) {
    content.push({ type: "input_text", text: message });
  }

  for (const attachment of attachments) {
    const type = String(attachment?.type ?? "").toLowerCase();
    if (type === "image" && attachment?.data) {
      const mime = attachment?.mime || "image/jpeg";
      content.push({
        type: "input_image",
        image_url: `data:${mime};base64,${attachment.data}`,
      });
      continue;
    }

    if (type === "file") {
      const name = String(attachment?.name ?? "file");
      const note = String(attachment?.note ?? "").trim();
      const text = String(attachment?.text ?? "").trim();
      if (text) {
        content.push({
          type: "input_text",
          text: `File "${name}" content:\n${text}`,
        });
      } else if (note) {
        content.push({
          type: "input_text",
          text: `File "${name}": ${note}`,
        });
      } else {
        content.push({
          type: "input_text",
          text: `File "${name}" attached.`,
        });
      }
    }
  }

  input.push({ role: "user", content });
  return input;
}

app.post("/chat", async (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const attachments = Array.isArray(req.body?.attachments)
    ? req.body.attachments
    : [];

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  if (PROVIDER === "ollama") {
    try {
      const reply = await ollamaChat({
        message,
        history,
        attachments,
        stream: false,
      });
      if (!reply) {
        return res.status(502).json({ error: "Empty reply from Ollama" });
      }
      return res.json({ reply });
    } catch (err) {
      return res.status(500).json({
        error: "Ollama API error",
        message: String(err?.message || err),
      });
    }
  }

  if (PROVIDER === "lmstudio" || PROVIDER === "openai-compat") {
    try {
      const reply = await openaiCompatChat({
        message,
        history,
        attachments,
        stream: false,
      });
      if (!reply) {
        return res
          .status(502)
          .json({ error: "Empty reply from LM Studio" });
      }
      return res.json({ reply });
    } catch (err) {
      return res.status(500).json({
        error: "LM Studio API error",
        message: String(err?.message || err),
      });
    }
  }

  if (!OPENAI_API_KEY.trim()) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const input = buildInput({ message, history, attachments });

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: input,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorData = JSON.parse(errorBody).error || {};
      
      // Fallback response for demo/testing
      if (errorData.code === "insufficient_quota" || response.status === 429) {
        const reply = `I appreciate your question about "${message}". In a production environment with a valid API key, I would provide a comprehensive response. For now, I'm in demo mode. Please ensure you have a valid OpenAI API key with available credits to enable full AI assistance.`;
        return res.json({ reply });
      }
      
      return res.status(response.status).json({
        error: "OpenAI API error",
        status: response.status,
        body: errorBody,
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || extractOutputText(data);

    if (!reply) {
      return res.status(502).json({ error: "Empty reply from OpenAI" });
    }

    return res.json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "Proxy failed",
      message: String(err?.message || err),
    });
  }
});

app.post("/chat/stream", async (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const attachments = Array.isArray(req.body?.attachments)
    ? req.body.attachments
    : [];

  if (!message && attachments.length === 0) {
    return res.status(400).json({ error: "message is required" });
  }

  if (PROVIDER === "ollama") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    try {
      await ollamaChat({
        message,
        history,
        attachments,
        stream: true,
        onDelta: (delta) => {
          if (!delta) return;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        },
      });
      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({
          delta: "",
          error: "Ollama API error",
          message: String(err?.message || err),
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }
  }

  if (PROVIDER === "lmstudio" || PROVIDER === "openai-compat") {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    try {
      await openaiCompatChat({
        message,
        history,
        attachments,
        stream: true,
        onDelta: (delta) => {
          if (!delta) return;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        },
      });
      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({
          delta: "",
          error: "LM Studio API error",
          message: String(err?.message || err),
        })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }
  }

  if (!OPENAI_API_KEY.trim()) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const input = buildInput({ message, history, attachments });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
        max_output_tokens: 512,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      res.write(
        `data: ${JSON.stringify({
          delta: "",
          error: "OpenAI API error",
          status: response.status,
          body: errorBody,
        })}\n\n`
      );
      return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event?.type === "response.output_text.delta") {
            const delta = String(event?.delta ?? "");
            if (!delta) continue;
            fullText += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
            continue;
          }
          if (event?.type === "error") {
            res.write(
              `data: ${JSON.stringify({
                delta: "",
                error: "OpenAI API error",
                body: JSON.stringify(event),
              })}\n\n`
            );
          }
        } catch (_) {}
      }
    }

    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({
        delta: "",
        error: "Proxy failed",
        message: String(err?.message || err),
      })}\n\n`
    );
    return res.end();
  }
});

function extractOutputText(data) {
  if (!data || !Array.isArray(data.output)) return "";
  const texts = [];
  for (const item of data.output) {
    if (item?.type !== "message") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "output_text" && part?.text) {
        texts.push(String(part.text));
      }
    }
  }
  return texts.join("").trim();
}

function buildOllamaMessages({ message, history, attachments }) {
  const messages = [];
  for (const item of history) {
    const role = item?.role === "assistant" ? "assistant" : "user";
    const text = String(item?.text ?? "").trim();
    if (!text) continue;
    messages.push({ role, content: text });
  }

  let content = message || "";
  for (const attachment of attachments) {
    const type = String(attachment?.type ?? "").toLowerCase();
    if (type === "image" && attachment?.data) {
      content += `\n[Image attached: ${attachment?.name || "image"}]`;
      continue;
    }
    if (type === "file") {
      const name = String(attachment?.name ?? "file");
      const note = String(attachment?.note ?? "").trim();
      const text = String(attachment?.text ?? "").trim();
      if (text) {
        content += `\nFile "${name}" content:\n${text}`;
      } else if (note) {
        content += `\nFile "${name}": ${note}`;
      } else {
        content += `\nFile "${name}" attached.`;
      }
    }
  }

  messages.push({ role: "user", content: content.trim() });
  return messages;
}

async function ollamaChat({
  message,
  history,
  attachments,
  stream,
  onDelta,
}) {
  const messages = buildOllamaMessages({ message, history, attachments });
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: !!stream,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Ollama request failed");
  }

  if (!stream) {
    const data = await response.json();
    return data?.message?.content?.trim() || "";
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed);
        const delta = json?.message?.content || "";
        if (!delta) continue;
        full += delta;
        onDelta?.(delta);
      } catch (_) {}
    }
  }
  return full.trim();
}

function buildCompatMessages({ message, history, attachments }) {
  const messages = [];
  for (const item of history) {
    const role = item?.role === "assistant" ? "assistant" : "user";
    const text = String(item?.text ?? "").trim();
    if (!text) continue;
    messages.push({ role, content: text });
  }

  let content = message || "";
  for (const attachment of attachments) {
    const type = String(attachment?.type ?? "").toLowerCase();
    if (type === "image" && attachment?.data) {
      content += `\n[Image attached: ${attachment?.name || "image"}]`;
      continue;
    }
    if (type === "file") {
      const name = String(attachment?.name ?? "file");
      const note = String(attachment?.note ?? "").trim();
      const text = String(attachment?.text ?? "").trim();
      if (text) {
        content += `\nFile "${name}" content:\n${text}`;
      } else if (note) {
        content += `\nFile "${name}": ${note}`;
      } else {
        content += `\nFile "${name}" attached.`;
      }
    }
  }

  messages.push({ role: "user", content: content.trim() });
  return messages;
}

async function openaiCompatChat({
  message,
  history,
  attachments,
  stream,
  onDelta,
}) {
  const messages = buildCompatMessages({ message, history, attachments });
  const response = await fetch(LLM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: 0.7,
      stream: !!stream,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "LM Studio request failed");
  }

  if (!stream) {
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || "";
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content || "";
        if (!delta) continue;
        full += delta;
        onDelta?.(delta);
      } catch (_) {}
    }
  }
  return full.trim();
}

app.listen(PORT, () => {
  console.log(`Gemini proxy running on http://localhost:${PORT}`);
});
