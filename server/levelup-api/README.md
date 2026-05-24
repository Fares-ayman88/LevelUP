# LevelUp API

Backend محلي مستقل بدل Firebase و PocketBase. يستخدم Python فقط و SQLite، لذلك يشتغل بدون تنزيل npm أو pip packages.

## التشغيل

```powershell
cd server\levelup-api
copy .env.example .env
.\run.ps1
```

الـ API الافتراضي:

```text
http://127.0.0.1:8080
```

وفي React أضف:

```env
VITE_LEVELUP_API_URL=http://127.0.0.1:8080
```

## أهم المسارات

Auth:

- `POST /auth/signup` body: `{ "email", "password", "name" }`
- `POST /auth/signin` body: `{ "email", "password" }`
- `POST /auth/google` body: `{ "credential", "clientId" }`
- `GET /auth/me` يحتاج `Authorization: Bearer <token>`
- `PATCH /users/me` لتحديث البروفايل

Courses:

- `GET /courses`
- `POST /courses`
- `PATCH /courses/:id`
- `DELETE /courses/:id`

Mentors:

- `GET /mentors`
- `POST /mentors`
- `PATCH /mentors/:id`
- `DELETE /mentors/:id`

Transactions:

- `GET /transactions`
- `GET /transactions?role=admin`
- `GET /transactions?role=instructor&mentorId=...`
- `POST /transactions`
- `PATCH /transactions/:id/status` body: `{ "status": "paid|waiting|rejected" }`

Instructor requests:

- `GET /instructor-requests?status=pending`
- `POST /instructor-requests`
- `PATCH /instructor-requests/:id/status` body: `{ "status": "approved|rejected|revoked" }`

Notifications:

- `GET /notifications`
- `POST /notifications`
- `PATCH /notifications/:id/read`
- `DELETE /notifications/:id`

Chat:

- `GET /chats?participantId=...&role=student|instructor`
- `POST /chats/ensure`
- `GET /chats/:conversationKey/messages`
- `POST /chats/:conversationKey/messages`
- `PATCH /chats/:conversationKey/read`

Files:

- `POST /uploads/base64` body: `{ "filename", "contentType", "data" }`
- `GET /uploads/<filename>`

## ملاحظات مهمة

- الملف `src/services/levelupApi.js` جاهز للاستخدام من React.
- الـ realtime الموجود في PocketBase/Firebase تم استبداله حاليًا بطلبات HTTP عادية. ممكن نضيف SSE/WebSocket بعد ما ننقل الصفحات الأساسية.
- غيّر `LEVELUP_JWT_SECRET` قبل أي نشر حقيقي.
