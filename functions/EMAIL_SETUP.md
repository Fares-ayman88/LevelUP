# Custom Verification Email Setup (Postmark + Firebase Functions)

## 1) Configure Postmark sender domain
1. In Postmark, create/verify your sending domain (example: `yourdomain.com`).
2. Add DNS records provided by Postmark:
   - SPF
   - DKIM
   - Return-Path/Tracking (if requested by Postmark)
3. Publish a DMARC record on your domain:
   - Example: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

Notes:
- Use a real business/domain email, not Gmail/Yahoo as sender.
- Recommended sender: `no-reply@yourdomain.com`.

## 2) Set Functions environment variables
1. Copy the example file:

```powershell
Copy-Item functions/.env.example functions/.env
```

2. Edit `functions/.env` with your real values:
- `POSTMARK_SERVER_TOKEN`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME` (optional)
- `APP_CONTINUE_URL` (optional but recommended)
- `POSTMARK_MESSAGE_STREAM` (optional)

## 3) Deploy functions
1. Login Firebase CLI:

```powershell
npx.cmd firebase-tools login
```

2. Deploy only functions:

```powershell
npx.cmd firebase-tools deploy --only functions --project eduplatform1-6dab2
```

## 4) Validate end-to-end
1. Sign up with a new email.
2. Check inbox (and spam once) for subject:
   - `Verify your LevelUp account`
3. Open the verification link and confirm account.
4. In Postmark Activity, confirm message status = Delivered.

## 5) If email still goes to spam
1. Confirm SPF + DKIM are passing (inside Postmark message details).
2. Keep DMARC enabled.
3. Make sure `From` domain exactly matches verified domain.
4. Avoid too many links or spammy wording in email body.
5. Build sender reputation (send gradually to real engaged users).

