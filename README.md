# LevelUp Web (React)

This is the React web shell generated from the Flutter routes.

## Setup

1. Copy `.env.example` to `.env` if you want to override any defaults.
2. Install dependencies and run the dev server.

```bash
npm install
npm run dev
```

## Notes

- Routes are mapped in `src/routes.jsx`.
- Firebase auth and profile wiring lives in `src/state/auth.jsx`.
- PocketBase endpoint detection lives in `src/services/pocketbase.js`.
- The deployed site can use the built-in Vercel API route at `/api/chat` for AI replies.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Keep the root directory as the repository root.
3. Add `OPENAI_API_KEY` if you want AI chat enabled in production.
4. Add `VITE_PB_ENDPOINT` only if you have a public PocketBase server.
5. Redeploy.

Firebase client config has a production fallback baked into the app, so the main auth flow can run without manual Vercel client env setup.

The included `vercel.json` tells Vercel to build the Vite app into `dist` and rewrite SPA routes to `index.html`.
