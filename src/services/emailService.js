const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

const sendOTP = async (email, otp) => {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const message = [
      `To: ${email}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: =?utf-8?B?${Buffer.from('كود تفعيل حسابك - Udemy Coupons').toString('base64')}?=`,
      '',
      `<div dir="rtl" style="font-family: Arial; text-align: center; border: 2px solid #a435f0; padding: 20px;">`,
      `<h2>مرحباً بك في Udemy Coupons</h2>`,
      `<p>كود التفعيل الخاص بك هو:</p>`,
      `<h1 style="background: #f0f0f0; color: #a435f0; padding: 10px;">${otp}</h1>`,
      `</div>`
    ].join('\n');

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
    console.log("✅ الإيميل وصل للجيميل بنجاح وبورت 443 شغال طلقة!");
  } catch (error) {
    console.error("❌ فشل إرسال الجيميل:", error.message);
  }
};

module.exports = { sendOTP };