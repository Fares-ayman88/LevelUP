# Instructor Registration Flow - Complete Implementation

## Overview

A complete, production-ready instructor registration system for the LevelUp platform with full backend implementation, efficient database queries, comprehensive security measures, and optimized frontend components.

## Architecture

### Backend (Node.js/Express)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control
- **Security**: CSRF protection, input validation, rate limiting, email sanitization
- **Email**: Nodemailer integration for confirmation and status emails

### Frontend (React)
- **State Management**: Integrated with existing LevelUp auth state
- **Caching**: 30-second client-side cache for stats
- **Polling**: Configurable 10-second polling for real-time updates
- **Validation**: Client-side email, phone, and form validation

## Backend Implementation

### Database Schema

**InstructorRequest Model** (`server/auth-api/src/models/InstructorRequest.js`)

```javascript
{
  _id: ObjectId,
  userId: String (indexed, required),
  name: String (required, 2-100 chars),
  email: String (indexed, required, unique per 24h),
  phone: String (required, validated),
  category: String (required, indexed),
  coursesTaken: String (optional, max 2000),
  experienceYears: Number (0-100),
  notes: String (optional, max 2000),
  cvUrl: String (optional, Cloudinary URL),
  idUrl: String (optional, Cloudinary URL),
  status: String (enum: pending/approved/rejected/revoked, indexed),
  rejectionReason: String (optional),
  approvedAt: Date,
  rejectedAt: Date,
  deletedAt: Date (soft delete),
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes for Performance

```javascript
// Fast user lookups
{ userId: 1, deletedAt: 1 }
{ email: 1, deletedAt: 1 }

// Admin dashboard filtering
{ status: 1, deletedAt: 1, createdAt: -1 }
{ category: 1, status: 1 }

// Sorting and listing
{ createdAt: -1, deletedAt: 1 }
```

## API Endpoints

### 1. Submit Instructor Request (Public)

**Endpoint**: `POST /api/v1/instructor-requests`

**Authentication**: Optional (can be guest or authenticated user)

**Rate Limiting**: 5 requests per hour per email

**Request Body**:
```json
{
  "userId": "user_id_or_guest_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+20 100 123 4567",
  "category": "Web Development",
  "coursesTaken": "JavaScript, React (optional)",
  "experienceYears": 5,
  "notes": "Portfolio: https://example.com (optional)"
}
```

**Response** (201 Created):
```json
{
  "status": "success",
  "data": {
    "item": {
      "id": "507f1f77bcf86cd799439011",
      "userId": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "pending",
      "createdAt": "2024-06-05T07:37:46.041Z"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `409 Conflict`: Email already registered
- `429 Too Many Requests`: Rate limit exceeded or duplicate within 24h

### 2. List Requests (Admin Only)

**Endpoint**: `GET /api/v1/instructor-requests?status=pending&skip=0&limit=50`

**Authentication**: Required (Admin role)

**Query Parameters**:
- `status`: Filter by status (pending/approved/rejected/revoked)
- `category`: Filter by category
- `skip`: Pagination offset (default: 0)
- `limit`: Results per page (max: 100, default: 50)

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "items": [ ... ],
    "total": 150,
    "skip": 0,
    "limit": 50
  }
}
```

### 3. Get Single Request (Admin Only)

**Endpoint**: `GET /api/v1/instructor-requests/:id`

**Authentication**: Required (Admin role)

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "item": { ... }
  }
}
```

### 4. Update Request Status (Admin Only)

**Endpoint**: `PATCH /api/v1/instructor-requests/:id/status`

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "status": "approved",
  "rejectionReason": "Optional reason for rejection"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "item": { ... }
  }
}
```

**Status Transitions**:
- `pending` → `approved` (sets `approvedAt`)
- `pending` → `rejected` (sets `rejectedAt` and optional `rejectionReason`)
- `pending` → `revoked` (allows user to withdraw application)
- Any status → `revoked` (admin can revoke any request)

### 5. Get Statistics (Admin Only)

**Endpoint**: `GET /api/v1/instructor-requests/stats`

**Authentication**: Required (Admin role)

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "pending": 25,
    "approved": 150,
    "rejected": 10,
    "revoked": 5,
    "total": 190
  }
}
```

## Security Features

### Input Validation

- **Email**: RFC 5322 compliant email validation
- **Phone**: Regex validation for phone format (7-30 characters)
- **Names**: 2-100 characters, trimmed
- **Text Fields**: Max 2000 characters, trimmed
- **Numbers**: Integer validation with min/max ranges

### Rate Limiting

```javascript
// Instructor request submissions
- 5 requests per hour per email address
- Keyed by email to prevent duplicate submissions
- Returns 429 Too Many Requests with helpful message
```

### Duplicate Prevention

```javascript
// 24-hour submission window per email
- Check if email submitted in last 24 hours
- Return 429 with DUPLICATE_REQUEST code
- Allows retry after 24 hours
```

### Authentication & Authorization

```javascript
// Public endpoints
POST /instructor-requests - No auth required

// Admin-only endpoints
GET /instructor-requests - Admin role required
GET /instructor-requests/:id - Admin role required
PATCH /instructor-requests/:id/status - Admin role required
GET /instructor-requests/stats - Admin role required
```

### Data Protection

- Soft deletes (no data loss)
- Optimistic concurrency control
- Field-level sanitization
- CSRF protection on all mutations
- XSS protection via React

## Performance Optimizations

### Database Queries

1. **Lean Queries**: Use `.lean()` for list endpoints to reduce memory usage
2. **Projection**: Only select necessary fields
3. **Pagination**: Use skip/limit to handle large result sets
4. **Indexing**: Strategic indexes for common filters and sorts
5. **Aggregation**: Use MongoDB aggregation pipeline for stats

### Caching Strategy

**Frontend Cache** (30 seconds):
```javascript
- Stats are cached for 30 seconds
- Cache invalidated on status updates
- Reduces unnecessary API calls
```

**Database Optimization**:
```javascript
// Efficient stats query
const [pending, approved, rejected, revoked] = await Promise.all([
  countByStatus('pending'),
  countByStatus('approved'),
  countByStatus('rejected'),
  countByStatus('revoked'),
]);
```

### Query Examples

```javascript
// Fast user lookup with index
db.instructorrequests.findOne({ email: 'user@example.com', deletedAt: null })

// Admin filtering with index
db.instructorrequests.find({ status: 'pending', deletedAt: null })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(50)

// Category-based queries
db.instructorrequests.find({ category: 'Web Development', status: 'pending' })
  .count()
```

## Email Notifications

### Confirmation Email (on submission)

```
Subject: Instructor Application Received - LevelUp

Thank you for your instructor registration application, {name}!

Your application has been received. Here's what happens next:
1. Our team will review your application
2. We will send you a WhatsApp message for document verification
3. You will need to provide your CV and ID

Application Details:
- Category: {category}
- Experience: {experience} years
- Phone: {phone}

Next Steps: [Link to instructor documents page]
```

### Approval Email

```
Subject: Your Instructor Application Approved - LevelUp

Congratulations! Your instructor application has been approved.

You can now create and manage courses on LevelUp. Log in to your account to get started.

Welcome to the LevelUp instructor team!
```

### Rejection Email

```
Subject: Instructor Application Status Update - LevelUp

Thank you for your interest in becoming an instructor on LevelUp.

Unfortunately, your application could not be approved at this time.
Reason: {rejection_reason}

You can reapply after 30 days.
```

## Frontend Components

### InstructorRegistration.jsx

**Features**:
- Pre-filled name/email from user profile
- Real-time form validation
- Error messages for each field
- Rate limit feedback
- Duplicate submission prevention
- Loading state management
- Success navigation

**Validation Rules**:
- Name: 2-100 characters
- Email: RFC 5322 format
- Phone: 7-30 digits, regex validated
- Category: Required
- Experience: 0-100 years
- Text fields: Max 2000 characters

### InstructorDocuments.jsx

**Features**:
- Displays application summary
- WhatsApp integration for document submission
- Multi-contact support
- Application status display
- Conditional messaging based on submission status

### Polling System

```javascript
// Real-time updates with 10-second interval
subscribeInstructorRequestForUser(userId, (request) => {
  setRequest(request);
}, (error) => {
  console.error('Polling error:', error);
});

// Admin dashboard with status filtering
subscribePendingInstructorRequests((requests) => {
  setRequests(requests);
});
```

## Development Setup

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# Install dependencies
cd levelup
npm install

# Setup environment variables
cp server/auth-api/.env.example server/auth-api/.env

# Configure MongoDB connection
# Set MONGO_URI in .env
```

### Environment Variables

```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/levelup
JWT_SECRET=your-secret-key
BCRYPT_ROUNDS=10
FRONTEND_URL=http://localhost:5173
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Running the Backend

```bash
npm run auth:api
```

Server runs on `http://localhost:3000`

### Testing

```bash
# Run API tests
node server/auth-api/test-api.js
```

## Performance Benchmarks

**Expected Performance**:
- Submit request: < 200ms (with email)
- List requests (50 items): < 100ms
- Get stats: < 50ms (cached)
- Update status: < 150ms (with email)

**Scalability**:
- Supports 10,000+ pending requests
- Database indexes ensure O(1) lookups
- Pagination prevents large result sets
- Rate limiting prevents abuse

## Monitoring & Debugging

### Logs

```javascript
// Request ID tracking
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

// Security logging
[CSRF] Request attempt with invalid token
[RATE_LIMIT] Rate limit exceeded for user@example.com

// Performance logging
Request took 145ms - GET /instructor-requests
```

### Common Issues

**Rate Limit Errors**:
```
Error: Too many instructor requests. Please try again later.
Code: TOO_MANY_INSTRUCTOR_REQUESTS
Status: 429
```

**Duplicate Submission**:
```
Error: You have already submitted an application. Please wait 24 hours.
Code: DUPLICATE_REQUEST
Status: 429
```

**Validation Errors**:
```
Errors: {
  email: "Invalid email format",
  phone: "Phone number must have at least 7 digits"
}
```

## File Structure

```
server/auth-api/src/
├── models/
│   ├── User.js
│   ├── Course.js
│   ├── InstructorRequest.js (NEW)
│   └── ...
├── repositories/
│   ├── userRepository.js
│   ├── courseRepository.js
│   ├── instructorRequestRepository.js (NEW)
│   └── ...
├── services/
│   ├── authService.js
│   ├── emailService.js
│   ├── instructorRequestService.js (NEW)
│   └── ...
├── controllers/
│   ├── authController.js
│   ├── instructorRequestController.js (NEW)
│   └── ...
├── routes/v1/
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── instructorRequestRoutes.js (NEW)
│   └── index.js (UPDATED)
├── validators/
│   ├── authValidators.js
│   ├── instructorRequestValidators.js (NEW)
│   └── ...
└── ...

src/
├── pages/
│   ├── InstructorRegistration.jsx (UPDATED)
│   ├── InstructorDocuments.jsx (UPDATED)
│   └── ...
└── services/
    ├── levelupApi.js (UPDATED)
    ├── instructorRequests.js (UPDATED)
    └── ...
```

## Future Enhancements

1. **Document Upload**: Support CV and ID uploads directly
2. **Document Verification**: Automated document scanning/verification
3. **Interview Scheduling**: Calendar integration for interviews
4. **Dashboard Analytics**: Visual stats and trends
5. **Bulk Operations**: Approve/reject multiple applications
6. **Email Templates**: Custom HTML email templates
7. **Webhook Notifications**: Real-time admin notifications
8. **Audit Trail**: Complete action history
9. **Appeal Process**: Allow rejected applicants to appeal
10. **Background Checks**: Integration with third-party verification

## Support & Maintenance

### Regular Tasks
- Monitor rate limit patterns
- Clean up old deleted records (monthly)
- Review application trends
- Update validation rules as needed

### Backups
- MongoDB automatic backups
- Test recovery procedures monthly

## License

This implementation is part of the LevelUp platform.
