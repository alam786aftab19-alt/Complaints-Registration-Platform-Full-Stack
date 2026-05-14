import pg from "pg";
const { Client } = pg;
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

async function ping() {
  const client = new Client({
    user: "postgres.ukcajjfmvedeoykyelcj",
    password: "Aftab2026alam",
    host: "aws-1-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  console.log("📡 Checking for 'users' table...");
  try {
    await client.connect();
    const res = await client.query(`
      SELECT quote_ident(table_name) as ident, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("✅ Connection Successful!");
    console.log("Exact Table Names:", res.rows.map(r => r.table_name));
    
    if (res.rows.find(r => r.table_name === 'users')) {
      console.log("✅ 'users' table EXISTS!");
      try {
        console.log("⏳ Attempting the exact failing query...");
        const testQuery = await client.query(`
          select "id", "name", "email", "password", "role", "otp", "otp_expiry", "is_verified", "created_at" 
          from "users" 
          where "users"."email" = $1
        `, ["alam786aftab19@gmail.com"]);
        console.log("✅ Query SUCCESS!");
        console.log("Result Row Count:", testQuery.rowCount);
      } catch (queryErr) {
        console.error("❌ Exact Query FAILED!");
        console.error("Code:", queryErr.code);
        console.error("Message:", queryErr.message);
      }
    } else {
      console.log("❌ 'users' table MISSING!");
    }
    
    await client.end();
  } catch (err) {
    console.error("❌ Database connection failed!");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
  } finally {
    process.exit();
  }
}

ping();
