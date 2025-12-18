# Email Notifications Setup

## Overview
Email notifications have been implemented using Resend. Users will receive email notifications for:
- Task assignments
- Task deadlines
- Task comments
- Board invitations
- Daily digest (optional)

## Setup Instructions

### 1. Get Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain (or use their test domain)

### 2. Configure Environment Variables
Add to your `.env.local` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=Tasklyx <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
CRON_SECRET=your-secret-key-here  # For daily digest cron job
```

### 3. Daily Digest Cron Job (Optional)
To enable daily digest emails, set up a cron job to call:
```
POST /api/email/digest
Authorization: Bearer {CRON_SECRET}
```

Example with Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/email/digest",
    "schedule": "0 9 * * *"
  }]
}
```

### 4. User Preferences
Users can manage their email notification preferences in Settings:
- Enable/disable all email notifications
- Toggle specific notification types
- Enable daily digest

## Features
- ✅ Task assignment emails
- ✅ Deadline reminder emails
- ✅ Comment notification emails
- ✅ Board invitation emails
- ✅ Daily digest emails (cron job required)
- ✅ User preference management
- ✅ HTML email templates

## Testing
Without Resend API key configured, the system will skip sending emails but continue to work normally. All notifications are still stored in the database.

