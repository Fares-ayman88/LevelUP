# Vercel Production Database

النسخة المنشورة على Vercel لا تستخدم SQLite المحلي. استخدم Postgres serverless مثل Neon.

## الخطوات

1. افتح مشروعك على Vercel.
2. من تبويب `Storage` أو `Integrations` أضف Neon Postgres.
3. اربط قاعدة البيانات بالمشروع.
4. تأكد أن Vercel أضاف متغير:

```env
DATABASE_URL=postgres://...
```

5. أضف هذه المتغيرات في Vercel -> Project Settings -> Environment Variables:

```env
LEVELUP_JWT_SECRET=ضع-سر-قوي-طويل
LEVELUP_GOOGLE_CLIENT_ID=617436995759-t2tp11j582kfupng4s4qcvbivoe0jj1p.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=617436995759-t2tp11j582kfupng4s4qcvbivoe0jj1p.apps.googleusercontent.com
```

6. لا تضف `VITE_LEVELUP_API_URL` على Vercel إلا لو الباك اند في دومين خارجي.
   الافتراضي في production هو:

```text
/api/levelup
```

7. في Google Cloud OAuth Client أضف دومين Vercel:

```text
https://your-project.vercel.app
```

ولو عندك دومين مخصص:

```text
https://your-domain.com
```

## ماذا يحدث تلقائيا؟

أول request إلى:

```text
/api/levelup/health
```

سيقوم بإنشاء الجداول تلقائيا وزراعة:

- Admin users
- Courses seed
- Mentors seed

## Endpoints

نفس endpoints المحلية لكن على Vercel:

```text
/api/levelup/auth/signup
/api/levelup/auth/signin
/api/levelup/auth/google
/api/levelup/courses
/api/levelup/mentors
/api/levelup/transactions
/api/levelup/notifications
/api/levelup/chats
```
