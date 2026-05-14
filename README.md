# Complaints Registration Platform

A full-stack platform where users can submit complaints, get AI-generated follow-up questions to clarify their issues, and admins can review all submissions.

## Setup Instructions

### 1. Backend Setup
1. Navigate to the `Backend` directory.
2. Open the `.env` file and fill in your credentials:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `GMAIL_USER`: Your Gmail address.
   - `GMAIL_PASS`: Your Gmail App Password (not your regular password).
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `JWT_SECRET`: Any random string for token signing.
3. Run `npm install` (if not already done).
4. Run `npm run dev` to start the server on `http://localhost:3000`.

### 2. Frontend Setup
1. Navigate to the `Frontend` directory.
2. Open `index.html` using a local server (e.g., Live Server in VS Code).
3. Ensure the frontend is running on `http://127.0.0.1:5500` (or update the `FRONTEND_URL` in the Backend `.env` if using a different port).

## Features
- **OTP Verification**: Secure registration via email.
- **AI Clarification**: Uses Gemini to ask a relevant follow-up question for every complaint.
- **Admin Role**: Admins can see all complaints; regular users only see their own.
- **Modern UI**: Glassmorphic design with smooth transitions and responsive layout.

## Database Note
- The system uses **Drizzle ORM**. On first run, ensure your Supabase database is reachable.
- To promote a user to admin, manually change their `role` to `'admin'` in the `users` table in your database.
