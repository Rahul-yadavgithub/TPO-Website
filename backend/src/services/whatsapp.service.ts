import axios from 'axios';

export async function sendFailureAlertToGroup(
  companyName: string,
  recipientEmail: string,
  errorReason: string,
  pocName: string
) {
  try {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const to = process.env.ULTRAMSG_GROUP_ID; // The WhatsApp Group ID

    if (!instanceId || !token || !to) {
      console.warn('⚠️ UltraMsg credentials or Group ID not configured in .env. Skipping WhatsApp alert.');
      return;
    }

    const message = ` *Email Delivery Failure*\n*Company:* ${companyName}\n*Email:* ${recipientEmail}\n*Error:* ${errorReason}\n*Action Required by:* *${pocName}*`;

    const data = {
      token: token,
      to: to,
      body: message
    };

    const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, data);
    console.log(`✅ WhatsApp alert sent successfully for ${companyName}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to send WhatsApp alert via UltraMsg:', error.message);
    if (error.response) {
      console.error(error.response.data);
    }
  }
}
