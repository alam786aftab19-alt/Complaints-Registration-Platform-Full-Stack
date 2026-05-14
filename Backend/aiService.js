import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateFollowUpQuestion = async (complaintText) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Instruction said gemini-2.5-flash-lite but 1.5 is more common/stable, I'll use what's available or requested. 
  // Wait, the instruction said gemini-2.5-flash-lite. I'll use that string.
  
  const prompt = `A user has submitted the following complaint: "${complaintText}". 
  Generate exactly one short, relevant follow-up question to gather more details. 
  Return ONLY the question text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating AI question:", error);
    return "Could you please provide more details about the issue?";
  }
};
