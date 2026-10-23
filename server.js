import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

// Render sits behind a proxy. Trust one proxy hop so rate limiting can
// use the original client IP. Review this setting if your hosting changes.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Non-browser clients may not send an Origin header. CORS is not authentication.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute and try again." }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "jarvis-backend" });
});

app.post("/ask", limiter, async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Please send a non-empty message." });
  }

  const cleanedMessage = message.trim();
  if (cleanedMessage.length > 2000) {
    return res.status(413).json({ error: "Message is too long. Keep it under 2000 characters." });
  }

  try {
    const result = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You are JARVIS, a helpful and calm AI assistant. Speak clearly and concisely, with a polished British-assistant style. Do not claim to control phone settings or apps unless the app has actually performed that action. Ask for confirmation before any consequential action.",
      input: cleanedMessage,
      max_output_tokens: 300
    });

    return res.json({ reply: result.output_text || "Sorry, I couldn't produce a reply." });
  } catch (error) {
    // Avoid returning provider details or secrets to the browser.
    console.error("OpenAI request failed:", error?.status || error?.name || "unknown error");
    if (error?.status === 429) {
      return res.status(429).json({ error: "The AI service is busy or its usage limit was reached. Please try again later." });
    }
    return res.status(502).json({ error: "JARVIS couldn't reach the AI service. Please try again shortly." });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.message === "Origin not allowed by CORS") {
    return res.status(403).json({ error: "This website origin is not allowed." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  console.error("Request error:", err?.name || "unknown error");
  return res.status(500).json({ error: "Unexpected server error." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`JARVIS backend listening on port ${port}`);
});
