import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DAILY_LIMIT = 3;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id as string;
    const tenantId = user.tenantId as string;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured. Please set up your Gemini API key." },
        { status: 503 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate mime type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCount = await db.chartAnalysis.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    });

    if (todayCount >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: "Daily limit reached. Upgrade to Pro for unlimited.", remaining: 0 },
        { status: 429 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert technical chart analyst for trading. Analyze the provided chart image and return a JSON object with the following structure. Be precise and specific.

{
  "pattern": "Name of the chart pattern identified (e.g., Bull Flag, Head and Shoulders, Double Bottom)",
  "direction": "LONG" or "SHORT" or "NEUTRAL",
  "confidence": number between 0-100,
  "timeframe": "Detected timeframe (e.g., 1H, 4H, Daily)",
  "strategy": "Brief 1-sentence strategy recommendation",
  "signals": ["Array of key signals observed, e.g., 'RSI Oversold', 'MACD Crossover', 'Volume Spike'"],
  "entry": number (suggested entry price),
  "stopLoss": number (suggested stop loss price),
  "takeProfits": [number, number, number] (three take profit targets: TP1, TP2, TP3),
  "riskReward": "Risk:Reward ratio as string, e.g., '1:2.5'",
  "supportResistance": {
    "support": [number, number] (key support levels),
    "resistance": [number, number] (key resistance levels)
  },
  "explanation": "Detailed 3-5 sentence explanation of the analysis",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."] (actionable steps for the trader),
  "commonMistakes": ["Mistake 1", "Mistake 2"] (common mistakes to avoid with this setup)
}

Return ONLY the JSON object, no markdown, no code fences, no extra text.`,
                },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 3000,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json(
        { error: "Could not analyze this image. Please upload a clear chart screenshot." },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse the JSON response
    let analysis;
    try {
      // Strip potential markdown code fences
      const cleaned = rawText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return NextResponse.json(
        { error: "Could not analyze this image. Please upload a clear chart screenshot." },
        { status: 502 }
      );
    }

    // Save to database
    const saved = await db.chartAnalysis.create({
      data: {
        userId,
        tenantId,
        imageName: file.name,
        result: analysis,
        pattern: analysis.pattern ?? null,
        direction: analysis.direction ?? null,
        confidence: typeof analysis.confidence === "number" ? analysis.confidence : null,
      },
    });

    // Calculate remaining
    const remaining = DAILY_LIMIT - (todayCount + 1);

    return NextResponse.json({
      id: saved.id,
      analysis,
      remaining,
      limit: DAILY_LIMIT,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// GET: Fetch analysis history for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const user = session.user as any;
    const userId = user.id as string;

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

    const analyses = await db.chartAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        pattern: true,
        direction: true,
        confidence: true,
        imageName: true,
        result: true,
        createdAt: true,
      },
    });

    // Get today's remaining count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await db.chartAnalysis.count({
      where: { userId, createdAt: { gte: todayStart } },
    });

    return NextResponse.json({
      analyses,
      remaining: Math.max(0, DAILY_LIMIT - todayCount),
      limit: DAILY_LIMIT,
    });
  } catch (error) {
    console.error("Fetch analyses error:", error);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 }
    );
  }
}
