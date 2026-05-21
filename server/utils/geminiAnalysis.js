import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeReviewsWithGemini(reviews, productName) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  if (!reviews || reviews.length === 0) {
    return {
      summary: "No reviews yet to analyze.",
      pros: [],
      cons: [],
      sentiment: "neutral",
      sentimentScore: 0,
      topFeatures: [],
      suggestion: "Be the first to review this product!",
    };
  }

  const reviewText = reviews
    .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): "${r.comment}"`)
    .join("\n");

  const prompt = `
You are an expert product review analyst for an e-commerce platform called "Spectra Commerce".
Analyze the following customer reviews for the product "${productName}" and return a JSON object.

Reviews:
${reviewText}

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "summary": "A 2-3 sentence overall summary of what customers think",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2"],
  "sentiment": "positive" | "mixed" | "negative",
  "sentimentScore": <number from 1 to 10>,
  "topFeatures": ["most mentioned feature 1", "feature 2"],
  "suggestion": "One actionable improvement suggestion for the seller"
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code blocks if present
  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  return JSON.parse(cleanText);
}
