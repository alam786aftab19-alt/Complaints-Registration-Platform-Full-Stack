import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateFollowUpQuestion = async (complaintText) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 
  
  const prompt = `A user has submitted the following complaint: "${complaintText}". 
  Generate exactly one short, relevant follow-up question to gather more details. 
  Return ONLY the question text.`;

  try {
    console.log("🤖 Asking Gemini for a follow-up question...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    console.log("✅ AI Response received:", text);
    return text;
  } catch (error) {
    console.error("❌ GEMINI API ERROR:", error.message);
    // Return a default question so the user can still use the app
    return "Could you please provide more details about the issue?";
  }
};
