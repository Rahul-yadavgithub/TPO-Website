const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: 465,
    secure: true, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000,
  });

  try {
    let info = await transporter.sendMail({
      from: `"NITH TPR Portal" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: "tpo@nith.ac.in",
      subject: "Test SMTP Port 465",
      text: "Hello world?",
      html: "<b>Hello world?</b>",
    });
    console.log("Message sent: %s", info.messageId);
  } catch (e) {
    console.error("Error: ", e);
  }
}

testSMTP();
