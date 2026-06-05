# LevelUp Project Documentation

## Document Control

| Item | Details |
| --- | --- |
| Project name | LevelUp |
| Project type | E-learning web and mobile application |
| Academic year | 2025-2026 |
| Department | Computer Science |
| Main platforms | React web application, Flutter mobile/desktop application |
| Backend services | PocketBase, Firebase, Node/Vercel API services |
| Document status | Professional working draft |

## Executive Summary

LevelUp is an e-learning platform designed to help learners discover practical courses, communicate with mentors, manage payments, and track their learning progress through a modern web and mobile experience. The platform focuses on practical education, user-friendly course discovery, mentor interaction, secure authentication, and administrative oversight.

The system includes a React-based web application, a Flutter application, PocketBase collections for course and messaging data, Firebase services for authentication and cloud features, and a lightweight API/proxy layer for AI-assisted chat. Together, these components provide a flexible foundation for a scalable educational product.

## Project Objectives

LevelUp aims to:

- Provide an intuitive platform for browsing and enrolling in practical courses.
- Support different user roles, including students, instructors, and administrators.
- Enable mentor and support communication through chat-based workflows.
- Provide payment, transaction, receipt, and certificate-related user flows.
- Offer course management tools for instructors and administrative moderation tools for admins.
- Support AI-assisted user interaction through a server-side proxy that protects API keys.
- Keep the architecture modular enough for future expansion and production deployment.

## Problem Statement

Many students and early-career learners need practical, skill-focused learning experiences that are easier to access than traditional classroom-only material. Existing learning platforms may be too general, disconnected from local academic needs, or difficult for instructors to manage without technical support.

LevelUp addresses this gap by offering a focused learning platform where users can find courses, interact with mentors, manage their learning journey, and receive support through a consistent web and mobile interface.

## Proposed Solution

LevelUp provides a centralized digital learning environment with:

- Course browsing, filtering, saved courses, and course details.
- Authentication flows including sign in, sign up, email verification, PIN setup, and biometric setup.
- Mentor profiles, mentor chats, support chats, and call-related screens.
- Payment methods, manual transfer requests, transaction history, and receipts.
- Completed and ongoing course tracking, lesson playback, and certificate pages.
- Admin pages for course management, transaction review, instructor requests, and featured sorting.
- Instructor pages for registration, documents, course management, and transactions.
- Notification and notification settings workflows.

## Scope

### In Scope

- Web application built with React, Vite, React Router, Firebase, PocketBase, MUI, HeroUI, and Tailwind.
- Flutter application structure for mobile/desktop targets.
- Course discovery, course details, lesson player, and learner progress screens.
- Authentication and account management flows.
- Student, instructor, and admin role-based routes.
- Mentor chat and support chat services.
- Payment and transaction-related pages.
- Local PocketBase setup and production PocketBase deployment templates.
- Vercel deployment support for the web application.
- AI chat proxy integration through API routes or a local Node proxy.

### Out of Scope for the Current Version

- Fully automated large-scale analytics dashboards.
- Advanced adaptive learning recommendations.
- Complete localization workflow for multiple languages.
- Offline-first course content support.
- Enterprise-grade access control hardening for all production collections.

## System Architecture

LevelUp follows a modular frontend-plus-services architecture.

### Frontend Layer

The web frontend is implemented with React and Vite. Routes are defined in `src/routes.jsx`, with separate pages for authentication, course browsing, chat, payment, profile, admin, and instructor workflows.

The Flutter application is also present in the repository and defines assets, Firebase integrations, PocketBase usage, local authentication, PDF/certificate generation, and video playback dependencies.

### Service Layer

The service layer is organized in `src/services` and handles integrations such as:

- Firebase configuration and authentication support.
- PocketBase connection and data access.
- Course and mentor data helpers.
- Mentor chat and support chat workflows.
- Notifications.
- Transactions.
- Profile image handling.
- AI proxy communication.
- Security and account-related helpers.

### Backend and Data Layer

PocketBase is used as a lightweight backend and database for collections such as:

- `courses`
- `mentors`
- `mentor_chats`
- `mentor_chat_messages`
- `support_chats`
- `support_chat_messages`

Firebase is used for authentication and related cloud services. The project also includes a Node-based AI proxy and a Vercel API route to keep AI provider keys away from the browser and client apps.

### Deployment Layer

The web application can be deployed to Vercel. `vercel.json` builds the Vite application into `dist` and rewrites SPA routes to `index.html`.

PocketBase can be run locally during development or hosted through a public HTTPS endpoint for production. Production setup templates are available under `ops/pocketbase-production`.

## Main User Roles

| Role | Responsibilities |
| --- | --- |
| Student | Browse courses, manage profile, enroll or purchase, view lessons, chat with mentors/support, track progress, receive certificates. |
| Instructor | Register as instructor, submit documents, manage courses, communicate with learners, review transactions where applicable. |
| Admin | Manage courses, transactions, instructor requests, featured course sorting, and platform oversight. |

## Core Modules

### Authentication and Account Module

Includes sign in, sign up, email verification, forgot password, new password creation, PIN authentication, biometric setup, profile completion, and security settings.

Key routes:

- `/sign-in`
- `/sign-up`
- `/verify-email`
- `/fill-profile`
- `/create-pin`
- `/pin-auth`
- `/security`

### Course Discovery Module

Allows users to browse categories, popular courses, search results, filters, course details, saved courses, ongoing courses, completed courses, lesson playback, reviews, and certificates.

Key routes:

- `/home`
- `/all-category`
- `/popular-courses`
- `/search-results`
- `/filter`
- `/course-detail`
- `/saved-courses`
- `/ongoing-course`
- `/completed-course`
- `/lesson-player`
- `/certificate`

### Mentor and Communication Module

Supports mentor profiles, mentor chats, support chats, and call-related workflows. PocketBase collections store chat metadata and chat messages.

Key routes:

- `/top-mentors`
- `/mentor-profile`
- `/mentor-chats`
- `/mentor-chat-thread`
- `/support-chats`
- `/support-chat-thread`
- `/call`

### Payment and Transactions Module

Supports payment method selection, payment options, manual transfer requests, transaction views, receipts, and cart workflows.

Key routes:

- `/cart`
- `/payment-methods`
- `/payment-option`
- `/manual-transfer`
- `/payment-request`
- `/transactions`
- `/receipt`

### Instructor Module

Supports instructor registration, document submission, mentor course management, and instructor transaction workflows.

Key routes:

- `/instructor-registration`
- `/instructor-documents`
- `/mentor-courses`
- `/mentor-transactions`

### Admin Module

Supports role-restricted admin workflows for managing courses, transactions, instructor requests, and featured sorting.

Key routes:

- `/admin-courses`
- `/admin-transactions`
- `/instructor-requests`
- `/featured-sort`

### Notification Module

Provides notification display and notification settings.

Key routes:

- `/notifications`
- `/notification-settings`

## Chapter 4: System Implementation and User Interface Screenshots

This chapter presents selected screenshots from the implemented LevelUp application. The screenshots demonstrate the real interface used by learners and administrators, including course discovery, filtering, course details, and certificate generation.

### Home Dashboard

The home dashboard gives users access to course search, notifications, saved courses, course statistics, and popular course recommendations.

Screenshot file:

```text
Doc/screenshots/home.png
```

### Popular Courses

The popular courses screen displays a categorized list of available courses with course title, category, price, rating, and student count.

Screenshot file:

```text
Doc/screenshots/popular-courses.png
```

### Course Filters

The filter screen allows learners to refine course results by subcategory, level, price, features, rating, and video duration.

Screenshot file:

```text
Doc/screenshots/filter-page.png
```

### Course Details

The course detail screen provides the selected course overview, mentor information, rating, duration, price, and enrollment action.

Screenshot file:

```text
Doc/screenshots/course-detail.png
```

### Certificate

The certificate screen shows the course completion certificate and download action.

Screenshot file:

```text
Doc/screenshots/certificate.png
```

## Technology Stack

| Area | Technologies |
| --- | --- |
| Web frontend | React, Vite, React Router DOM |
| UI libraries | MUI, HeroUI, Tailwind CSS |
| Mobile/desktop app | Flutter, Dart |
| Authentication | Firebase Auth |
| Data/backend | PocketBase, Firebase/Firestore where applicable |
| Storage/media | Firebase Storage, PocketBase file fields |
| AI support | Gemini/OpenAI-compatible proxy, Vercel API route, local Node proxy |
| Deployment | Vercel, PocketBase hosting templates |
| Development tooling | npm, Flutter SDK, PowerShell scripts |

## Local Development Setup

### Web Application

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy .env.example .env
```

3. Run the development server:

```bash
npm run dev
```

### PocketBase

Run PocketBase locally:

```powershell
cd server/pocketbase
.\run-pocketbase.ps1
```

Admin dashboard:

```text
http://127.0.0.1:8090/_/
```

For local web development, configure `VITE_PB_ENDPOINT` in `.env` if needed.

### AI Proxy

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

## Environment Variables

Important variables include:

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_PB_ENDPOINT` | Public or local PocketBase endpoint |
| `VITE_GEMINI_PROXY_URL` | Browser-facing AI API path |
| `VITE_LOCAL_AI_PROXY_URL` | Local proxy URL during Vite development |
| `GEMINI_API_KEY` | Gemini provider key for server-side use |
| `OPENAI_API_KEY` | OpenAI provider key for server-side use |

Production deployments must not point `VITE_PB_ENDPOINT` to `localhost`, `127.0.0.1`, or a private LAN IP.

## Deployment

### Vercel Web Deployment

1. Import the repository into Vercel.
2. Keep the root directory as the repository root.
3. Add production environment variables.
4. Set `VITE_PB_ENDPOINT` to a public HTTPS PocketBase endpoint.
5. Add `GEMINI_API_KEY` or the selected AI provider key if AI chat is enabled.
6. Deploy the Vite application.

### PocketBase Production Notes

PocketBase should be hosted on a stable server with:

- Public HTTPS domain.
- Regular backups.
- Hardened API rules.
- Secure admin credentials.
- Controlled file upload limits.
- Monitoring for storage and uptime.

Production templates are available in:

```text
ops/pocketbase-production
```

## Security Considerations

The project should prioritize:

- Keeping API keys on the server side only.
- Using public HTTPS endpoints in production.
- Hardening PocketBase collection rules before production launch.
- Validating file uploads and limiting file size/type.
- Enforcing role-based access for admin and instructor routes.
- Protecting user payment and transaction records.
- Regularly reviewing Firebase and PocketBase access policies.

## Testing Strategy

Recommended testing areas:

- Authentication flows: sign up, sign in, email verification, forgot password, PIN, and biometric setup.
- Course flows: browse, filter, details, saved courses, lesson player, completed courses, and certificate view.
- Communication flows: mentor chat, support chat, notifications, unread counters.
- Payment flows: cart, payment method, manual transfer, receipt, transaction history.
- Admin flows: course management, transaction management, instructor request review.
- Instructor flows: registration, document submission, course management, transaction views.
- Deployment checks: Vercel build, SPA route rewrites, public PocketBase connectivity, AI proxy availability.

## Current Risks and Improvement Areas

- The existing Word documentation uses mixed project names and should be standardized to LevelUp.
- Some technical descriptions in the original document mention technologies that are not the main stack in this repository.
- The root `README.md` contains unresolved merge conflict markers and should be cleaned.
- PocketBase API rules must be tightened before production.
- Production PocketBase should use a stable HTTPS endpoint rather than a temporary tunnel.
- The documentation should eventually include updated screenshots from the actual application screens.

## Future Work

Potential future improvements include:

- Personalized course recommendations.
- Analytics dashboards for learners, instructors, and admins.
- Multi-language support.
- Offline course access for mobile users.
- More advanced instructor course authoring tools.
- Automated certificate issuance and verification.
- Better audit logs for administrative actions.
- Automated end-to-end tests for critical user journeys.

## Conclusion

LevelUp is a practical e-learning platform with a strong foundation across web, mobile, backend, chat, payments, and administration. By aligning the documentation with the actual codebase and improving consistency across project naming, architecture, and feature descriptions, the project can be presented in a more professional and technically accurate way for academic review, deployment planning, and future development.
