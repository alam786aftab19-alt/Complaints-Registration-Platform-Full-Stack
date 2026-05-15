import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const gmailPass = process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : '';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: gmailPass,
  },
  tls: {
    rejectUnauthorized: false // Helps bypass some network blocks
  },
  connectionTimeout: 20000,
});

export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Attempting to send OTP to ${email} via Gmail...`);
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Your Registration OTP",
    text: `Your OTP for registration is: ${otp}. It will expire in 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ Email Error:", error.message);
    throw error;
  }
};
