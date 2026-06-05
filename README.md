# LevelUp Web

LevelUp is an e-learning platform with a React web application, Flutter app assets/structure, PocketBase-backed course and chat data, Firebase authentication, and AI proxy support for assistant-style interactions.

## Quick Start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when you need local overrides.

## Main Stack

- React 18 and Vite for the web application.
- React Router for page routing.
- Firebase for authentication and related cloud services.
- PocketBase for courses, mentors, chat, and support collections.
- MUI, HeroUI, and Tailwind CSS for UI implementation.
- Vercel API routes or the local Node proxy for AI chat.

## Important Paths

| Path | Purpose |
| --- | --- |
| `src/routes.jsx` | Web route map and role-restricted pages |
| `src/pages` | Main web screens |
| `src/services` | Firebase, PocketBase, chat, transactions, notifications, and AI helpers |
| `server/pocketbase` | Local PocketBase server, scripts, data, and collection notes |
| `server/gemini-proxy` | Local AI proxy service |
| `ops/pocketbase-production` | Production PocketBase setup templates |
| `Doc/LevelUp_Project_Documentation.md` | Professional project documentation draft |

## PocketBase

Run the local server:

```powershell
cd server/pocketbase
.\run-pocketbase.ps1
```

Admin dashboard:

```text
http://127.0.0.1:8090/_/
```

For deployed sites, `VITE_PB_ENDPOINT` must point to a public HTTPS PocketBase URL. Do not use `localhost`, `127.0.0.1`, or a private LAN IP in production.

## AI Proxy

For local AI proxy development:

```bash
cd server/gemini-proxy
npm install
npm start
```

The proxy runs on:

```text
http://localhost:8787
```

## Build

```bash
npm run build
```

The Vercel configuration builds the Vite app into `dist` and rewrites SPA routes to `index.html`.

## Documentation

The main professional documentation draft is available at:

```text
Doc/LevelUp_Project_Documentation.md
```
