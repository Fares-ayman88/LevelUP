# AI Proxy (Ollama / OpenAI)

Simple Node proxy to keep API keys off the mobile app.

## Setup
1) Copy `.env.example` to `.env`.
2) For local free usage with Phi:
   - Set `AI_PROVIDER=ollama`
   - Keep `OLLAMA_MODEL=phi3:instruct`
3) For OpenAI:
   - Set `AI_PROVIDER=openai`
   - Set `OPENAI_API_KEY`
2) Install deps and run:

```bash
cd server/gemini-proxy
npm install
npm start
```

Proxy runs on `http://localhost:8787`.

## Endpoints
`POST /chat` (non-stream)

`POST /chat/stream` (SSE stream)

Body:
```json
{
  "message": "Hello",
  "history": [
    { "role": "user", "text": "Hi" },
    { "role": "assistant", "text": "Hello!" }
  ],
  "attachments": [
    {
      "type": "image",
      "name": "photo.jpg",
      "mime": "image/jpeg",
      "data": "base64..."
    },
    {
      "type": "file",
      "name": "notes.txt",
      "mime": "text/plain",
      "text": "file content..."
    }
  ]
}
```

Response:
```json
{ "reply": "..." }
```

Stream response:
```
data: {"delta":"Hello"}

data: {"delta":" there!"}

data: [DONE]
```

## Docker (quick deploy)
```bash
docker build -t gemini-proxy .
docker run --rm -p 8787:8787 -e GEMINI_API_KEY=YOUR_KEY gemini-proxy
```
