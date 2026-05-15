import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const gmailPass = process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : '';

const transporter = nodemailer.createTransport({
  host: '74.125.142.108', // Direct Gmail IPv4 Address to bypass Render's IPv6 issues
  port: 587,
  secure: false, 
  auth: {
    user: process.env.GMAIL_USER,
    pass: gmailPass,
  },
  tls: {
    servername: 'smtp.gmail.com', // Required for SSL/TLS to work with an IP
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
});

export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Attempting to send OTP to ${email}...`);
  if (!process.env.GMAIL_USER || !gmailPass) {
    throw new Error("Missing GMAIL_USER or GMAIL_PASS environment variables");
  }
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Your Registration OTP",
    text: `Your OTP for registration is: ${otp}. It will expire in 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
