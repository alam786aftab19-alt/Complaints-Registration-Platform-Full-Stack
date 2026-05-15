import { Resend } from 'resend';
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || 're_UoWDVCvd_MKr6UmkK7dAeFpyRM1iLLC2x');

export const sendOTPEmail = async (email, otp) => {
  console.log(`📧 Attempting to send OTP to ${email} via Resend...`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your Registration OTP',
      html: `<strong>Your OTP for registration is: ${otp}</strong>. It will expire in 10 minutes.`,
    });

    if (error) {
      console.error("❌ Resend Error:", error);
      throw error;
    }

    console.log(`✅ OTP sent successfully to ${email}. ID: ${data.id}`);
  } catch (error) {
    console.error("❌ Critical Email Error:", error);
    throw error;
  }
};
