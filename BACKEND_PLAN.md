# LevelUp Backend Plan

> خطة الباك إند المتفق عليها لمشروع LevelUp، مكتوبة بصيغة مناسبة للفتح داخل Obsidian.

## الهدف

بناء باك إند كامل مستقل بدل الاعتماد على Firebase أو PocketBase، يدعم منصة تعليمية كبيرة قابلة للتوسع.

الباك إند الأساسي مبني على:

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT
- bcrypt
- Cloudinary للفيديوهات والصور

الواجهة موجودة على Vercel، والباك إند يتم نشره كخدمة منفصلة عند توفر منصة مناسبة مثل Render أو Koyeb أو VPS.

## الحالة الحالية

تم بناء كود الباك إند داخل:

```txt
web-react/server/auth-api
```

وتم رفعه على GitHub في commit:

```txt
c66dc8e Add production Node auth backend
58cb9d3 Add Render deployment blueprint
```

تم تجهيز:

- Auth system
- Course management
- Video upload and streaming
- Quiz and exam system
- Security hardening
- Docker deployment files
- Render blueprint
- PM2 config
- Nginx config
- GitHub Actions CI/CD
- Deployment docs

## المعمارية العامة

```txt
React Frontend on Vercel
  |
  | HTTPS API Calls
  v
Node.js Express Backend
  |
  | Mongoose
  v
MongoDB Atlas

Backend also connects to:
  - Cloudinary for video/image storage
  - SMTP provider for emails
  - Future Redis for cache/queues/rate limits
```

## Folder Structure

```txt
server/auth-api
  src
    app.js
    server.js

    config
      env.js
      database.js
      cloudinary.js

    constants
      roles.js

    controllers
      authController.js
      courseController.js
      quizController.js
      videoController.js

    errors
      AppError.js

    middlewares
      authenticate.js
      authorize.js
      csrfProtection.js
      errorHandler.js
      optionalAuthenticate.js
      rateLimiters.js
      requestId.js
      security.js
      securityLogger.js
      uploadCleanup.js
      uploadVideo.js
      validate.js

    models
      User.js
      Course.js
      CourseCategory.js
      Enrollment.js
      CourseProgress.js
      VideoAsset.js
      VideoProgress.js
      Quiz.js
      QuizAttempt.js

    repositories
      userRepository.js
      courseRepository.js
      videoRepository.js
      quizRepository.js

    routes
      v1
        index.js
        authRoutes.js
        courseRoutes.js
        videoRoutes.js
        quizRoutes.js

    services
      authService.js
      courseService.js
      videoService.js
      quizService.js
      tokenService.js
      emailService.js

    utils
      asyncHandler.js
      cookies.js
      crypto.js
      fileCleanup.js
      logger.js
      pagination.js
      retry.js
      sanitize.js
      shuffle.js
      slugify.js

    validators
      authValidators.js
      courseValidators.js
      videoValidators.js
      quizValidators.js
```

## Core Modules

## 1. Authentication Module

Features:

- Register
- Login
- Logout
- Refresh token
- Email verification
- Forgot password
- Reset password
- Role-based authorization
- Secure cookies
- bcrypt password hashing

Roles:

```txt
student
instructor
admin
```

Important endpoints:

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
POST /api/v1/auth/verify-email
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me
GET  /api/v1/auth/csrf-token
```

Security notes:

- Access token short-lived.
- Refresh token stored hashed in MongoDB.
- Refresh token rotation on every refresh.
- Password reset clears active refresh tokens.
- Sensitive fields never returned in API response.

## 2. Course Management Module

Features:

- Create course
- Update course
- Soft delete course
- Publish / unpublish
- Categories
- Thumbnails
- Instructor ownership
- Student enrollment
- Course progress tracking
- Search and filtering
- Pagination

Important endpoints:

```txt
GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/:courseIdOrSlug
PATCH  /api/v1/courses/:courseId
DELETE /api/v1/courses/:courseId

POST   /api/v1/courses/:courseId/publish
POST   /api/v1/courses/:courseId/unpublish

GET    /api/v1/courses/categories
POST   /api/v1/courses/categories

POST   /api/v1/courses/:courseId/enroll
GET    /api/v1/courses/:courseId/progress
PATCH  /api/v1/courses/:courseId/progress

GET    /api/v1/enrollments
```

Rules:

- Instructor can manage only owned courses.
- Admin can manage all courses.
- Students can enroll only in published courses.
- Draft courses are hidden from public students.

## 3. Video Upload and Streaming Module

Features:

- Video upload
- Cloudinary integration
- Secure signed URLs
- Thumbnail generation
- Video progress tracking
- File validation
- Upload size limits
- Retry mechanism
- Temp file cleanup

Important endpoints:

```txt
GET   /api/v1/courses/:courseId/videos
POST  /api/v1/courses/:courseId/videos
GET   /api/v1/videos/:videoId/stream-url
POST  /api/v1/videos/:videoId/retry-upload
GET   /api/v1/videos/:videoId/progress
PATCH /api/v1/videos/:videoId/progress
```

Important limitation:

Vercel Serverless is not ideal for large video uploads. Production video uploads are better through:

- Render
- VPS
- Docker server
- Direct-to-Cloudinary upload flow

## 4. Quiz and Exam Module

Features:

- Multiple question types
- Timer support
- Auto grading
- Randomized questions
- Randomized options
- Attempt limits
- Result calculation
- Student scores
- Leaderboard

Question types:

```txt
single_choice
multiple_choice
true_false
short_answer
```

Important endpoints:

```txt
GET    /api/v1/courses/:courseId/quizzes
POST   /api/v1/courses/:courseId/quizzes

GET    /api/v1/quizzes/:quizId
PATCH  /api/v1/quizzes/:quizId
DELETE /api/v1/quizzes/:quizId

POST   /api/v1/quizzes/:quizId/publish
POST   /api/v1/quizzes/:quizId/unpublish
POST   /api/v1/quizzes/:quizId/attempts
GET    /api/v1/quizzes/:quizId/leaderboard

GET    /api/v1/quiz-attempts
GET    /api/v1/quiz-attempts/:attemptId
POST   /api/v1/quiz-attempts/:attemptId/submit
```

Security notes:

- Correct answers are never exposed to students before submission.
- Attempts store a snapshot of randomized questions.
- Grading is done server-side only.

## Database Collections

Recommended MongoDB collections:

```txt
users
coursecategories
courses
enrollments
courseprogresses
videoassets
videoprogresses
quizzes
quizattempts
```

## Index Strategy

Users:

```txt
email unique
role
status
deletedAt
refreshTokens.tokenHash
passwordResetTokenHash
emailVerificationTokenHash
```

Courses:

```txt
title/subtitle/description/tags text index
status + deletedAt + createdAt
categoryId + status + deletedAt
instructorId + deletedAt
averageRating + enrollmentCount
```

Enrollments:

```txt
studentId + courseId unique
studentId + status + enrolledAt
courseId + status + enrolledAt
```

Video assets:

```txt
courseId + lessonId + deletedAt
instructorId + createdAt
status + createdAt
```

Quiz attempts:

```txt
quizId + studentId + attemptNumber
quizId + scorePercent + submittedAt
studentId + courseId + updatedAt
status + dueAt
```

## Security Architecture

Implemented protections:

- Helmet secure headers
- CORS allowlist
- CSRF protection
- Mongo injection sanitization
- Request ID
- Security logging
- Rate limiting
- Upload rate limiting
- JWT issuer/audience validation
- Secure cookies
- Global error handler
- Validation layer
- Role-based authorization
- Ownership checks

Production security checklist:

- Use HTTPS only.
- Set `NODE_ENV=production`.
- Set `CSRF_ENABLED=true`.
- Keep `CLIENT_URLS` strict.
- Never commit `.env`.
- Rotate JWT secrets if exposed.
- Use MongoDB Atlas IP allowlist if possible.
- Use Cloudinary signed URLs for private videos.

## Environment Variables

Required:

```env
NODE_ENV=production
PORT=8090
API_VERSION=v1

CLIENT_URL=https://your-frontend.vercel.app
CLIENT_URLS=https://your-frontend.vercel.app

MONGODB_URI=mongodb+srv://...

JWT_ACCESS_SECRET=long_random_secret
JWT_REFRESH_SECRET=another_long_random_secret

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Optional:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
COOKIE_DOMAIN=
```

## Deployment Plan

Preferred production deployment:

```txt
Frontend:
  Vercel

Backend:
  Render / Koyeb / Railway / VPS / Docker server

Database:
  MongoDB Atlas

Media:
  Cloudinary
```

Current issue:

Render and Koyeb may require a card even for free tiers.

Possible solutions:

1. Use a card that supports international online verification.
2. Use a VPS.
3. Temporarily adapt backend to Vercel Serverless for non-video features.
4. Use another hosting provider that accepts free deployment without card.

## Docker Deployment Files

Created files:

```txt
server/auth-api/Dockerfile
server/auth-api/docker-compose.prod.yml
server/auth-api/deploy/nginx/levelup-api.conf
server/auth-api/deploy/nginx/levelup-api.ssl.conf.example
```

## PM2 Deployment Files

Created files:

```txt
server/auth-api/deploy/pm2/ecosystem.config.cjs
server/auth-api/deploy/scripts/deploy-pm2.sh
```

## CI/CD

GitHub Actions workflow:

```txt
.github/workflows/auth-api-ci.yml
```

It runs:

- npm install
- backend syntax check
- frontend build check
- Docker build check
- optional Docker image publish
- optional VPS deploy

## Monitoring Plan

Minimum production monitoring:

- `/api/v1/health`
- `/api/v1/ready`
- MongoDB Atlas metrics
- API 5xx errors
- Auth failures
- Upload failures
- Memory and CPU usage
- Cloudinary errors

Health endpoints:

```txt
GET /api/v1/health
GET /api/v1/ready
```

## Backup Strategy

Primary:

- MongoDB Atlas automatic backups
- Daily snapshots
- Point-in-time recovery if available

Manual backup script:

```txt
server/auth-api/deploy/scripts/backup-mongodb-atlas.sh
```

Backup rules:

- Do not store backups only on the VPS.
- Store encrypted backups in S3, Backblaze, or Google Cloud Storage.
- Test restore monthly.

## Future Optimization Plan

Add Redis later for:

- Caching
- Rate limiting across multiple servers
- Queue system
- Locks
- Leaderboard cache

Recommended queue system:

```txt
BullMQ + Redis
```

Future queues:

```txt
emailQueue
videoQueue
notificationQueue
aiRecommendationQueue
analyticsQueue
```

## Frontend Integration Plan

After backend is deployed, Vercel must receive:

```env
VITE_LEVELUP_API_URL=https://your-backend-domain.com/api/v1
```

Then redeploy Vercel.

Frontend services should be updated to call:

```txt
/auth/*
/courses/*
/enrollments/*
/videos/*
/quizzes/*
/quiz-attempts/*
```

## Immediate Next Steps

1. Finish backend hosting decision.
2. If card works, deploy on Render or Koyeb.
3. If no card, decide between:
   - VPS
   - Vercel Serverless adapter
   - another provider
4. Add production env variables.
5. Test:

```txt
/api/v1/health
/api/v1/ready
```

6. Add `VITE_LEVELUP_API_URL` to Vercel.
7. Redeploy frontend.
8. Test login/register/course APIs.
9. Rotate MongoDB password because it appeared in a screenshot.

## Important Security Reminder

MongoDB connection password appeared in a screenshot during setup.

Action required:

```txt
MongoDB Atlas
  -> Database Access
  -> Edit database user
  -> Change password
  -> Update MONGODB_URI wherever deployed
```

## Final Notes

The backend code is built and pushed to GitHub.

The remaining work is deployment and connecting the Vercel frontend to the deployed backend URL.

