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
    const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;
    const senderEmail = process.env.SMTP_USER;

    if (!apiKey || !senderEmail) {
      console.warn('Brevo credentials not configured. Email would have been:', textBody);
      return;
    }

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: "NITH TPR Portal", email: senderEmail },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlBody,
      textContent: textBody
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Brevo API Error: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error('Failed to send recovery email:', error.response?.data || error.message);
    throw new Error('Email service configuration error or delivery failed.');
  }
}
