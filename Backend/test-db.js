import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const { Pool } = pg;

console.log("🔍 Testing connection to:", process.env.DATABASE_URL?.split('@')[1]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const client = await pool.connect();
    console.log("✅ SUCCESS: Connected to the database!");
    const res = await client.query("SELECT NOW()");
    console.log("⏰ Server time:", res.rows[0].now);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ FAILED: Could not connect to database.");
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    process.exit(1);
  }
}

test();
