# Deployment Notes

This proxy can be deployed anywhere that runs Node 18+.

## Option A: Docker
1) Build and run locally:
```bash
docker build -t gemini-proxy .
docker run --rm -p 8787:8787 -e GEMINI_API_KEY=YOUR_KEY gemini-proxy
```

2) Push the image to your registry and deploy it on your hosting provider.
Make sure you set `GEMINI_API_KEY` as a secret env var.

## Option B: VM or PaaS (no Docker)
1) Copy the `server/gemini-proxy` folder to the server.
2) Create `.env` with:
```
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-1.5-flash
PORT=8787
```
3) Run:
```bash
npm install
npm start
```

## Important
- Use HTTPS in production.
- Keep any API keys only on the server, never inside the Flutter app.
