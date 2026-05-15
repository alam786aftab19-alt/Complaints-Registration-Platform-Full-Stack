import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendOTPEmail = async (email, otp) => {
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
