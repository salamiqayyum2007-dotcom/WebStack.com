require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Simple in-memory store for codes. For production use a persistent store (Redis, DB).
const codes = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT): 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/send-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success:false, message: 'Email required' });

  const code = Math.floor(100000 + Math.random()*900000).toString();
  codes.set(code, { email, expires: Date.now()+1000*60*15 }); // 15 minutes
  setTimeout(() => codes.delete(code), 1000*60*15);

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your WebStack password reset code',
    text: `Your password reset code is: ${code}. It expires in 15 minutes.`
  };

  try{
    await transporter.sendMail(mailOptions);
    return res.json({ success:true });
  }catch(err){
    console.error('Mail send error', err);
    return res.json({ success:false, message: 'Failed to send email' });
  }
});

app.post('/verify-reset-code', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.json({ success:false, message: 'Missing fields' });
  const entry = codes.get(code);
  if (!entry) return res.json({ success:false, message: 'Invalid or expired code' });
  if (entry.email !== email) return res.json({ success:false, message: 'Code does not match email' });

  // Code valid — consume it
  codes.delete(code);

  // NOTE: This server does not manage your user database. For sites using a real DB
  // you should lookup the user by email and update their password (hashed) here.
  // This demo simply returns success so the client (which may store demo users in localStorage)
  // can update its local copy. Integrate with your user store to persist the change.

  return res.json({ success:true });
});

app.listen(PORT, () => console.log('Reset server listening on', PORT));
