import { db } from "./db.js";
import { users, complaints } from "./schema.js";
import { sendOTPEmail } from "./emailService.js";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function setupAndTest() {
  console.log("🔍 Starting Setup & Diagnostic...");

  // 1. Manual Table Creation (since drizzle-kit is hanging)
  try {
    console.log("⏳ Attempting to create tables manually...");
    
    // Create Users Table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        otp VARCHAR(6),
        otp_expiry TIMESTAMP,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create Complaints Table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        complaint_text TEXT NOT NULL,
        ai_question TEXT,
        user_answer TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("✅ Tables created or already exist!");
  } catch (err) {
    console.error("❌ Table Creation Failed!");
    console.error("Error Detail:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error("👉 FIX: Your DATABASE_URL password in .env is incorrect.");
      process.exit(1);
    }
  }

  // 2. Test Connection
  try {
    console.log("⏳ Testing connection...");
    await db.select().from(users).limit(1);
    console.log("✅ Database connection successful!");
  } catch (err) {
    console.error("❌ Connection Test Failed!");
    console.error(err.message);
  }

  // 3. Test Email
  try {
    console.log("\n⏳ Testing Email service...");
    await sendOTPEmail(process.env.GMAIL_USER, "123456");
    console.log("✅ Test OTP email sent successfully!");
  } catch (err) {
    console.error("❌ Email Service Failed!");
    console.error(err.message);
  }

  console.log("\n🚀 SETUP COMPLETE! You can now start the server with 'npm run dev'.");
  process.exit();
}

setupAndTest();
