import nodemailer from 'nodemailer';

export async function sendRecoveryEmail(
  toEmail: string,
  toName: string,
  recoveryLink: string
): Promise<void> {
  try {
    console.log(`📧 Sending recovery email via SMTP to ${toEmail}...`);
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT) === 587 ? 2525 : (Number(process.env.SMTP_PORT) || 2525),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"TPR Portal" <${process.env.SMTP_FROM_EMAIL || 'noreply@tpr-portal.com'}>`,
      to: toEmail,
      subject: 'Password Reset Request - TPR Portal',
      text: `Hello ${toName},\n\nYou requested a password reset. Click the link below to securely reset your password.\n\n${recoveryLink}\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">Password Reset Request</h2>
          <p>Hello <strong>${toName}</strong>,</p>
          <p>You requested a password reset for your TPR Portal account. Click the button below to securely reset your password.</p>
          <a href="${recoveryLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold;">Reset Password</a>
          <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 14px; word-break: break-all;"><a href="${recoveryLink}" style="color: #4f46e5;">${recoveryLink}</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email. Your password will remain unchanged.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Recovery email sent successfully via SMTP to ${toEmail}`);
  } catch (error: any) {
    console.error('❌ Failed to send recovery email via SMTP.');
    console.error('Error Details:', error.message);
    console.warn('⚠️ Development Fallback - Password Reset Link:');
    console.warn(recoveryLink);
  }
}
