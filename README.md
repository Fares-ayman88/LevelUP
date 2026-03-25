# LevelUp Web (React)

This is the React web shell generated from the Flutter routes.

## Setup

1. Copy `.env.example` to `.env` and fill the Firebase, PocketBase, and Gemini proxy values.
2. Install dependencies and run the dev server.

```bash
npm install
npm run dev
```

## Notes

- Routes are mapped in `src/routes.jsx`.
- Firebase auth and profile wiring lives in `src/state/auth.jsx`.
- PocketBase endpoint detection lives in `src/services/pocketbase.js`.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Keep the root directory as the repository root.
3. Add the `VITE_*` environment variables from `.env.example`.
4. Redeploy.

The included `vercel.json` tells Vercel to build the Vite app into `dist` and rewrite SPA routes to `index.html`.
