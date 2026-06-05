# 🚀 Admin Dashboard - Quick Start Guide

## 5-Minute Setup

### 1. **Start Backend**
```bash
npm run auth:api
# Server starts on http://localhost:8080
```

### 2. **Start Frontend**
```bash
npm run dev
# App opens on http://localhost:5173
```

### 3. **Access Admin Dashboard**
- Go to: `http://localhost:5173/instructor-requests`
- Requires admin authentication
- Shows pending instructor applications

---

## 📱 User Flow (Testing)

### Step 1: User Submits Application
1. Navigate to `/instructor-registration`
2. Fill form:
   ```
   Name: Ahmed Mohamed
   Email: ahmed@example.com
   Phone: +201000000000
   Category: Web Development
   Experience: 5 years
   ```
3. Click "Submit"
4. See success message
5. Check email for confirmation

### Step 2: Admin Reviews Application
1. Navigate to `/instructor-requests` (admin only)
2. See "Pending" tab with new application
3. View applicant details
4. Options:
   - **✅ Approve**: Click "Approve" button
   - **❌ Reject**: Click "Reject" → Enter reason → Confirm

### Step 3: See Results
1. Approved applicants move to "Approved" tab
2. Rejected applicants move to "Rejected" tab
3. Statistics update in real-time
4. User receives confirmation/rejection email

---

## 🧪 API Testing (cURL)

### Submit Request
```bash
curl -X POST http://localhost:8080/api/v1/instructor-requests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+201000000000",
    "category": "Web Development",
    "experienceYears": 5
  }'
```

### List Pending Requests (Admin)
```bash
curl -X GET "http://localhost:8080/api/v1/instructor-requests?status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get Statistics (Admin)
```bash
curl -X GET http://localhost:8080/api/v1/instructor-requests/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Approve Request (Admin)
```bash
curl -X PATCH "http://localhost:8080/api/v1/instructor-requests/{id}/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### Reject Request (Admin)
```bash
curl -X PATCH "http://localhost:8080/api/v1/instructor-requests/{id}/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "rejectionReason": "Needs more experience"
  }'
```

---

## 🔐 Authentication

### Get Admin Token (for testing)
1. Sign up as admin user
2. Get JWT token from `/auth/login`
3. Use token in `Authorization: Bearer {token}` header

### Admin Role Required For:
- GET `/instructor-requests` (list)
- GET `/instructor-requests/stats` (stats)
- GET `/instructor-requests/:id` (get single)
- PATCH `/instructor-requests/:id/status` (update)
- DELETE `/instructor-requests/:id` (delete)

---

## 📊 Dashboard Features

### Tabs
- **Pending**: New applications waiting for review
- **Approved**: Accepted instructors
- **Rejected**: Declined applications

### Actions
| Tab | Actions |
|-----|---------|
| Pending | ✅ Approve, ❌ Reject |
| Approved | 🚫 Remove Access |
| Rejected | - (View only) |

### Statistics
Shows counts for:
- 📊 Pending applications
- ✅ Approved instructors
- ❌ Rejected applications
- 👥 Total applications

---

## 🐛 Common Issues

### Admin Dashboard Not Loading
**Problem**: Shows "Access denied"
**Solution**: 
- Check user role is "admin"
- Verify JWT token is valid
- Clear cache and login again

### Real-time Updates Not Working
**Problem**: Data not refreshing
**Solution**:
- Check console for errors
- Verify backend is running
- Check network tab in DevTools
- Try refreshing page (F5)

### Emails Not Sending
**Problem**: No confirmation/approval emails
**Solution**:
- Verify SMTP config in `.env`
- Check MongoDB logs
- Verify sender email is configured
- Check spam folder

### Form Submission Rate Limited
**Problem**: "Too many requests" error
**Solution**:
- Wait 1 hour for rate limit to reset
- Use different email address
- Check backend rate limiter config

---

## 📁 File Locations

```
Frontend (React):
├── src/pages/InstructorRequests.jsx        ← Admin Dashboard UI
├── src/services/instructorRequests.js      ← API calls & polling
├── src/services/levelupApi.js              ← HTTP client
└── src/components/Toast.jsx                ← Notifications

Backend (Node.js/Express):
├── server/auth-api/src/
│   ├── models/InstructorRequest.js         ← Database schema
│   ├── repositories/instructorRequestRepository.js
│   ├── services/instructorRequestService.js
│   ├── controllers/instructorRequestController.js
│   ├── validators/instructorRequestValidators.js
│   └── routes/v1/instructorRequestRoutes.js
```

---

## 🎯 Next Steps

1. **Deploy Backend** → Push to production server
2. **Deploy Frontend** → Build and deploy to CDN
3. **Configure Email** → Set up SMTP credentials
4. **Monitor Logs** → Watch for errors/issues
5. **User Testing** → Have users test the flow

---

## 📞 Support

For issues, check:
1. Browser console (F12)
2. Backend logs (`npm run auth:api`)
3. Network tab in DevTools
4. MongoDB logs
5. Email server logs

---

**Status**: ✅ Ready to Use
**Last Updated**: 2024-01-20
