import { sendOTPEmail } from "./emailService.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

// Try removing spaces from the password
if (process.env.GMAIL_PASS) {
  process.env.GMAIL_PASS = process.env.GMAIL_PASS.replace(/\s/g, "");
}

async function testEmail() {
  console.log("📧 Testing email sending...");
  try {
    // Send a test email to the user's email
    await sendOTPEmail(process.env.GMAIL_USER, "999999");
    console.log("✅ Email sent successfully!");
  } catch (err) {
    console.error("❌ Email failed!");
    console.error(err);
  } finally {
    process.exit();
  }
}

testEmail();
