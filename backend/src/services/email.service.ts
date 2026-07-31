import axios from 'axios';

export async function sendRecoveryEmail(
  toEmail: string,
  toName: string,
  recoveryLink: string
): Promise<void> {
  try {
    console.log(`📧 Sending recovery email via EmailJS to ${toEmail}...`);
    const data = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_name: toName,
        to_email: toEmail,
        recovery_link: recoveryLink,
        reset_link: recoveryLink,
        link: recoveryLink,
        message: `Click the link below to securely reset your password.\n\n${recoveryLink}`
      }
    };
    
    await axios.post('https://api.emailjs.com/api/v1.0/email/send', data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });
    
    console.log(`✅ Recovery email sent successfully via EmailJS to ${toEmail}`);
  } catch (error: any) {
    console.error('❌ Failed to send recovery email via EmailJS.');
    console.error('Error Details:', error.response?.data || error.message);
    console.warn('⚠️ Development Fallback - Password Reset Link:');
    console.warn(recoveryLink);
  }
}

