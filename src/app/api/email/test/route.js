import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { useAuth } from "@/context/AuthContext";

// Test email endpoint - for debugging
export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject = "Test Email", message = "This is a test email from Tasklyx" } = body;

    if (!to) {
      return NextResponse.json(
        { message: "Email address (to) is required" },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    const isConfigured = !!process.env.RESEND_API_KEY;
    
    if (!isConfigured) {
      return NextResponse.json(
        {
          message: "Email service not configured",
          error: "RESEND_API_KEY is not set in environment variables",
          configured: false,
          instructions: "Add RESEND_API_KEY to your .env.local file. See README_EMAIL_SETUP.md for details.",
        },
        { status: 400 }
      );
    }

    // Send test email
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Test Email</h1>
            </div>
            <div class="content">
              <p>${message}</p>
              <p>If you received this email, your email configuration is working correctly!</p>
            </div>
            <div class="footer">
              <p>This is a test email from Tasklyx.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail(to, subject, html);

    if (result.success) {
      return NextResponse.json(
        {
          message: "Test email sent successfully",
          success: true,
          emailId: result.data?.id,
          to,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          message: "Failed to send test email",
          success: false,
          error: result.error,
          to,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check email configuration status
export async function GET() {
  const isConfigured = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Tasklyx <noreply@tasklyx.com>";

  return NextResponse.json({
    configured: isConfigured,
    fromEmail,
    hasApiKey: isConfigured,
    message: isConfigured
      ? "Email service is configured"
      : "Email service is not configured - RESEND_API_KEY is missing",
  });
}

