import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  // Force IPv4 because many cloud servers have issues with IPv6 and Gmail
  connectionTimeout: 10000,
});

export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 [DEBUG] Attempting to send OTP to ${email} using Gmail Service...`);
  
  // Verify the connection before sending
  try {
    await transporter.verify();
    console.log("✅ [DEBUG] SMTP Connection Verified!");
  } catch (err) {
    console.error("❌ [DEBUG] SMTP Verification Failed:", err.message);
  }
  console.log(`📧 Attempting to send OTP to ${email}...`);
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
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
