# LevelUp Auth API

Production-ready authentication module built with Node.js, Express, MongoDB, JWT, and bcrypt.

Deployment docs:

- `DEPLOYMENT.md`
- `RUNBOOK.md`

## Folder Structure

```txt
server/auth-api
  src
    config/        environment and database setup
    constants/     roles and shared constants
    controllers/   HTTP request/response layer
    errors/        application error classes
    middlewares/   auth, authorization, security, validation, errors
    models/        Mongoose schemas
    repositories/  database access layer
    routes/v1/     versioned REST routes
    services/      business logic
    utils/         cookies, crypto, logger, sanitizers
    validators/    express-validator rules
```

## Routes

Base URL: `/api/v1`

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/auth/register` | Register a new student or instructor |
| GET | `/auth/csrf-token` | Create/read CSRF token for cookie-auth mutations |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/logout` | Revoke current refresh token and clear cookies |
| POST | `/auth/refresh-token` | Rotate refresh token and issue a new access token |
| POST | `/auth/verify-email` | Verify email using token |
| POST | `/auth/resend-verification` | Resend verification token |
| POST | `/auth/forgot-password` | Request password reset token |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/auth/me` | Current authenticated user |
| GET | `/courses` | Public course listing with pagination/search/filtering |
| POST | `/courses` | Create course, instructor/admin only |
| GET | `/courses/:courseIdOrSlug` | Get public course or owned draft |
| PATCH | `/courses/:courseId` | Update owned course or admin course |
| DELETE | `/courses/:courseId` | Soft delete owned course or admin course |
| POST | `/courses/:courseId/publish` | Publish owned course or admin course |
| POST | `/courses/:courseId/unpublish` | Unpublish owned course or admin course |
| GET | `/courses/categories` | List active categories |
| POST | `/courses/categories` | Create category, admin only |
| POST | `/courses/:courseId/enroll` | Enroll current student |
| GET | `/courses/:courseId/progress` | Get current student progress |
| PATCH | `/courses/:courseId/progress` | Update current student lesson progress |
| GET | `/enrollments` | List current user enrollments or managed course enrollments |
| GET | `/courses/:courseId/videos` | List course videos for enrolled students or course owners |
| POST | `/courses/:courseId/videos` | Upload course video using multipart field `video` |
| GET | `/videos/:videoId/stream-url` | Create short-lived signed Cloudinary streaming URL |
| POST | `/videos/:videoId/retry-upload` | Retry failed video upload with a new file |
| GET | `/videos/:videoId/progress` | Get current student's video progress |
| PATCH | `/videos/:videoId/progress` | Update watched seconds/completion |
| GET | `/courses/:courseId/quizzes` | List course quizzes/exams |
| POST | `/courses/:courseId/quizzes` | Create quiz/exam for owned course |
| GET | `/quizzes/:quizId` | Get quiz metadata; answers hidden from students |
| PATCH | `/quizzes/:quizId` | Update owned quiz/exam |
| DELETE | `/quizzes/:quizId` | Soft delete owned quiz/exam |
| POST | `/quizzes/:quizId/publish` | Publish quiz/exam |
| POST | `/quizzes/:quizId/unpublish` | Unpublish quiz/exam |
| POST | `/quizzes/:quizId/attempts` | Start a student attempt |
| GET | `/quizzes/:quizId/leaderboard` | Ranked quiz results |
| GET | `/quiz-attempts` | List student attempts or managed attempts |
| GET | `/quiz-attempts/:attemptId` | Get attempt details |
| POST | `/quiz-attempts/:attemptId/submit` | Submit answers and auto-grade |

## Run Locally

1. Copy `.env.example` to `.env`.
2. Set strong JWT secrets and `MONGODB_URI`.
3. Run from `web-react`:

```bash
npm run auth:api
```

## Security Notes

- Passwords are hashed with bcrypt.
- Refresh tokens are stored hashed in MongoDB and rotated on every refresh.
- Access and refresh tokens are sent through `httpOnly` cookies.
- Bearer access tokens are also supported for mobile/API clients.
- Auth endpoints are rate-limited.
- `helmet`, `cors`, request size limits, and global error handling are enabled.
- CORS uses an explicit allowlist from `CLIENT_URLS`.
- CSRF protection can be enabled with `CSRF_ENABLED=true`; it is enabled by default in production.
- MongoDB operator injection is sanitized before routes run.
- Every response includes `X-Request-Id` for log correlation.
- Forgot-password and verification responses avoid email enumeration.
- Course reads use indexed filters, text search, pagination, and lean queries.
- Course mutation checks instructor ownership; admins can manage all courses.
- Enrollments and progress are separated from courses to keep course reads fast at scale.
- Videos are uploaded to Cloudinary as authenticated assets and streamed through short-lived signed URLs.
- Large video uploads use disk-backed Multer storage plus Cloudinary chunked upload and retry logic.
- Temporary upload files are removed after success or failure.
- Quizzes store correct answers server-side and never expose them to students before submission.
- Quiz attempts snapshot randomized questions/options so each attempt remains stable after creation.
- Leaderboards use indexed attempt queries sorted by score and submission time.

## Video Upload Example

```bash
curl -X POST http://localhost:8090/api/v1/courses/COURSE_ID/videos \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "title=Intro lesson" \
  -F "video=@intro.mp4"
```

Set Cloudinary variables before using video endpoints:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

In production, use HTTPS, set `NODE_ENV=production`, set `CLIENT_URL` to the exact frontend origin, and use long random values for both JWT secrets.
