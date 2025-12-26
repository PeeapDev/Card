/**
 * Email Service
 *
 * Handles all email sending functionality using nodemailer with SMTP configuration
 * stored in the payment_settings table.
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Get SMTP configuration from database
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const { data: settings, error } = await supabase
      .from('payment_settings')
      .select('smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_enabled')
      .eq('id', SETTINGS_ID)
      .single();

    if (error || !settings) {
      console.error('[EmailService] Failed to get SMTP config:', error);
      return null;
    }

    return {
      host: settings.smtp_host || 'smtp.gmail.com',
      port: settings.smtp_port || 587,
      secure: settings.smtp_secure ?? false,
      username: settings.smtp_username || '',
      password: settings.smtp_password || '',
      fromEmail: settings.smtp_from_email || '',
      fromName: settings.smtp_from_name || 'Peeap',
      isEnabled: settings.smtp_enabled ?? false,
    };
  } catch (err) {
    console.error('[EmailService] Error getting SMTP config:', err);
    return null;
  }
}

/**
 * Create nodemailer transporter with given SMTP config
 */
export function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  });
}

/**
 * Send email using SMTP configuration from database
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getSmtpConfig();

    if (!config) {
      return { success: false, error: 'SMTP not configured' };
    }

    if (!config.isEnabled) {
      console.log('[EmailService] Email sending is disabled');
      return { success: false, error: 'Email notifications are disabled' };
    }

    if (!config.username || !config.password) {
      return { success: false, error: 'SMTP credentials not configured' };
    }

    const transporter = createTransporter(config);

    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail || config.username}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Email sent:', info.messageId);

    return { success: true };
  } catch (err: any) {
    console.error('[EmailService] Failed to send email:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}

/**
 * Send email using custom SMTP config (for testing)
 */
export async function sendEmailWithConfig(
  config: SmtpConfig,
  options: EmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!config.username || !config.password) {
      return { success: false, error: 'SMTP credentials required' };
    }

    const transporter = createTransporter(config);

    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail || config.username}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Test email sent:', info.messageId);

    return { success: true };
  } catch (err: any) {
    console.error('[EmailService] Failed to send test email:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}

/**
 * Send transaction notification email
 */
export async function sendTransactionEmail(
  to: string,
  type: 'received' | 'sent',
  amount: number,
  currency: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const isReceived = type === 'received';
  const subject = isReceived
    ? `You received ${currency} ${amount.toLocaleString()}`
    : `Payment of ${currency} ${amount.toLocaleString()} sent`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Peeap</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">${isReceived ? 'Payment Received!' : 'Payment Sent'}</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #4b5563; margin: 0 0 10px;">
            <strong>Amount:</strong> ${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          ${description ? `<p style="color: #4b5563; margin: 0;"><strong>Description:</strong> ${description}</p>` : ''}
        </div>
        <p style="color: #4b5563;">
          ${isReceived
            ? 'The funds have been added to your wallet.'
            : 'The funds have been deducted from your wallet.'}
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from Peeap Payment Gateway.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  to: string,
  verificationCode: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Verify your Peeap account';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Peeap</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">Welcome${firstName ? `, ${firstName}` : ''}!</h2>
        <p style="color: #4b5563;">
          Thank you for creating a Peeap account. Please verify your email address by entering the code below:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; margin: 0;">
            ${verificationCode}
          </p>
        </div>
        <p style="color: #4b5563;">
          This code will expire in 10 minutes. If you didn't create an account, please ignore this email.
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from Peeap Payment Gateway.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetCode: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Reset your Peeap password';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Peeap</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">Password Reset Request</h2>
        <p style="color: #4b5563;">
          ${firstName ? `Hi ${firstName}, ` : ''}We received a request to reset your password. Use the code below to reset it:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; margin: 0;">
            ${resetCode}
          </p>
        </div>
        <p style="color: #4b5563;">
          This code will expire in 15 minutes. If you didn't request a password reset, please ignore this email or contact support if you're concerned.
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from Peeap Payment Gateway.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send login notification email
 */
export async function sendLoginNotificationEmail(
  to: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const subject = success ? 'New login to your Peeap account' : 'Failed login attempt on your Peeap account';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, ${success ? '#10b981' : '#ef4444'} 0%, ${success ? '#059669' : '#dc2626'} 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Peeap</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">${success ? 'New Login Detected' : 'Failed Login Attempt'}</h2>
        <p style="color: #4b5563;">
          ${success
            ? 'A new login was detected on your Peeap account.'
            : 'Someone tried to log in to your account but failed.'}
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #4b5563; margin: 0 0 10px;">
            <strong>Time:</strong> ${new Date().toLocaleString()}
          </p>
          ${ipAddress ? `<p style="color: #4b5563; margin: 0 0 10px;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
          ${userAgent ? `<p style="color: #4b5563; margin: 0;"><strong>Device:</strong> ${userAgent}</p>` : ''}
        </div>
        <p style="color: #4b5563;">
          If this wasn't you, please secure your account immediately by changing your password.
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated security notification from Peeap Payment Gateway.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}
