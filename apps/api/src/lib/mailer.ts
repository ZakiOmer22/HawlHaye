import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";
import { getSystemSettings } from "../middleware/settings";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT || 587,
  secure: env.SMTP_SECURE === "true",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ESCAPE HTML TO PREVENT XSS
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function canSendEmail(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings?.emailNotifications !== false;
}

function getEmailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <style>
        @media (prefers-color-scheme: dark) {
          .email-body { background-color: #0B1120 !important; }
          .email-card { background-color: #1E293B !important; border-color: #334155 !important; }
          .text-main { color: #F8FAFC !important; }
          .text-muted { color: #94A3B8 !important; }
          .text-accent { color: #e8bc69 !important; }
          .divider { border-color: #334155 !important; }
          .badge-box { background-color: #0F172A !important; border-color: #334155 !important; }
          .btn-primary { background-color: #e8bc69 !important; color: #0F172A !important; }
          .footer-box { background-color: #0F172A !important; border-color: #334155 !important; }
        }
        @media only screen and (max-width: 600px) {
          .email-card { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
          .content-padding { padding: 30px 20px !important; }
          .mobile-stack { display: block !important; width: 100% !important; text-align: center !important; }
          .mobile-stack-padding { padding-bottom: 16px !important; }
          .logo-stack { display: block !important; margin: 0 auto 10px auto !important; }
        }
      </style>
    </head>
    <body class="email-body" style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: inherit; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table class="email-card" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <tr>
                <td height="6" style="background: linear-gradient(90deg, #e8bc69, #f1cf8b);"></td>
              </tr>
              <tr>
                <td align="center" style="padding: 30px 20px; border-bottom: 1px solid #E5E7EB;" class="divider">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" class="mobile-stack" width="50%" style="padding-bottom: 10px;">
                        <img src="${env.WEB_ORIGIN}/logo.png" alt="HAWLHAYE" width="80" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border: 0;" />
                      </td>
                      <td align="center" class="mobile-stack" width="50%" style="padding-bottom: 10px;">
                        <img src="${env.WEB_ORIGIN}/uoh-logo.png" alt="University of Hargeisa" width="80" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border: 0;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${content}
              <tr>
                <td align="center" class="footer-box" style="padding: 24px 20px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;" class="divider">
                  <p class="text-muted" style="margin: 0 0 8px 0; color: #6B7280; font-size: 13px; font-weight: 600;">
                    Need help? Contact the CECIT Administrator.
                  </p>
                  <p class="text-muted" style="margin: 0; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
                    Sent securely by HAWLHAYE · University of Hargeisa<br>
                    This is an automated message, please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getPasswordResetHtml(link: string, email: string): string {
  const content = `
    <tr>
      <td class="content-padding" style="padding: 40px 40px 30px 40px;">
        <h1 class="text-main" style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 800; line-height: 1.3;">
          Reset your password
        </h1>
        <p class="text-muted" style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
          We received a request to reset the password for your HAWLHAYE account associated with <strong class="text-main" style="color: #111827;">${escapeHtml(email)}</strong>.
        </p>
        <p class="text-muted" style="margin: 0 0 30px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
          Click the button below to choose a new password. This link is valid for <strong class="text-main" style="color: #111827;">1 hour</strong> and can only be used once.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
          <tr>
            <td align="center">
              <a href="${link}" target="_blank" class="btn-primary" style="display: block; width: 100%; max-width: 280px; background-color: #111827; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 20px; border-radius: 8px; text-align: center; box-sizing: border-box;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p class="text-muted" style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email. Your password will not change until you create a new one.
        </p>
      </td>
    </tr>
  `;
  return getEmailWrapper(content);
}

function getInviteHtml(
  link: string,
  role: string,
  inviterName: string,
  officeName: string | null,
  fullName?: string | null,
): string {
  const formattedRole = role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  const greeting = fullName ? `Hi ${escapeHtml(fullName.split(" ")[0])},` : "Hello,";
  const title = fullName
    ? `Welcome to HAWLHAYE, ${escapeHtml(fullName.split(" ")[0])}`
    : "You're invited to join HAWLHAYE";

  const content = `
    <tr>
      <td class="content-padding" style="padding: 40px 40px 30px 40px;">
        <h1 class="text-main" style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 800; line-height: 1.3;">
          ${title}
        </h1>
        <p class="text-muted" style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
          ${greeting} <strong class="text-main" style="color: #111827;">${escapeHtml(inviterName)}</strong> has invited you to access the official task management platform for the College of Engineering and IT.
        </p>
        <p class="text-muted" style="margin: 0 0 24px 0; color: #6B7280; font-size: 15px; line-height: 1.6;">
          HAWLHAYE helps our team assign, track, and complete tasks efficiently across all offices and departments. It replaces paper trails and ensures full accountability.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
          <tr>
            <td align="center" class="mobile-stack" style="padding-bottom: 10px;">
              <div class="badge-box" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; display: inline-block; text-align: center; min-width: 140px;">
                <p class="text-muted" style="margin: 0 0 4px 0; color: #6B7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Role</p>
                <p class="text-accent" style="margin: 0; color: #D97706; font-size: 16px; font-weight: 800;">${formattedRole}</p>
              </div>
            </td>
            ${
              officeName
                ? `
            <td align="center" class="mobile-stack" style="padding-bottom: 10px;">
              <div class="badge-box" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; display: inline-block; text-align: center; min-width: 140px;">
                <p class="text-muted" style="margin: 0 0 4px 0; color: #6B7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Office</p>
                <p class="text-main" style="margin: 0; color: #111827; font-size: 16px; font-weight: 800;">${escapeHtml(officeName)}</p>
              </div>
            </td>
            `
                : ""
            }
          </tr>
        </table>
        <h2 class="text-main" style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700;">What you need to do:</h2>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td class="mobile-stack" width="40" valign="top" style="padding-bottom: 16px;">
              <div style="width: 28px; height: 28px; background-color: #e8bc69; color: #111827; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 900; font-size: 14px;">1</div>
            </td>
            <td class="mobile-stack" valign="top" style="padding-bottom: 16px; color: #4B5563; font-size: 15px; line-height: 1.5;">
              Click the button below to open the secure setup page.
            </td>
          </tr>
          <tr>
            <td class="mobile-stack" width="40" valign="top" style="padding-bottom: 16px;">
              <div style="width: 28px; height: 28px; background-color: #e8bc69; color: #111827; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 900; font-size: 14px;">2</div>
            </td>
            <td class="mobile-stack" valign="top" style="padding-bottom: 16px; color: #4B5563; font-size: 15px; line-height: 1.5;">
              Create a strong password to secure your account.
            </td>
          </tr>
          <tr>
            <td class="mobile-stack" width="40" valign="top" style="padding-bottom: 16px;">
              <div style="width: 28px; height: 28px; background-color: #e8bc69; color: #111827; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 900; font-size: 14px;">3</div>
            </td>
            <td class="mobile-stack" valign="top" style="padding-bottom: 16px; color: #4B5563; font-size: 15px; line-height: 1.5;">
              Log in and start managing your tasks.
            </td>
          </tr>
        </table>
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${link}" target="_blank" class="btn-primary" style="display: block; width: 100%; max-width: 320px; background-color: #111827; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 20px; border-radius: 8px; text-align: center; box-sizing: border-box;">
                Accept Invitation & Set Password
              </a>
            </td>
          </tr>
        </table>
        <p class="text-muted" style="margin: 20px 0 0 0; color: #6B7280; font-size: 13px; text-align: center;">
          This secure link expires in <strong>48 hours</strong>.
        </p>
      </td>
    </tr>
  `;
  return getEmailWrapper(content);
}

function getContactEmailHtml(
  name: string,
  email: string,
  phone: string,
  company: string,
  inquiryType: string,
  message: string,
): string {
  const content = `
    <tr>
      <td class="content-padding" style="padding: 40px 40px 30px 40px;">
        <h1 class="text-main" style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 800; line-height: 1.3;">
          New Contact Inquiry
        </h1>
        <p class="text-muted" style="margin: 0 0 24px 0; color: #4B5563; font-size: 16px; line-height: 1.6;">
          You have received a new message from the HAWLHAYE platform.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 12px 16px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB; width: 40%;">
              <p class="text-muted" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">From</p>
            </td>
            <td style="padding: 12px 16px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <p class="text-main" style="margin: 0; font-size: 15px; font-weight: 700;">${escapeHtml(name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
              <p class="text-muted" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">Email</p>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
              <a href="mailto:${escapeHtml(email)}" style="color: #D97706; font-size: 15px; text-decoration: none; font-weight: 600;">${escapeHtml(email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
              <p class="text-muted" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">Phone</p>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
              <p class="text-main" style="margin: 0; font-size: 15px;">${escapeHtml(phone) || "Not provided"}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
              <p class="text-muted" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">Organization</p>
            </td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
              <p class="text-main" style="margin: 0; font-size: 15px;">${escapeHtml(company) || "Not provided"}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px;">
              <p class="text-muted" style="margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">Inquiry</p>
            </td>
            <td style="padding: 12px 16px;">
              <span style="display: inline-block; background-color: #e8bc69; color: #111827; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 800;">${escapeHtml(inquiryType)}</span>
            </td>
          </tr>
        </table>
        <h3 class="text-main" style="margin: 0 0 8px 0; color: #111827; font-size: 16px; font-weight: 700;">Message:</h3>
        <div class="text-muted" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; padding: 16px; border-radius: 8px; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
      </td>
    </tr>
  `;
  return getEmailWrapper(content);
}

export async function sendContactEmail(
  name: string,
  email: string,
  phone: string,
  company: string,
  inquiryType: string,
  message: string,
): Promise<void> {
  if (!(await canSendEmail())) return;
  const toEmail = process.env.ADMIN_EMAIL || env.SMTP_USER;

  if (env.NODE_ENV !== "production" && (!env.SMTP_HOST || !env.SMTP_USER)) {
    console.log(
      `\n[DEV MODE] Contact form submission from ${email}:\nSubject: ${inquiryType}\nMessage: ${message}\n`,
    );
    return;
  }
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.error("SMTP is not configured. Cannot send contact email.");
    throw new Error("Mailer not configured");
  }

  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || `"HAWLHAYE System" <${env.SMTP_USER}>`,
      to: toEmail,
      replyTo: email,
      subject: `[Contact Sales] ${inquiryType} - ${name}`,
      text: `New contact inquiry from ${name} (${email}).\n\nPhone: ${phone}\nCompany: ${company}\nType: ${inquiryType}\n\nMessage:\n${message}`,
      html: getContactEmailHtml(name, email, phone, company, inquiryType, message),
    });
    logger.info({ messageId: info.messageId }, "Contact email sent successfully");
  } catch (error) {
    logger.error({ err: error }, "Failed to send contact email");
    throw new Error("Failed to send contact email");
  }
}

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  if (!(await canSendEmail())) return;
  const link = `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;

  if (env.NODE_ENV !== "production" && (!env.SMTP_HOST || !env.SMTP_USER)) {
    console.log(`\n[DEV MODE] No SMTP configured.\nPassword reset for ${email}:\n${link}\n`);
    return;
  }
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.error({ email }, "SMTP is not configured in production. Cannot send password reset.");
    throw new Error("Mailer not configured");
  }

  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || `"HAWLHAYE System" <${env.SMTP_USER}>`,
      to: email,
      subject: "Reset your HAWLHAYE Password",
      text: `You requested a password reset. Click here to reset it: ${link} (Valid for 1 hour)`,
      html: getPasswordResetHtml(link, email),
    });
    logger.info({ messageId: info.messageId, email }, "Password reset email sent successfully");
  } catch (error) {
    logger.error({ err: error, email }, "Failed to send password reset email");
    throw new Error("Failed to send email");
  }
}

export async function sendInviteEmail(
  email: string,
  token: string,
  role: string,
  inviterName: string = "CECIT Administration",
  officeName: string | null = null,
  fullName: string | null = null,
): Promise<void> {
  if (!(await canSendEmail())) return;
  const link = `${env.WEB_ORIGIN}/invite/accept?token=${encodeURIComponent(token)}`;

  if (env.NODE_ENV !== "production" && (!env.SMTP_HOST || !env.SMTP_USER)) {
    console.log(`\n[DEV MODE] No SMTP configured.\nInvite for ${email}:\n${link}\n`);
    return;
  }
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.error({ email }, "SMTP is not configured in production. Cannot send invite.");
    throw new Error("Mailer not configured");
  }

  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || `"HAWLHAYE System" <${env.SMTP_USER}>`,
      to: email,
      subject: fullName
        ? `Welcome to HAWLHAYE, ${fullName.split(" ")[0]}`
        : "You've been invited to HAWLHAYE",
      text: `${inviterName} has invited you to join HAWLHAYE as a ${role}. Accept your invite here: ${link}`,
      html: getInviteHtml(link, role, inviterName, officeName, fullName),
    });
    logger.info({ messageId: info.messageId, email }, "Invite email sent successfully");
  } catch (error) {
    logger.error({ err: error, email }, "Failed to send invite email");
    throw new Error("Failed to send invite email");
  }
}
