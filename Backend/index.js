import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "./db.js";
import { users, complaints } from "./schema.js";
import { sendOTPEmail } from "./emailService.js";
import { generateFollowUpQuestion } from "./aiService.js";
import { authenticateToken, isAdmin } from "./middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ["http://127.0.0.1:5500", "https://alam786aftab19-alt.github.io"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- Auth Routes ---

// POST /api/auth/send-otp
app.post("/api/auth/send-otp", async (req, res) => {
  console.log("📩 Received OTP request for:", req.body.email);
  const { name, email } = req.body;
  
  if (!name || !email) {
    console.log("❌ Missing name or email");
    return res.status(400).json({ message: "Name and email are required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    console.log("⏳ Checking database for existing user...");
    // Check if user exists but unverified, or create new
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    console.log("✅ Database check complete. User exists:", existingUser.length > 0);
    
    if (existingUser.length > 0 && existingUser[0].is_verified) {
        console.log("❌ User already verified");
        return res.status(400).json({ message: "Email already registered and verified." });
    }

    if (existingUser.length > 0) {
      console.log("⏳ Updating existing user with new OTP...");
      await db.update(users).set({ name, otp, otp_expiry: otpExpiry }).where(eq(users.email, email));
    } else {
      console.log("⏳ Creating new unverified user record...");
      await db.insert(users).values({ name, email, otp, otp_expiry: otpExpiry, password: "" });
    }

    console.log("⏳ Sending OTP email via Nodemailer...");
    try {
      await sendOTPEmail(email, otp);
      console.log("🚀 OTP successfully sent via Email!");
    } catch (mailError) {
      console.error("⚠️ EMAIL FAILED, but here is your OTP for debugging:");
      console.log("👉 DEBUG OTP:", otp);
      console.log("Please read this OTP from the logs to continue.");
    }

    res.json({ success: true, message: "OTP sent (Check logs if email fails)" });
  } catch (error) {
    console.error("💥 CRITICAL ERROR IN SEND-OTP:");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    res.status(500).json({ 
      success: false,
      message: "Error sending OTP [V3]", 
      details: error.message,
      code: error.code 
    });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ message: "Missing fields" });

  try {
    const userResult = await db.select().from(users).where(eq(users.email, email));
    const user = userResult[0];

    if (!user || user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await db.update(users).set({ 
      password: password, // Plain text as per requirements
      is_verified: true,
      otp: null,
      otp_expiry: null
    }).where(eq(users.email, email));

    res.json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error during registration" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const userResult = await db.select().from(users).where(eq(users.email, email));
    const user = userResult[0];

    if (!user || !user.is_verified || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);

    res.cookie("token", token, {
      httpOnly: false, // As per requirements
      secure: false,   // As per requirements
      sameSite: "lax"  // As per requirements
    });

    res.json({ name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error during login" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
});

// GET /api/auth/me
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, role: req.user.role });
});

// --- AI Routes ---

// POST /api/ai/question
app.post("/api/ai/question", authenticateToken, async (req, res) => {
  const { complaint_text } = req.body;
  if (!complaint_text) return res.status(400).json({ message: "Complaint text required" });

  try {
    const question = await generateFollowUpQuestion(complaint_text);
    res.json({ question });
  } catch (error) {
    res.status(500).json({ message: "Error generating question" });
  }
});

// --- Complaint Routes ---

// POST /api/complaints
app.post("/api/complaints", authenticateToken, async (req, res) => {
  const { complaint_text, ai_question, ai_answer } = req.body;
  
  try {
    const newComplaint = await db.insert(complaints).values({
      userId: req.user.id,
      complaintText: complaint_text,
      aiQuestion: ai_question,
      userAnswer: ai_answer
    }).returning();

    res.json(newComplaint[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving complaint" });
  }
});

// GET /api/complaints/my
app.get("/api/complaints/my", authenticateToken, async (req, res) => {
  try {
    const userComplaints = await db.select().from(complaints).where(eq(complaints.userId, req.user.id));
    res.json(userComplaints);
  } catch (error) {
    res.status(500).json({ message: "Error fetching complaints" });
  }
});

// GET /api/admin/complaints
app.get("/api/admin/complaints", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Join complaints with users to get name/email
    const allComplaints = await db.select({
      id: complaints.id,
      complaintText: complaints.complaintText,
      aiQuestion: complaints.aiQuestion,
      userAnswer: complaints.userAnswer,
      created_at: complaints.created_at,
      userName: users.name,
      userEmail: users.email
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.userId, users.id));

    res.json(allComplaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching all complaints" });
  }
});

console.log('✅ SERVER STARTING WITH NEW STABLE DRIVER (PG)');
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
