# LevelUp Node.js Backend

ده Backend Node.js كامل لنفس API المستخدم على Vercel.

## بيشتغل فين؟

- محليا كسيرفر Node على `http://127.0.0.1:8080`
- على Vercel كـ Serverless Function تحت `/api/levelup`

## قاعدة البيانات

يحتاج Postgres/Neon connection string:

```env
DATABASE_URL=postgresql://...
```

## تشغيل محلي

من فولدر `web-react`:

```powershell
copy server\levelup-node\.env.example server\levelup-node\.env
npm run api
```

بعدها افتح:

```text
http://127.0.0.1:8080/health
```

## Vercel

على Vercel لا تشغل `server/levelup-node/server.js`.
Vercel يستخدم:

```text
api/levelup/[...path].js
```

والفرونت في production يكلم:

```text
/api/levelup
```

## أهم Endpoints

```text
GET  /health
POST /auth/signup
POST /auth/signin
POST /auth/google
GET  /auth/me
GET  /courses
POST /courses
GET  /mentors
POST /mentors
GET  /transactions
GET  /notifications
GET  /chats
POST /chats/ensure
```
