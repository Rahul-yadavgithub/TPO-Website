import nodemailer from 'nodemailer';

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
    const smtpPass = process.env.SMTP_PASS || process.env.BREVO_API_KEY;
    const smtpUser = process.env.SMTP_USER;
    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;

    if (!smtpPass || !smtpUser) {
      console.warn('⚠️ SMTP credentials not configured.');
      console.warn('⚠️ Development Fallback - Password Reset Link:');
      console.warn(recoveryLink);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      connectionTimeout: 5000,
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
    
    console.log(`✅ Recovery email sent successfully to ${toEmail}`);
  } catch (error: any) {
    console.error('❌ Failed to send recovery email. Please check your SMTP configuration in the .env file.');
    console.error('Error Details:', error.message);
    console.warn('⚠️ Development Fallback - Password Reset Link:');
    console.warn(recoveryLink);
    // We gracefully swallow the error here so the frontend API doesn't crash with a 500 error.
    // This allows developers to test the password reset flow using the printed link even if email configuration is broken.
  }
}

