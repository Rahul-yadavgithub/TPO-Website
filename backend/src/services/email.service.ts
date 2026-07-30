import nodemailer from 'nodemailer';
import axios from 'axios';

export async function sendRecoveryEmail(
  toEmail: string,
  recoveryLink: string
): Promise<void> {
  const subject = 'TPO Portal — Password Reset Link';
  const textBody = `Hello,

A password reset was requested for your account on the NITH TPR Portal.
Click the link below to securely reset your password.
This link expires in 1 hour.

${recoveryLink}

If you did not expect this email, please ignore it.`;

  const htmlBody = `<p>Hello,</p>
<p>A password reset was requested for your account on the NITH TPR Portal.</p>
<p>Click the link below to securely reset your password.</p>
<p>This link expires in 1 hour.</p>
<p><a href="${recoveryLink}">${recoveryLink}</a></p>
<p><small>If you did not expect this email, please ignore it.</small></p>`;

  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const smtpPass = process.env.SMTP_PASS;
    const smtpUser = process.env.SMTP_USER;
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;

    if (!brevoApiKey && !smtpPass) {
      console.warn('⚠️ No email credentials configured. Please set BREVO_API_KEY or SMTP_PASS.');
      console.warn('⚠️ Development Fallback - Password Reset Link:');
      console.warn(recoveryLink);
      return;
    }

    // Vercel and many cloud providers block SMTP ports (587, 465).
    // The only reliable way to send emails in production (Vercel) is via HTTP APIs.
    if (brevoApiKey && brevoApiKey.startsWith('xkeysib')) {
      console.log('📧 Sending email via Brevo HTTP API (Vercel Compatible)...');
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: "NITH TPR Portal", email: fromEmail },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlBody,
        textContent: textBody
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        timeout: 8000 // fail fast if API is unreachable
      });
      console.log(`✅ Recovery email sent successfully to ${toEmail}`);
      return;
    }

    // Fallback to SMTP if no API key is provided
    if (smtpPass) {
      console.log('📧 Sending email via SMTP (Warning: Vercel blocks SMTP ports)...');
      if (smtpPass.startsWith('xsmtpsib')) {
        console.warn('⚠️ Notice: You are using an SMTP password. This will timeout in production on Vercel.');
      }
      
      const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        connectionTimeout: 5000, // 5 seconds to prevent hanging
        greetingTimeout: 5000,
        socketTimeout: 5000,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"NITH TPR Portal" <${fromEmail}>`,
        to: toEmail,
        subject: subject,
        text: textBody,
        html: htmlBody,
      });
      console.log(`✅ Recovery email sent successfully via SMTP to ${toEmail}`);
    }

  } catch (error: any) {
    const isTimeout = error.message?.includes('timeout') || error.code === 'ETIMEDOUT';
    
    if (isTimeout) {
      console.log('\n---------------------------------------------------------');
      console.log('⚠️  Notice: Local Network Blocked SMTP Connection');
      console.log('---------------------------------------------------------');
      console.log('Development Fallback - Password Reset Link:');
      console.log(recoveryLink);
      console.log('---------------------------------------------------------\n');
    } else {
      console.error('❌ Failed to send recovery email.');
      console.error('Error Details:', error.response?.data || error.message);
      console.warn('⚠️ Development Fallback - Password Reset Link:');
      console.warn(recoveryLink);
    }
  }
}

