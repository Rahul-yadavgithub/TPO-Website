const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    let info = await transporter.sendMail({
      from: `"NITH TPR Portal" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: "tpo@nith.ac.in",
      subject: "Test SMTP",
      text: "Hello world?",
      html: "<b>Hello world?</b>",
    });
    console.log("Message sent: %s", info.messageId);
  } catch (e) {
    console.error("Error: ", e);
  }
}

testSMTP();
