import express from "express";
import cors from "cors";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini with Nparte Project Secret
const NPARTE_PROJECT_KEY = "AQ.Ab8RN6K4piF0fe3XpWD73Bi9sJfouwPM2V2Sv9J7DggpwJBmqw";

function getValidKeys(): string[] {
  const keys: string[] = [];
  const primary = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const backup2 = (process.env.GEMINI_API_KEY_2 || "").trim();
  const backup3 = (process.env.GEMINI_API_KEY_3 || "").trim();

  if (primary && primary !== "undefined" && primary !== "null") keys.push(primary);
  if (backup2 && backup2 !== "undefined" && backup2 !== "null") keys.push(backup2);
  if (backup3 && backup3 !== "undefined" && backup3 !== "null") keys.push(backup3);
  if (!keys.includes(NPARTE_PROJECT_KEY)) keys.push(NPARTE_PROJECT_KEY);

  return keys;
}

function getApiKey(): string {
  const keys = getValidKeys();
  return keys[0] || NPARTE_PROJECT_KEY;
}

function getAi(apiKey?: string) {
  const key = apiKey || getApiKey();
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Endpoint to provide the active project API keys to client
app.get("/api/key", (_req, res) => {
  const keys = getValidKeys();
  res.json({ 
    apiKey: keys[0] || NPARTE_PROJECT_KEY,
    apiKey2: (process.env.GEMINI_API_KEY_2 || "").trim(),
    apiKey3: (process.env.GEMINI_API_KEY_3 || "").trim(),
    allKeys: keys
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const aiInstance = getAi();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: "You are a helpful AI assistant that can chat with the user.",
      },
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "An error occurred while processing your request.", details: error.message });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "3:4", modelName = "gemini-3.1-flash-lite-image" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 1. Try Gemini image model if user has paid access
    try {
      const aiInstance = getAi();
      const geminiRes = await aiInstance.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "1K"
          }
        }
      });
      const part = geminiRes.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (part?.inlineData?.data) {
        return res.json({ 
          imageUrl: `data:image/jpeg;base64,${part.inlineData.data}`,
          source: 'gemini'
        });
      }
    } catch (geminiErr: any) {
      console.warn("[Server Image] Gemini direct generation not available, using Nano Banana free engine:", geminiErr.message);
    }

    // 2. High-speed Nano Banana Free Engine (Pollinations AI) - No API Key Needed!
    let width = 768;
    let height = 1024;
    switch (aspectRatio) {
      case "16:9": width = 1024; height = 576; break;
      case "9:16": width = 576; height = 1024; break;
      case "3:4": width = 768; height = 1024; break;
      case "4:3": width = 1024; height = 768; break;
      case "1:1": default: width = 1024; height = 1024; break;
    }

    // Sanitize and condense prompt to prevent URL length limits
    const cleanPrompt = String(prompt)
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 450);

    const seed = Math.floor(Math.random() * 1000000000);
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    const imgResponse = await fetch(fallbackUrl);
    if (!imgResponse.ok) {
      throw new Error(`Nano Banana service returned status: ${imgResponse.status}`);
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return res.json({
      imageUrl: `data:image/jpeg;base64,${base64}`,
      source: 'nanobanana'
    });
  } catch (error: any) {
    console.error("[Server Image] Error:", error);
    return res.status(500).json({ error: "Failed to generate image: " + error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  import("vite").then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
