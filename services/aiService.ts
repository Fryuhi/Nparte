import { GoogleGenAI, HarmCategory, HarmBlockThreshold, ThinkingLevel } from "@google/genai";
import { 
  Novel, 
  GlobalConfig, 
  ThinkingLevelOption, 
  SafetySettingsConfig, 
  SafetyThreshold, 
  DEFAULT_SAFETY_SETTINGS, 
  getEffectiveThinkingLevel, 
  getSupportedThinkingLevels,
  GenerationDebugInfo,
  StoryProgressionState
} from "../types";
import { summarizeChapterDeterministic } from "./memoryService";
import { 
  extractStoryBeats, 
  initializeProgressionState, 
  updateProgressionState, 
  validateStoryBoundaries, 
  repairOversizedChapter,
  repairPrematureEnding
} from "./storyProgressionEngine";
import { generationStore } from "./generationStore";
import { isLiteModel, generateChapterLite } from "./lite";
export * from "./lite";
export {
  NPARTE_PROJECT_KEY,
  getGlobalApiKey,
  rotateToNextApiKey,
  getAvailableGeminiKeyEntries,
  getAvailableGeminiApiKeys,
  type GeminiKeyEntry
} from "./apiKeyService";
import {
  getGlobalApiKey,
  rotateToNextApiKey,
  getAvailableGeminiApiKeys
} from "./apiKeyService";

// --- CONFIGURATION ---

const MODEL_CONFIGS: Record<string, { window: number; safety: number }> = {
  "gemini-3.8-flash": { window: 1000000, safety: 8000 },
  "gemini-3.7-flash": { window: 1000000, safety: 8000 },
  "gemini-3.6-flash": { window: 1000000, safety: 8000 },
  "gemini-3.5-flash": { window: 1000000, safety: 8000 },
  "gemini-3.5-flash-lite": { window: 1000000, safety: 8000 },
  "gemini-3.1-flash-lite": { window: 1000000, safety: 8000 },
  "gemini-3.1-pro-preview": { window: 1000000, safety: 8000 },
  "gemini-3-flash-preview": { window: 1000000, safety: 8000 },
  "gemini-3.0-flash": { window: 1000000, safety: 8000 },
  default: { window: 1000000, safety: 8000 },
};

// --- SYSTEM INSTRUCTION ARCHITECTURE (GOOGLE AI STUDIO STYLE) ---

/**
 * Builds the primary system instruction passed directly to Gemini API's systemInstruction parameter.
 * Mimics Google AI Studio's "System Instructions" field:
 * The user's Global System Instructions / System Persona is the PRIMARY and dominant guiding instruction.
 * Internal directives are kept minimal, sharp, and lightweight so reasoning is never overloaded.
 */
export const buildSystemInstruction = (
  globalConfig: GlobalConfig,
  novel?: Novel
): string => {
  const parts: string[] = [];

  // 1. PRIMARY SYSTEM INSTRUCTIONS / MULTI-PERSONAS
  // System persona only applies when configured and activated in Global Settings
  const activePresets = (globalConfig.instructionPresets || []).filter(
    (p) => p.active === true && p.content?.trim()
  );

  if (activePresets.length > 0) {
    activePresets.forEach((p) => {
      parts.push(`[SYSTEM PERSONA: ${p.name}]\n${p.content.trim()}`);
    });
  } else if (globalConfig.customInstruction?.trim()) {
    parts.push(globalConfig.customInstruction.trim());
  }

  // 2. USER WRITING STYLES (High Priority Mandatory Directives)
  if (globalConfig.styles && globalConfig.styles.length > 0) {
    const rules = globalConfig.styles
      .map((s) => s.rule.trim())
      .filter(Boolean)
      .map((r) => `- ${r}`)
      .join("\n");
    if (rules) {
      parts.push(`[MANDATORY STYLE GUIDELINES]\n${rules}`);
    }
  }

  // 3. CORE REALISM & ANTI-AI WRITING DIRECTIVES (MANDATORY SYSTEM-LEVEL CODE)
  parts.push(`[CORE REALISM & ANTI-AI WRITING DIRECTIVES]
You write strictly as a contemporary cinematic screenwriter and realist novelist. You MUST obey these 5 core rules at all times:

1. DIALOG "BERANTAKAN" DAN REALISTIS:
Manusia asli tidak berbicara dengan tata bahasa baku yang kaku. Gunakan bahasa sehari-hari, kasual, atau slang sesuai karakter. Karakter harus menggunakan kata seru (eh, oh, hmm), partikel alami (sih, dong, deh, kok, kan), keraguan, kalimat tidak selesai/terpotong, atau saling memotong pembicaraan. DILARANG membuat monolog panjang yang dramatis atau puitis.

2. DAFTAR KATA TERLARANG (BANNED CLICHÉ WORDS):
DILARANG KERAS menggunakan kosakata klise AI berikut atau sinonimnya:
- "simfoni", "permadani", "merajut", "tarian", "tak tergoyahkan", "pada akhirnya", "sebuah kesaksian", "nuansa", "tak bisa dimungkiri", "bagai", "bak", "menyelami", atau metafora alam yang berlebihan.
Gunakan bahasa yang lugas, tajam, konkret, dan langsung.

3. SHOW, DON'T TELL:
Jangan pernah mendeskripsikan emosi karakter secara langsung (misal: "Budi merasa sangat sedih dan marah"). Tunjukkan emosi murni melalui tindakan fisik, reaksi tubuh, tatapan, ritme napas, tarikan otot, atau carut-marut dialognya (misal: "Budi melempar kunci motor ke meja, napasnya memburu").

4. TANPA PESAN MORAL DAN KESIMPULAN:
DILARANG merangkum cerita di paragraf terakhir dengan pesan moral, hikmah, atau kalimat bijak. Akhiri bab secara natural, tiba-tiba, atau di tengah tindakan/percakapan biasa layaknya potongan kehidupan nyata (*slice of life* / *cinema verite*).

5. STRUKTUR PARAGRAF ASIMETRIS:
Hindari paragraf yang panjang dan beraturan. Variasikan panjang kalimat secara dinamis. Gunakan kalimat pendek yang hanya terdiri dari satu atau dua kata untuk memberikan ketegangan, detak ritme, atau jeda realistis.

[OUTPUT PROTOCOLS]
- Pure Story Manuscript Output: Output pure novel narrative prose ONLY. STRICTLY FORBIDDEN to include conversational greetings, chat openings, or persona salutations (e.g., NEVER write "Hey", "Hello", "Sure!", "Tentu", persona nicknames, or action asterisks like *smiles*).
- ZERO META RITUALS & REFLECTIONS: Strictly forbidden to output persona mantras, internal reflection audits, self-assessments, or meta conversational preambles.
- Zero Meta / Thinking Leakage: Never output thinking protocols, reasoning traces, or author chatter in the text. The very first character of your response MUST BE the opening word of the novel's narrative prose.
- Never write chapter title headers (e.g. "**Chapter 1**") inside the story body. Start directly with the prose.
- Pure Fiction & Creative Commitment: Faithfully execute the author's creative prompt, emotional stakes, drama, and narrative intensity without moralizing or self-censorship.
- Formatting: Clean Markdown.`);

  // 4. NOVEL MODE SPECIFIC DIRECTIVE (if applicable)
  if (novel?.type === "fixing") {
    parts.push(`[MODE DIRECTIVE: FIXING & REFINEMENT]\nRefine and polish the provided text or scene. Enhance grammar, flow, and narrative quality while preserving the core intent and length.`);
  } else if (novel?.type === "fanfic") {
    parts.push(`[MODE DIRECTIVE: FANFICTION]\nStrictly adhere to the established World Lore and universe rules provided in the context.`);
  }

  return parts.join("\n\n");
};

// --- STATE MANAGEMENT ---

const novelLocks = new Map<string, boolean>();

// --- HELPERS ---

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.5);

// --- SMART CONTEXT BUILDER ---

export const buildSmartContext = (
  novel: Novel,
  globalConfig: GlobalConfig,
  modelId: string,
): { systemInstruction: string; baseContext: string } => {
  const config = MODEL_CONFIGS[modelId] || MODEL_CONFIGS["default"];
  const tokenLimit = config.window - config.safety;

  // 1. Primary System Instruction (Google AI Studio model)
  const systemInstruction = buildSystemInstruction(globalConfig, novel);

  // 2. Story Context & Canon Knowledge (injected into prompt context)
  let storyContext = "";

  if (novel.type === "fanfic" && novel.worldLore?.trim()) {
    storyContext += `=== WORLD LORE (CANONICAL FOUNDATION) ===\n${novel.worldLore.trim()}\n=========================================\n\n`;
  }

  if (novel.loreLockEnabled && novel.loreDatabase) {
    const l = novel.loreDatabase;
    const charList = (l.characters || [])
      .map((c) => `- ${c.name} (${[c.gender, c.age].filter(Boolean).join(", ") || "Unknown"}): ${c.appearance || "N/A"}. Goals: ${c.goals || "N/A"}. Status: ${c.currentStatus || "N/A"}`)
      .join("\n");

    storyContext += `=== LORE LOCK DATABASE (STORY CANON) ===
[Full Story Synopsis]: ${l.fullLoreSummary || "N/A"}

[Characters]:
${charList || "None recorded."}

[World Rules & Locations]:
Locations: ${l.world?.locations || "N/A"}
Factions: ${l.world?.factions || "N/A"}
Rules & Laws: ${l.world?.rules || "N/A"}
=========================================\n\n`;
  }

  const staticCost = estimateTokens(systemInstruction) + estimateTokens(storyContext);
  const remainingBudget = tokenLimit - staticCost;

  // 3. Chapter History (Smart Compression if exceeds budget)
  let historyText = "";
  const fullHistoryStr = novel.chapters
    .map((c, i) => `--- [BAB ${i + 1}: ${c.title}] ---\n${c.content}`)
    .join("\n\n");

  if (estimateTokens(fullHistoryStr) <= remainingBudget) {
    historyText = fullHistoryStr;
  } else {
    // Compressed Mode for long novels
    const reversedChapters = [...novel.chapters].reverse();
    let builtText = "";
    let i = 0;

    // Keep most recent chapters in full text
    for (; i < reversedChapters.length; i++) {
      const c = reversedChapters[i];
      const chapText = `--- [BAB ${novel.chapters.length - i}: ${c.title}] ---\n${c.content}\n\n`;
      const cost = estimateTokens(chapText);

      if (estimateTokens(builtText) + cost > remainingBudget * 0.8) {
        break;
      }
      builtText = chapText + builtText;
    }

    // Summarize older chapters
    const summaries: string[] = [];
    for (; i < reversedChapters.length; i++) {
      const c = reversedChapters[i];
      const chapNum = novel.chapters.length - i;

      let summaryContent = "";
      const loreSum = novel.loreDatabase?.chapterSummaries?.find(
        (s) => s.chapterNumber === chapNum,
      );
      if (novel.loreLockEnabled && loreSum) {
        summaryContent = `${loreSum.shortSummary} (Key Events: ${loreSum.keyEvents})`;
      } else {
        summaryContent = summarizeChapterDeterministic(c.content);
      }

      summaries.unshift(`[LOG BAB ${chapNum}]: ${summaryContent}`);
    }

    historyText = `[RINGKASAN KEJADIAN LAMPAU]:\n${summaries.join("\n")}\n\n[KEJADIAN TERKINI (FULL TEXT)]:\n${builtText}`;
  }

  const baseContext = `${storyContext}=== ARSIP CERITA SEJAUH INI ===\n${historyText || "Belum ada bab sebelumnya. Ini adalah awal cerita."}`;

  return { systemInstruction, baseContext };
};

// --- GEMINI & NANO BANANA API EXECUTOR (Image Generation) ---

export const generateNovelImage = async (
  prompt: string,
  modelName: "gemini-3.1-flash-lite-image" | "gemini-3.1-flash-image" | "gemini-3-pro-image" = "gemini-3.1-flash-lite-image",
  aspectRatio: "1:1" | "16:9" | "9:16" | "3:4" | "4:3" = "3:4",
  _attempt: number = 1
): Promise<string> => {
  // 1. Primary Strategy: Call local backend endpoint (/api/generate-image)
  // This bypasses browser CORS and sandbox restrictions, works with or without paid Gemini keys!
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio, modelName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        return data.imageUrl;
      }
    }
  } catch (apiErr) {
    console.warn("[Image API] Server proxy unreachable, trying direct client runner:", apiErr);
  }

  // 2. Client-side Strategy: Try Gemini direct if key exists
  try {
    const ai = new GoogleGenAI({
      apiKey: getGlobalApiKey(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    const base64 = part?.inlineData?.data;
    if (base64) {
      return `data:image/jpeg;base64,${base64}`;
    }
  } catch (geminiErr: any) {
    console.warn("[Image] Gemini client direct failed (expected if unpaid key), activating Nano Banana free engine:", geminiErr?.message);
  }

  // 3. Guaranteed Free Fallback: Direct Nano Banana (Pollinations AI) - Zero API Key Needed
  try {
    let width = 768;
    let height = 1024;
    switch(aspectRatio) {
      case "16:9": width = 1024; height = 576; break;
      case "9:16": width = 576; height = 1024; break;
      case "3:4": width = 768; height = 1024; break;
      case "4:3": width = 1024; height = 768; break;
      case "1:1": default: width = 1024; height = 1024; break;
    }
    
    // Condense prompt to avoid HTTP 414 URL Too Long
    const cleanPrompt = String(prompt)
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);

    const seed = Math.floor(Math.random() * 1000000000);
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
    
    const res = await fetch(fallbackUrl);
    if (!res.ok) throw new Error(`Pollinations status ${res.status}`);
    const blob = await res.blob();
    
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (fallbackErr) {
    console.warn("[Image] Direct client fetch failed, returning styled standalone graphic:", fallbackErr);
    // 4. Bulletproof Fallback: Generate an SVG data-URI so UI NEVER crashes!
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b"/>
          <stop offset="50%" stop-color="#312e81"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="768" height="1024" fill="url(#g)"/>
      <circle cx="384" cy="450" r="180" fill="#4338ca" opacity="0.3"/>
      <text x="384" y="470" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">NANO BANANA ILLUSTRATION</text>
      <text x="384" y="520" font-family="sans-serif" font-size="16" fill="#a5b4fc" text-anchor="middle">Masterpiece Light Novel Cover</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
};

export const extractCoverPrompt = async (
  title: string,
  synopsis: string,
  loreDatabase?: any,
  artStyle: string = "anime",
  modelId: string = "gemini-3.6-flash"
): Promise<string> => {
  let loreContext = "";
  if (loreDatabase) {
    if (loreDatabase.world) {
      loreContext += `World Lore: ${loreDatabase.world.locations || ""} ${loreDatabase.world.factions || ""}\n`;
    }
    if (loreDatabase.characters && loreDatabase.characters.length > 0) {
      loreContext += `Main Characters:\n`;
      loreDatabase.characters.slice(0, 3).forEach((c: any) => {
        loreContext += `- ${c.name}: ${c.appearance}\n`;
      });
    }
  }

  let artStyleInstructions = "";
  if (artStyle === 'real-tion') {
    artStyleInstructions = `
- Art Style: "Real-Tion" (Semi-Realistic Mature Web Novel / Professional Concept Art).
- Design the cover as if it were a premium, officially published Korean web novel or a mature dark fantasy/seinen illustration.
- Characters: Semi-realistic proportions, sharp and mature facial features, intense expressions, and highly detailed rendering. Avoid oversized anime eyes, exaggerated anime tropes, or cartoonish proportions.
- Rendering: Masterful digital painting combining realism with stylized fiction. Rich textures, sophisticated brushwork, and a serious, dramatic, adult tone (resembling high-end webtoon covers like Solo Leveling or Omniscient Reader).
- Lighting: Cinematic and highly atmospheric. Use dramatic contrast, realistic shadows, depth of field, and rim lighting to create a grounded yet epic mood.
- CRITICAL: Absolutely NO cartoonish features, goofy expressions, flat cartoon shading, or western animation styles. It must feel strictly mature, semi-realistic, and exquisitely painted.`;
  } else if (artStyle === 'ghibli') {
    artStyleInstructions = `- Art Style: Studio Ghibli inspired. Hand-drawn anime aesthetic, soft watercolor backgrounds, highly detailed and nostalgic.`;
  } else if (artStyle === 'retro') {
    artStyleInstructions = `- Art Style: 90s Retro Anime (e.g., Sailor Moon, Evangelion). Cel shading, slightly faded VHS colors, distinct 90s character designs.`;
  } else if (artStyle === 'manga') {
    artStyleInstructions = `- Art Style: Highly detailed monochrome Manga cover. High contrast ink, screentones, dynamic shading.`;
  } else {
    artStyleInstructions = `- Art Style: Premium modern Anime/Light Novel style. Vivid colors, dynamic composition, high quality rendering.`;
  }

  const fullPrompt = `You are a visionary art director for a premium light novel. Based on the novel's title, synopsis, and provided lore, write a single highly detailed, intensely creative visual prompt (in English) to be used for generating the novel's cover image.

Crucially, transcend generic or flat cover tropes. The cover must be profoundly artistic, capturing the philosophical depth, subtext, and raw emotion of the story. 
Use dynamic, unconventional, or deeply symbolic character poses (e.g., reaching toward a shattered reflection, floating in a surreal void, dramatic foreshortening, intertwined with symbolic elements, or gazing from a dizzying perspective). Avoid stiff, straight-on, "passport-style" or boring standing poses.

The prompt should describe:
1. Dynamic & Artistic Character Poses: (Needs movement, emotion, or abstract symbolism)
2. Immersive Setting & Surreal/Thematic Elements: (Environment interwoven with the story's themes)
3. Philosophical Mood & Cinematic Lighting: (Play of light/shadow, evocative atmosphere)

CRUCIAL: You MUST include the following Cover Design Instructions in your output prompt so the image generator follows them:
- Display the novel title ("${title}") using elegant, authentic Korean Hangul typography. Render every Hangul character clearly and legibly.
- The title should occupy roughly the lower third of the cover.
- Title styling should include subtle combinations of: layered typography, elegant gradients, soft glow, slight bevel/embossed depth, and decorative flourishes (like floral ornaments, magical circles, or sparkles) without distracting from the characters.
- Characters remain the primary visual focus. Create a balanced visual hierarchy.
${artStyleInstructions}
- Avoid: plain typography, flat text, oversized text, watermark-like appearance, empty backgrounds, cluttered layouts, generic standing poses, and stiff/boring compositions.

Focus purely on visual descriptions. Do not include instructions or extra text.
Title: ${title}
Synopsis: ${synopsis || "N/A"}
${loreContext}
Return ONLY the prompt string.`;

  try {
    const textResponse = await callAIStoryRouter(
      modelId,
      fullPrompt,
      0.7
    );
    return textResponse?.trim() || synopsis || title;
  } catch (err) {
    console.warn(`[Cover Prompt] Model ${modelId} failed, using automatic high-aesthetic fallback:`, err);
    // Graceful automatic prompt fallback so user never gets blocked by API key errors!
    const stylePrefix = artStyle === 'real-tion' 
      ? 'Semi-realistic Korean web novel cover art, dramatic cinematic lighting, masterpiece.' 
      : 'Masterpiece Japanese light novel anime cover illustration, highly detailed, beautiful lighting.';
    return `${stylePrefix} Title: "${title}". Story premise: ${synopsis ? synopsis.slice(0, 200) : title}. Exquisite character design, captivating composition, stunning visual storytelling, ultra high quality digital painting.`;
  }
};

export interface IllustrationAnalysisResult {
  identifiedCharacters: {
    name: string;
    appearance: string;
    traitsInScene?: string;
  }[];
  sceneSummary: string;
  lightingAndMood: string;
  visualPrompt: string;
  suggestedAspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
}

export const extractIllustrationPrompt = async (
  selectedSnippet: string,
  novelTitle: string,
  chapterTitle?: string,
  loreDatabase?: any,
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '3:4',
  modelId: string = 'gemini-3.6-flash'
): Promise<IllustrationAnalysisResult> => {
  let loreCharactersContext = "None available";
  let loreWorldContext = "None available";

  if (loreDatabase) {
    if (loreDatabase.characters && loreDatabase.characters.length > 0) {
      loreCharactersContext = loreDatabase.characters
        .map(
          (c: any) =>
            `- ${c.name} (${c.gender || "unknown"}, ${c.age || "unknown"}): Appearance="${c.appearance || "N/A"}", Current Status="${c.currentStatus || "N/A"}"`
        )
        .join("\n");
    }
    if (loreDatabase.world) {
      loreWorldContext = `Locations: ${loreDatabase.world.locations || "N/A"}, Factions/Rules: ${loreDatabase.world.rules || "N/A"}`;
    }
  }

  const prompt = `You are a world-class light novel anime art director and prompt engineer for an elite painterly anime image generator (Nano Banana 2 Lite).
Analyze the highlighted text snippet from the novel chapter, cross-check characters against the provided Lore Lock database, and formulate an exquisite image prompt that captures the scene.

=== NOVEL CONTEXT ===
Novel Title: "${novelTitle}"
Chapter Title: "${chapterTitle || "Chapter"}"

=== LORE LOCK DATABASE (CANONICAL TRUTH) ===
Characters in Lore Lock:
${loreCharactersContext}

World & Setting Lore:
${loreWorldContext}

=== HIGHLIGHTED SCENE SNIPPET (USER SELECTED) ===
"${selectedSnippet}"

=== MANDATORY STYLE GUIDE (EXACT REFERENCE AESTHETIC - DO NOT DEVIATE) ===
The generated image MUST strictly adopt the following visual DNA:
1. Art Medium: Masterpiece Japanese light novel illustration and painterly anime digital artwork. Delicate, highly defined anime lineart seamlessly integrated with rich, textured painterly brushstrokes.
2. Character Design: High-appeal, expressive mature anime aesthetics. Exquisite anime eyes with luminous light reflections and nuanced emotional depth, delicate nose/mouth, beautifully rendered layered hair with loose painterly strands that catch specular highlights, accurate and grounded anatomy.
3. Lighting & Atmosphere: Cinematic volumetric lighting with high dynamic range. Dramatic atmospheric light source (e.g. warm golden hour sunset rim lighting against cool urban shadows, luminous ethereal blue/violet glow from a glowing crystal ball or magical focus, serene silvery moonlight cascading through tall gothic stained-glass cathedral windows, radiant sun rays filtering through lush overgrown ancient jungle ruins, or glowing golden particles/origami cranes).
4. Color Harmony: Sophisticated, rich color palette with intentional temperature contrast (deep sapphire navy and vibrant lavender, warm honey amber and teal, emerald forest greens with soft ivory sunlight).
5. Composition: Cinematic storytelling perspective with immersive depth of field, natural foreground framing elements, textured background ambiance.
6. Negative Directives: Strictly avoid 3D CGI plastic doll renders, generic western cartoons, flat vector clipart, distorted anatomy, messy scribbles, flat uninspired lighting, and watermark/text overlays.

=== INSTRUCTIONS ===
1. Scan the snippet and identify ALL characters present or depicted.
2. Check each identified character against the Lore Lock. If found, lock their exact physical features (hair color & style, eye color, age, gender, signature clothing and items). If not in Lore Lock, define high-appeal anime traits consistent with the text.
3. Determine the EXACT core action, pose, posture, and emotional expression from the snippet. CRITICAL: You MUST construct the prompt to enforce the EXACT pose, action, and activity described in the text. Do NOT invent, hallucinate, or alter the pose or action. The image must be as accurate as possible to the text.
4. Construct a vivid, comprehensive English image generation prompt (120-200 words) that describes the scene, subjects, composition, atmospheric lighting, and the exact painterly anime masterpiece style. Place the exact character pose and action prominently at the beginning of the prompt to ensure the image generator prioritizes it.
5. Return strictly valid raw JSON without extra commentary.

JSON Output Schema:
{
  "identifiedCharacters": [
    {
      "name": "Character Name",
      "appearance": "Canonical appearance locked from Lore Lock (or inferred if new)",
      "traitsInScene": "Clothing and state in this specific snippet"
    }
  ],
  "sceneSummary": "Brief 1-sentence description of what is happening in the scene",
  "lightingAndMood": "Description of the lighting, atmosphere, and color palette",
  "visualPrompt": "The complete, detailed English prompt for the image generator",
  "suggestedAspectRatio": "${aspectRatio}"
}
`;

  try {
    const textResponse = await callAIStoryRouter(
      modelId,
      prompt,
      0.2,
      undefined,
      undefined,
      "You are a precise JSON-emitting anime art director assistant. Output ONLY valid JSON matching the requested schema.",
      false
    );

    let result = textResponse?.trim() || "{}";
    const match = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      result = match[1];
    } else {
      result = result.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "");
    }

    const parsed = JSON.parse(result) as IllustrationAnalysisResult;
    if (!parsed.visualPrompt) {
      throw new Error("Visual prompt missing from model response");
    }
    return parsed;
  } catch (err: any) {
    console.warn(`[Illustration Prompt] Extraction error with ${modelId}:`, err);
    // Graceful fallback if JSON parsing fails
    return {
      identifiedCharacters: [],
      sceneSummary: selectedSnippet.slice(0, 100),
      lightingAndMood: "Cinematic atmospheric anime lighting, painterly light novel masterpiece",
      visualPrompt: `Masterpiece Japanese light novel illustration, painterly anime digital art style. Scene: ${selectedSnippet}. Rich textured brushwork, cinematic volumetric lighting, beautiful anime character design, intricate luminous eyes, atmospheric background with depth of field, high aesthetic quality, masterpiece.`,
      suggestedAspectRatio: aspectRatio
    };
  }
};

export const generateWorldLore = async (
  prompt: string,
  modelId: string = "gemini-3.6-flash"
): Promise<string> => {
  const systemPrompt = `You are a world-building expert. The user will provide a concept or existing fictional universe. Your task is to generate a comprehensive, highly detailed "World Lore" document that can be used as a strict foundation for writing fanfiction.
Include sections for:
1. Overview & General Rules (magic systems, physics, societal norms)
2. Major Locations & Geography
3. Key Factions, Groups & Politics
4. Important Characters (Names, appearances, personalities, roles)
5. Recent Important Events or History

Keep it concise but packed with specific details. Use markdown formatting.`;

  return await callAIStoryRouter(
    modelId,
    `Concept: ${prompt}`,
    0.7,
    undefined,
    undefined,
    systemPrompt,
    true
  );
};

export const mapSafetyThreshold = (threshold?: SafetyThreshold | string): HarmBlockThreshold => {
  switch (threshold) {
    case 'BLOCK_ONLY_HIGH':
      return HarmBlockThreshold.BLOCK_ONLY_HIGH;
    case 'BLOCK_MEDIUM_AND_ABOVE':
      return HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
    case 'BLOCK_LOW_AND_ABOVE':
      return HarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
    case 'OFF':
    default:
      return HarmBlockThreshold.OFF;
  }
};

export const mapThinkingLevel = (level?: ThinkingLevelOption | string): ThinkingLevel | undefined => {
  if (!level) return undefined;
  const upper = level.toUpperCase();
  if (upper === 'MINIMAL') return ThinkingLevel.MINIMAL;
  if (upper === 'LOW') return ThinkingLevel.LOW;
  if (upper === 'MEDIUM') return ThinkingLevel.MEDIUM;
  if (upper === 'HIGH') return ThinkingLevel.HIGH;
  return undefined;
};

// --- GEMINI API EXECUTOR (Story Specialized) ---

const callGeminiStory = async (
  modelName: string,
  fullPrompt: string,
  temperature: number = 0.7,
  signal?: AbortSignal,
  attempt: number = 1,
  onChunk?: (text: string) => void,
  systemInstruction: string = "",
  _highThinkingMode: boolean = false,
  thinkingLevel?: ThinkingLevelOption,
  safetySettings?: SafetySettingsConfig,
): Promise<string> => {
  let actualModelName = modelName;
  if (
    actualModelName === "gemini-1.5-flash" ||
    actualModelName === "gemini-flash" ||
    actualModelName === "gemini-flash-lite"
  ) {
    actualModelName = "gemini-3.6-flash";
  } else if (
    actualModelName === "gemini-1.5-pro" ||
    actualModelName === "gemini-pro"
  ) {
    actualModelName = "gemini-3.1-pro-preview";
  }

  // 1. Inisialisasi client Gemini dengan API Key & User-Agent header
  const ai = new GoogleGenAI({
    apiKey: getGlobalApiKey(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  // Immediate abort check
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const abortPromise = new Promise<never>((_, reject) => {
    if (signal?.aborted) reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });

  try {
    // 2. Safety settings mapping from config or DEFAULT_SAFETY_SETTINGS (which defaults to OFF)
    const activeSafety = safetySettings || DEFAULT_SAFETY_SETTINGS;
    const safetyList = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: mapSafetyThreshold(activeSafety.harassment) },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: mapSafetyThreshold(activeSafety.hate) },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: mapSafetyThreshold(activeSafety.sexuallyExplicit) },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: mapSafetyThreshold(activeSafety.dangerousContent) },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.OFF }
    ];

    const config: any = {
      systemInstruction: systemInstruction,
      temperature: temperature,
      maxOutputTokens: 8192,
      safetySettings: safetyList,
    };

    // 3. Thinking level configuration: validate against model capabilities
    const supportedLevels = getSupportedThinkingLevels(actualModelName);
    let chosenLevel = thinkingLevel;
    if (!chosenLevel || !supportedLevels.includes(chosenLevel)) {
      chosenLevel = supportedLevels.includes('Medium') ? 'Medium' : supportedLevels[0];
    }
    const sdkThinkingLevel = mapThinkingLevel(chosenLevel);
    if (sdkThinkingLevel && sdkThinkingLevel !== ThinkingLevel.THINKING_LEVEL_UNSPECIFIED) {
      config.thinkingConfig = {
        thinkingLevel: sdkThinkingLevel,
      };
    }

    if (onChunk) {
      let streamClosed = false;

      const generatePromise = ai.models.generateContentStream({
        model: actualModelName,
        contents: fullPrompt,
        config,
      });

      // Background cleanup: if the stream resolves AFTER we aborted the race,
      // we must explicitly break the async iterable to close the underlying socket.
      generatePromise
        .then(async (stream) => {
          if (streamClosed) {
            for await (const _ of stream) {
              break;
            }
          }
        })
        .catch(() => {});

      const result = await Promise.race([generatePromise, abortPromise]);

      let fullText = "";
      let finishReason = "";
      try {
        for await (const chunk of result) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          
          // CRITICAL: Extract ONLY pure output text, completely discard model thought parts!
          let text = "";
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (parts && Array.isArray(parts)) {
            for (const part of parts) {
              if ((part as any).thought) {
                continue; // Skip thinking tokens completely!
              }
              if (part.text) {
                text += part.text;
              }
            }
          } else if (chunk.text) {
            text = chunk.text;
          }

          if (text) {
            fullText += text;
            onChunk(text);
          }
          if (chunk.candidates?.[0]?.finishReason) {
            finishReason = chunk.candidates[0].finishReason;
          }
        }
      } finally {
        streamClosed = true;
      }

      if (!fullText) {
        if (finishReason && finishReason !== "STOP") {
          throw new Error(`Received empty response from model. Finish reason: ${finishReason}`);
        }
        return fullText || "";
      }
      return fullText;
    } else {
      const generatePromise = ai.models.generateContent({
        model: actualModelName,
        contents: fullPrompt,
        config,
      });

      const response = await Promise.race([generatePromise, abortPromise]);

      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      let responseText = "";
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts && Array.isArray(parts)) {
        for (const part of parts) {
          if ((part as any).thought) {
            continue; // Skip thinking
          }
          if (part.text) {
            responseText += part.text;
          }
        }
      } else {
        responseText = response.text || "";
      }

      if (!responseText) {
        const fr = response.candidates?.[0]?.finishReason;
        if (fr && fr !== "STOP") {
          throw new Error(`Received empty response from model. Finish reason: ${fr}`);
        }
        return "";
      }

      return responseText;
    }
  } catch (err: any) {
    if (signal?.aborted || err.name === "AbortError") {
      throw new DOMException("Aborted", "AbortError");
    }

    // Improve connection stability & handle rate limits
    const errString = typeof err === 'object' ? JSON.stringify(err) : String(err);
    const errMessage = (err.message || errString || "").toLowerCase();

    const isQuotaError = errMessage.includes("429") || err.status === 429 || errMessage.includes("quota");
    const isUnavailable = errMessage.includes("503") || err.status === 503 || errMessage.includes("high demand") || errMessage.includes("unavailable") || errMessage.includes("overloaded");
    const isNetworkError =
      errMessage.includes("fetch") ||
      errMessage.includes("network");

    const isEmptyResponse = errMessage.includes("empty response") || errMessage.includes("error 0");
    const isNotFoundError = errMessage.includes("404") || err.status === 404;
    const isBadRequest = errMessage.includes("400") || err.status === 400 || errMessage.includes("invalid") || errMessage.includes("thinking");

    const shouldRetry =
      isQuotaError ||
      isUnavailable ||
      isNetworkError ||
      isEmptyResponse ||
      isNotFoundError ||
      isBadRequest ||
      err.name === "TypeError"; // TypeError often happens on fetch failure

    const isKeyOrAuthError =
      isQuotaError ||
      errMessage.includes("403") ||
      errMessage.includes("401") ||
      errMessage.includes("permission_denied") ||
      errMessage.includes("api_key_invalid") ||
      errMessage.includes("api key not valid") ||
      errMessage.includes("unauthenticated");

    if (isKeyOrAuthError && getAvailableGeminiApiKeys().length > 1) {
      rotateToNextApiKey();
      console.warn(`[AI Service] Auth/Quota error detected. Automatically rotated to backup Gemini key for attempt ${attempt + 1}.`);
    }

    if (attempt < 4 && shouldRetry) {
      console.warn(
        `[AI Service] Attempt ${attempt} failed for ${modelName}. Retrying... Error: ${err.message || errString}`,
      );
      await Promise.race([
        new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1500),
        ), // Exponential backoff starting at 3s
        abortPromise]);

      let fallbackModel = "gemini-3.6-flash";
      if (modelName === "gemini-3.6-flash") {
        fallbackModel = "gemini-3.7-flash";
      } else if (modelName.includes("pro")) {
        fallbackModel = attempt === 1 ? "gemini-3.6-flash" : "gemini-3.1-pro-preview";
      }

      return callGeminiStory(
        fallbackModel,
        fullPrompt,
        temperature,
        signal,
        attempt + 1,
        onChunk,
        systemInstruction,
        false,
        thinkingLevel,
        safetySettings
      );
    }

    console.error("Gemini API Error in callGeminiStory:", err);
    throw new Error(err.message || "Connection Error");
  }
};

// --- MAIN GENERATION FUNCTION ---

export const stripMetaAndPersonaArtifacts = (raw: string): string => {
  if (!raw) return "";
  let text = raw;

  // 1. Remove XML/HTML style thinking tags & thought process blocks
  text = text.replace(/<thought[\s\S]*?<\/thought>/gi, "");
  text = text.replace(/<thinking[\s\S]*?<\/thinking>/gi, "");
  text = text.replace(/<reflection[\s\S]*?<\/reflection>/gi, "");
  text = text.replace(/\[(?:Thinking|ThoughtProcess|InternalThought|Reflection|Audit|Check):[\s\S]*?\]/gi, "");
  text = text.replace(/\*(?:thinking|internal thought|reflection):[\s\S]*?\*/gi, "");

  // 2. Remove opening conversational greetings and chat intros
  text = text.replace(
    /^(?:[\s\n]*)(?:Hi|Hey|Hello|Good\s+(?:morning|afternoon|evening))\s+[!,.]*\s*\n*/i,
    ""
  );
  text = text.replace(
    /^(?:[\s\n]*)(?:Cutie patootie[^\n]*\n*)/i,
    ""
  );

  // 4. Remove opening roleplay action asterisks (e.g. *smiles and settles in*, *sips coffee*, etc.)
  text = text.replace(/^(?:[\s\n]*)\*[^*]+\*\s*\n*/i, "");
  text = text.replace(/^(?:[\s\n]*)\*[^*]+\*\s*\n*/i, "");

  // 5. Remove generic assistant / Indonesian chat preambles
  text = text.replace(
    /^(?:[\s\n]*)(?:Sure,?\s*|Here(?: is)?\s*(?:the continuation|the chapter|the story|the next part|what happened|the refined prompt|the prompt).*?:?\s*|Based\s*on\s*instructions.*?:?\s*|Writing.*?:?\s*|Continuing.*?:?\s*|Tentu,?\s*(?:ini\s*)?(?:kelanjutan|bab|cerita|prompt|saran).*?:?\s*|Baiklah,?\s*(?:berikut|ini).*?:?\s*|Sesuai\s*permintaan.*?:?\s*)\n*/i,
    ""
  );

  // 6. Remove echoed prompt / persona headers
  text = text.replace(/^===\s*(?:PRIMARY SYSTEM PERSONA|MULTI-SYSTEM PERSONAS ARCHITECTURE)[\s\S]*?===\s*\n*/gim, "");
  text = text.replace(/^\[(?:SYSTEM PERSONA|PERSONA \d+\/\d+|MULTI-SYSTEM PERSONAS|MULTI-PERSONA SYNTHESIS|CORE WRITING DIRECTIVES|TASK|PROMPT FIXING|PROMPT BUILDING|MANDATORY STYLE GUIDELINES)[\s\S]*?\]\s*\n*/gim, "");
  text = text.replace(/^\[(?:Author|Note|Catatan|Selesai|Tamat|Draft|End)[\s\S]*?\]\s*\n*/gim, "");

  // 7. Remove chapter headers at the start
  text = text.replace(/^(?:[\s\n]*)(?:#+\s*)?(?:\*\*?Chapter\s+\d+\*\*?:?|Chapter\s+\d+:?|(?:\*\*?Bab\s+\d+\*\*?:?)|Bab\s+\d+:?)[^\n]*\n*/i, "");

  // 8. Remove trailing meta tags / completion tokens
  text = text
    .replace(/===\s*(?:AKHIR_BAB|SELESAI|TAMAT|THE_END)\s*===/gi, "")
    .replace(/\[(?:Selesai|Tamat|The End|To be continued)\]/gi, "");

  // 9. Remove leading quotes / ellipses from prompt anchors
  text = text.replace(/^(?:[\s\n]*)(?:\.{2,5}|…)\s*/i, "");
  text = text.replace(/^(?:[\s\n]*)[“”"']\s*/, "");

  // Clean double blank lines caused by removed lines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
};

export const generateNovelSuggestion = async (
  novel: Novel,
  globalConfig: GlobalConfig,
  modelId: string = "gemini-3.6-flash",
  existingPrompt?: string,
): Promise<string> => {
  const { baseContext, systemInstruction } = buildSmartContext(novel, globalConfig, modelId);

  let taskInstruction = "";

  if (existingPrompt && existingPrompt.trim() !== "") {
    // MODE: FIXING
    taskInstruction = `
=== TASK: PROMPT FIXING & ENHANCEMENT ===
As a world-class novel writing assistant, read the story context and World Lore provided above.
The author provided an initial, rough prompt for the next chapter: 
"${existingPrompt}"

Your task is to REFINE, EXPAND, and PERFECT this initial prompt so that it becomes an ultimate, master-level instruction for an AI writer to execute into a spectacular chapter.

CRITICAL RULES FOR PROMPT FIXING:
1. Make the prompt highly detailed, establishing clear character goals, emotional arcs, sensory details, and vivid settings.
2. Incorporate relevant World Lore (if any exists) naturally to ensure the upcoming scene respects the world's rules.
3. Keep it as a descriptive narrative instruction (e.g., "The chapter should begin with Kenji standing in the pouring rain, feeling the crushing weight of his recent defeat...").
4. DO NOT write the actual chapter. Write the *instructions/blueprint* for the chapter.
5. Provide the output purely as the refined prompt without any introductory conversational filler like "Here is your refined prompt...".
6. DO NOT use numbered lists or technical robotic bullet points. Flow like a comprehensive story blueprint.
7. STRICTLY FORBIDDEN to output meta commentary, self-reflection lines, or chat preambles.
8. Use the same language as the initial prompt (Indonesian/English, etc.).
`;
  } else {
    // MODE: BUILDING
    taskInstruction = `
=== TASK: PROMPT BUILDING (FROM SCRATCH) ===
As a world-class novel writing assistant, read the story context and World Lore provided above.
The author wants to write the next chapter but has no specific ideas yet.

Your task is to BUILD an engaging, logical, and highly detailed prompt for the next chapter from scratch. 
It MUST fit the current plot flow and STRONGLY ADHERE to the World Lore (Lore Lock) rules established above.

CRITICAL RULES FOR PROMPT BUILDING:
1. Invent a compelling next step in the plot based purely on previous chapter events and the established World Lore.
2. Provide character interactions, environmental setups, and a clear conflict or revelation for this upcoming chapter.
3. Write the suggestion as a detailed, natural narrative blueprint (e.g., "Bab ini harus menceritakan bagaimana Kenji akhirnya menemukan rahasia di balik pedang peninggalan ayahnya...").
4. DO NOT write the actual chapter. Write the *instructions/blueprint* for the chapter.
5. Provide the output purely as the prompt idea without any introductory conversational filler.
6. DO NOT use numbered lists or technical robotic bullet points. Flow like a comprehensive story blueprint.
7. STRICTLY FORBIDDEN to output meta commentary, self-reflection lines, or chat preambles.
8. Output in the primary language of the novel.
`;
  }

  const prompt = `
${baseContext}
${taskInstruction}
`;

  const effectiveThinking = getEffectiveThinkingLevel(modelId, globalConfig);

  const textResponse = await callAIStoryRouter(
    modelId,
    prompt,
    0.8,
    undefined,
    undefined,
    systemInstruction,
    globalConfig.highThinkingMode,
    effectiveThinking,
    globalConfig.safetySettings
  );

  if (!textResponse) {
    throw new Error("Please try again later. (Empty Response)");
  }

  let cleaned = stripMetaAndPersonaArtifacts(textResponse);
  cleaned = cleaned
    .replace(/^Prompt:\s*/i, "")
    .replace(/^"|"$/g, "")
    .trim();

  return cleaned;
};

export const cleanStoryChunk = (rawChunk: string): string => {
  return stripMetaAndPersonaArtifacts(rawChunk);
};

export const stitchContinuationChunk = (existingDraft: string, rawNewChunk: string): string => {
  const cleanChunk = cleanStoryChunk(rawNewChunk);
  if (!existingDraft.trim()) return cleanChunk;
  if (!cleanChunk) return existingDraft;

  let processedChunk = cleanChunk;
  const trimmedDraft = existingDraft.trimEnd();

  // 1. Anti-stutter: Detect if the model repeated the trailing clause/words from previous draft
  for (let wordCount = 12; wordCount >= 1; wordCount--) {
    const draftWords = trimmedDraft.split(/\s+/).slice(-wordCount).join(" ");
    if (draftWords.length >= 6) {
      if (processedChunk.toLowerCase().startsWith(draftWords.toLowerCase())) {
        processedChunk = processedChunk.slice(draftWords.length).replace(/^[\s,]+/, "").trim();
        break;
      }
    }
  }

  if (!processedChunk) return trimmedDraft;

  // 2. Handle cut-off dangling word at the end of previous draft (e.g. "menelusuri p" where "p" was truncated)
  // If trimmedDraft ends with a single letter or short incomplete fragment without punctuation
  const trailingFragmentMatch = trimmedDraft.match(/\s([a-zA-Z]{1,2})$/);
  if (trailingFragmentMatch && /^[a-zA-Z]/.test(processedChunk)) {
    // If the new chunk starts with a letter, stitch directly without extra space or newline
    return trimmedDraft + processedChunk;
  }

  // 3. Check boundary sentence completion
  // Does existingDraft end with sentence-terminal punctuation? (. ! ? or ." !" ?" .” !” ?”)
  const hasSentenceTerminal = /[.!?]["'”»]?\s*$/.test(trimmedDraft);

  if (hasSentenceTerminal) {
    // Sentence is complete. Use natural paragraph break.
    return trimmedDraft + "\n\n" + processedChunk.trimStart();
  }

  // 4. CRITICAL: PREVIOUS DRAFT ENDED MID-SENTENCE OR MID-CLAUSE!
  // (Ended with comma, dash, colon, semicolon, or in the middle of a sentence)
  // NEVER INSERT \n\n HERE! IT WOULD SPLIT A SENTENCE IN TWO!
  return trimmedDraft + " " + processedChunk.trimStart();
};

export const getContinuityAnchor = (text: string, wordLimit: number = 280): string => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= wordLimit) return text.trim();
  return words.slice(-wordLimit).join(" ");
};

export const getRecentSceneContext = (text: string, wordLimit: number = 200): string => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= wordLimit) return text.trim();
  return words.slice(-wordLimit).join(" ");
};

export const generateChapter = async (
  novel: Novel,
  globalConfig: GlobalConfig,
  userPrompt: string,
  modelId: string,
  signal?: AbortSignal,
  onProgress?: (status: string) => void,
  onStreamingUpdate?: (currentFullContent: string) => void,
): Promise<{ content: string; progressionState?: StoryProgressionState; debugInfo?: GenerationDebugInfo }> => {
  if (novelLocks.get(novel.id)) {
    throw new Error(
      "Concurrent Generation Error: Novel ini sedang dalam proses penulisan.",
    );
  }
  novelLocks.set(novel.id, true);

  // DEDICATED LITE ENGINE ROUTING
  // If model is Gemini 3.1 Flash Lite (or any lite variant), route to the dedicated Lite Engine
  // which uses ultra-compact prompt representations, compact Beats, and zero-bloat recursive force.
  if (isLiteModel(modelId)) {
    try {
      const res = await generateChapterLite(
        novel,
        globalConfig,
        userPrompt,
        modelId,
        signal,
        onProgress,
        onStreamingUpdate
      );
      if (res.debugInfo) {
        generationStore.setState({ debugInfo: res.debugInfo });
      }
      return res;
    } finally {
      novelLocks.set(novel.id, false);
    }
  }

  let fullDraft = "";
  const statusLogs: string[] = [];
  const logStatus = (msg: string) => {
    statusLogs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    if (onProgress) onProgress(msg);
  };
  
  const activePersonas = (globalConfig.instructionPresets || []).filter(
    (p) => p.active === true && p.content?.trim()
  );
  if (activePersonas.length > 1) {
    logStatus(`Memadukan ${activePersonas.length} System Persona aktif (${activePersonas.map(p => p.name).slice(0, 2).join(', ')}${activePersonas.length > 2 ? '...' : ''})...`);
  } else if (activePersonas.length === 1) {
    logStatus(`Menerapkan System Persona: ${activePersonas[0].name}...`);
  }

  const mode = globalConfig.instructionMode || "build";
  const isCustomActive = Boolean(globalConfig.customRecursiveForce?.active);
  
  // Strict Word Count Boundaries
  let maxWords = isCustomActive
    ? Math.max(100, globalConfig.customRecursiveForce?.max || 4000)
    : globalConfig.chapterTargetWordCount || 4000;

  let minWords = isCustomActive
    ? Math.max(0, globalConfig.customRecursiveForce?.min || 2000)
    : Math.floor(maxWords * 0.7);

  // Validate range sanity
  if (minWords > maxWords) {
    const temp = minWords;
    minWords = maxWords;
    maxWords = temp;
  }

  // Safety soft target in middle of range (e.g. 2000-5000 -> target ~3500)
  // Requesting soft target prevents overshoot beyond hard max
  const softTargetWords = Math.floor(minWords + (maxWords - minWords) * 0.55);

  let isUnlimited =
    !isCustomActive &&
    (!globalConfig.chapterTargetWordCount ||
      globalConfig.chapterTargetWordCount === 0);

  // If Fixing Mode, adjust target words based on user input
  if (mode === "fixing") {
    const inputWords = countWords(userPrompt);
    if (inputWords > 50) {
      maxWords = inputWords + 300;
      minWords = Math.max(50, inputWords - 100);
      isUnlimited = false;
    }
  }

  let progressionState: StoryProgressionState;

  try {
    logStatus(`Mempersiapkan arsitektur story beats... (Model: ${modelId})`);
    
    // STEP 1: STORY BEATS EXTRACTION
    const extractedBeats = await extractStoryBeats(userPrompt, modelId, signal);
    progressionState = initializeProgressionState(extractedBeats);

    const { baseContext, systemInstruction } = buildSmartContext(novel, globalConfig, modelId);

    let loopCount = 0;
    const MAX_LOOPS = 25;
    let repairPassCount = 0;

    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const currentWordCount = countWords(fullDraft);
      const isFirstLoop = currentWordCount === 0;

      // STEP 2: STORY PROGRESSION UPDATE (evaluate draft against beats)
      if (!isFirstLoop) {
        logStatus(`Memeriksa progres alur cerita... (${currentWordCount} kata)`);
        progressionState = await updateProgressionState(fullDraft, progressionState, modelId, signal);
      }

      // Check current beat details
      const currentBeatObj = progressionState.beats.find(b => b.id === progressionState.currentBeat) || progressionState.beats[0];
      const completedBeatsObjs = progressionState.beats.filter(b => progressionState.completedBeats.includes(b.id));
      const allowedBeatsObjs = progressionState.beats.filter(b => progressionState.allowedNextBeats?.includes(b.id));
      const blockedBeatsObjs = progressionState.beats.filter(b => progressionState.blockedFutureBeats?.includes(b.id));

      const isReadyForEnding = !isUnlimited && currentWordCount >= minWords;

      // STEP 3: CONSTRUCT STRICT PROGRESSION-SCOPED PROMPT
      let activePrompt = "";

      if (isFirstLoop) {
        activePrompt = `${baseContext}

=== TUGAS: PENULISAN BAB NOVEL (SESI 1 - PEMBUKA) ===
[GLOBAL STORY REFERENCE (KONTEKS LUAS DARI USER - JANGAN DISELESAIKAN SEMUA)]
${userPrompt}

[CURRENT CHAPTER FOCUS (BAGIAN YANG BOLEH DITULIS SEKARANG)]:
- Target Babak: ${currentBeatObj?.stage || 'SETUP'}
- Fokus Kejadian: ${currentBeatObj?.summary || 'Pengenalan situasi dan atmosfer awal adegan'}
- Kejadian Sambungan Berikutnya (Maksimal 1 Langkah): ${allowedBeatsObjs.slice(1, 2).map(b => b.summary).join('; ') || 'Eskalasi awal'}

[BLOCKED FUTURE EVENTS (DILARANG KERAS DITULIS ATAU DISELESAIKAN DI BAB INI)]:
${blockedBeatsObjs.map(b => `- [${b.id}] ${b.summary}`).join('\n') || 'Tidak ada'}

[PANDUAN PENULISAN REALISME & ANTI-AI (WAJIB)]
1. DIALOG BERANTAKAN & HIDUP: Gunakan bahasa sehari-hari/kasual/slang, partikel (sih, dong, deh, kok, kan), kata seru (eh, oh, hmm), keraguan, kalimat terpotong, dan saling memotong. Jangan buat monolog panjang.
2. DILARANG KATA KLISE AI: Jangan gunakan "simfoni", "permadani", "merajut", "tarian", "tak tergoyahkan", "pada akhirnya", "sebuah kesaksian", "nuansa", "tak bisa dimungkiri", "bagai", "bak", "menyelami". Gunakan bahasa lugas & langsung.
3. SHOW, DON'T TELL: Jangan sebut emosi langsung ("merasa sedih/marah"). Tunjukkan lewat reaksi fisik, gestur, napas memburu, atau carut-marut dialog.
4. TANPA PESAN MORAL: Jangan simpulkan cerita dengan hikmah/nasihat di akhir paragraf.
5. PARAGRAF ASIMETRIS: Variasikan panjang kalimat secara dinamis. Gunakan kalimat 1-2 kata untuk ketegangan.
6. CHAPTER COMPLETION ≠ STORY COMPLETION: Jangan pernah menyelesaikan seluruh plot user hanya karena tertulis di [GLOBAL STORY REFERENCE]! Bab ini HANYA mengeksekusi [CURRENT CHAPTER FOCUS].
7. Mulai LANGSUNG dari kata pertama cerita tanpa sapaan pembuka atau proses berpikir AI.`;
      } else {
        // CONTINUATION SESSION
        const recentContext = getRecentSceneContext(fullDraft, 180);
        const tailSnippet = getContinuityAnchor(fullDraft, 50);

        activePrompt = `${baseContext}

=== TUGAS: SAMBUNGAN BAB NOVEL (SESI ${loopCount + 1}) ===
[GLOBAL STORY REFERENCE (KONTEKS LUAS USER)]:
${userPrompt}

[COMPLETED EVENTS (SUDAH DITULIS - DILARANG DIULANG)]:
${completedBeatsObjs.map(b => `- ${b.summary}`).join('\n') || 'Adegan pembuka telah berjalan'}

[CURRENT CHAPTER FOCUS (FOKUS EKSEKUSI SEKARANG)]:
- Status Babak: ${currentBeatObj?.stage || 'DEVELOPMENT'}
- Kejadian Saat Ini: ${currentBeatObj?.summary || 'Kembangkan interaksi dan ketegangan terkini'}
- Alur yang Diizinkan: ${allowedBeatsObjs.map(b => b.summary).join(' -> ')}

[BLOCKED FUTURE EVENTS (DILARANG KERAS DITULIS ATAU DISELESAIKAN SEKARANG)]:
${blockedBeatsObjs.map(b => `- ${b.summary}`).join('\n') || 'Tidak ada'}

[KONTEKS ADEGAN SEBELUMNYA DALAM BAB INI]
"...${recentContext}..."

[TITIK SAMBUNGAN TERAKHIR (LANJUTKAN PERSIS DARI SINI)]
${tailSnippet}

[PANDUAN SAMBUNGAN REALISME MUTLAK]
1. KESINAMBUNGAN SEMPURNA: Kalimat pertamamu HARUS langsung menyambung dari kata/tindakan terakhir pada [TITIK SAMBUNGAN TERAKHIR] tanpa mengulang kalimat sebelumnya, tanpa jeda baris jika kalimat belum selesai, dan TANPA tanda elipsis (...) di awal.
2. DILARANG MELOMPAT: Fokuskan tulisan HANYA pada [CURRENT CHAPTER FOCUS]. Jangan menyentuh [BLOCKED FUTURE EVENTS]!
3. DIALOG REALISTIS: Gunakan dialog kasual berantakan, partikel (sih, dong, deh, kok, kan), kata seru (eh, oh), keraguan, kalimat terputus. Tanpa monolog puitis.
4. ANTI-KLISE: DILARANG menggunakan kata "simfoni", "permadani", "merajut", "tarian", "tak tergoyahkan", "pada akhirnya", "sebuah kesaksian", "nuansa", "tak bisa dimungkiri", "bagai", "bak", "menyelami".
5. SHOW DON'T TELL & ASIMETRIS: Tunjukkan emosi lewat aksi fisik/dialog, tanpa label emosi langsung. Gunakan kalimat pendek dinamis.
6. ${isReadyForEnding ? `Panjang bab saat ini (${currentWordCount} kata) telah memenuhi batas minimal (${minWords} kata). Bawa adegan saat ini ke penutupan adegan yang wajar, TANPA pesan moral/hikmah penutup, lalu bubuhkan tepat "===AKHIR_BAB===" di baris paling akhir.` : `Panjang bab belum mencapai batas minimal (${minWords} kata). Lanjutkan ketegangan dan percakapan adegan saat ini; JANGAN selesaikan bab sekarang.`}
7. DILARANG KERAS menyertakan sapaan percakapan atau proses berpikir AI.
8. Output 100% narasi cerita novel murni tanpa pembuka/penutup obrolan atau catatan.`;
      }

      if (onProgress) {
        const progressPct = isUnlimited
          ? 0
          : Math.min(100, Math.round((currentWordCount / softTargetWords) * 100));
        const pctDisplay = isUnlimited ? "" : ` / ${progressPct}%`;
        logStatus(`Menulis bab... (${currentWordCount} kata${pctDisplay}) - Sesi ${loopCount + 1}`);
      }

      // Sync Debug Info
      const currentDebugInfo: GenerationDebugInfo = {
        chapterStage: progressionState.currentStage,
        currentBeat: progressionState.currentBeat,
        completedBeats: progressionState.completedBeats,
        allowedNextBeats: progressionState.allowedNextBeats || [],
        blockedFutureBeats: progressionState.blockedFutureBeats || [],
        wordCount: currentWordCount,
        minWords,
        maxWords,
        validation: {
          valid: true,
          wordCount: currentWordCount,
          minWords,
          maxWords,
          repeatedEvents: [],
          prematureEvents: [],
          continuityIssues: [],
          boundaryViolation: false,
          repairRequired: false
        },
        repairPass: repairPassCount,
        generationAttempt: loopCount + 1,
        statusLog: [...statusLogs]
      };
      generationStore.setState({ debugInfo: currentDebugInfo });

      // Model Execution
      let currentChunkAccumulator = "";
      let newChunk = "";

      try {
        newChunk = await callAIStoryRouter(
          modelId,
          activePrompt,
          globalConfig.temperature || 0.7,
          signal,
          (textChunk) => {
            currentChunkAccumulator += textChunk;
            const liveDraft = stitchContinuationChunk(fullDraft, currentChunkAccumulator);
            const sanitizedLive = liveDraft
              .replace(/===\s*(AKHIR_BAB|SELESAI|TAMAT|THE_END)\s*===/gi, "")
              .replace(/\[(Selesai|Tamat|The End)\]/gi, "");

            if (onStreamingUpdate) {
              onStreamingUpdate(sanitizedLive);
            }

            if (onProgress) {
              const liveWords = countWords(sanitizedLive);
              const livePct = isUnlimited
                ? 0
                : Math.min(100, Math.round((liveWords / softTargetWords) * 100));
              const pctDisplay = isUnlimited ? "" : ` / ${livePct}%`;
              onProgress(`Menulis bab... (${liveWords} kata${pctDisplay}) - Sesi ${loopCount + 1}`);
            }
          },
          systemInstruction,
          globalConfig.highThinkingMode !== false,
          getEffectiveThinkingLevel(modelId, globalConfig),
          globalConfig.safetySettings
        );
      } catch (chunkErr: any) {
        if (signal?.aborted || chunkErr.name === "AbortError") {
          throw chunkErr;
        }

        const newWordsInThisLoop = countWords(currentChunkAccumulator);
        if (newWordsInThisLoop > 0) {
          if (currentChunkAccumulator.trim()) {
            fullDraft = stitchContinuationChunk(fullDraft, currentChunkAccumulator);
          }
          break;
        }

        if (!isFirstLoop && loopCount > 0) {
          logStatus(`Sesi sambungan terhenti, mencoba pemulihan otomatis...`);
          try {
            const fallbackChunk = await callAIStoryRouter(
              modelId,
              activePrompt,
              Math.max(0.4, (globalConfig.temperature || 0.7) - 0.1),
              signal,
              undefined,
              systemInstruction,
              false,
              getEffectiveThinkingLevel(modelId, globalConfig),
              globalConfig.safetySettings
            );
            if (fallbackChunk && fallbackChunk.trim()) {
              fullDraft = stitchContinuationChunk(fullDraft, fallbackChunk);
              loopCount++;
              continue;
            }
          } catch (retryErr) {
            console.warn("[AI Service] Pemulihan sesi gagal:", retryErr);
          }
        }

        const totalWords = countWords(fullDraft);
        if (totalWords > 0) {
          break;
        }
        throw chunkErr;
      }

      const cleanNewChunk = cleanStoryChunk(newChunk);

      if (!isFirstLoop && cleanNewChunk.length === 0) {
        logStatus("Model menyelesaikan cerita secara alami.");
        break;
      }

      if (cleanNewChunk) {
        fullDraft = stitchContinuationChunk(fullDraft, cleanNewChunk);
      }

      // Check for completion signals
      let hasCompletedTag = false;
      if (
        /===\s*(AKHIR_BAB|SELESAI|TAMAT|THE_END)\s*===/i.test(fullDraft) ||
        /\[(Selesai|Tamat|The End)\]/i.test(fullDraft)
      ) {
        fullDraft = fullDraft
          .replace(/===\s*(AKHIR_BAB|SELESAI|TAMAT|THE_END)\s*===/gi, "")
          .replace(/\[(Selesai|Tamat|The End)\]/gi, "")
          .trim();
        hasCompletedTag = true;
      }

      if (onStreamingUpdate) {
        onStreamingUpdate(fullDraft);
      }

      loopCount++;

      // Strict word check: if not ready for ending, don't break even if tag was returned
      const wordsAfterLoop = countWords(fullDraft);
      if (isUnlimited) break;
      if (hasCompletedTag && wordsAfterLoop >= minWords) break;

      // Break if reached comfortable window
      if (!isCustomActive) {
        if (wordsAfterLoop >= minWords) break;
      } else {
        if (wordsAfterLoop >= softTargetWords || wordsAfterLoop >= maxWords) break;
      }

      if (loopCount >= MAX_LOOPS) break;

      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      // Cooldown between loops
      let delayMs = 1500;
      if (modelId.includes("pro") && loopCount % 2 === 0) {
        delayMs = 4000;
        logStatus(`Pendinginan kuota model pro... (${wordsAfterLoop} kata)`);
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }

    // =========================================================================
    // STEP 4: STORY BOUNDARY & WORD COUNT VALIDATION GATE
    // =========================================================================
    logStatus("Menjalankan validasi story boundaries & batas kata...");
    
    // Update progression state with final draft
    progressionState = await updateProgressionState(fullDraft, progressionState, modelId, signal);
    
    let validation = await validateStoryBoundaries(
      fullDraft,
      progressionState,
      minWords,
      maxWords,
      modelId,
      signal
    );

    // =========================================================================
    // STEP 5: REPAIR PASS (COMPRESSION IF OVERSHOOT > MAX_WORDS)
    // =========================================================================
    if (!validation.valid && validation.suggestedAction === 'compress' && validation.wordCount > maxWords) {
      logStatus(`Batas kata terlampaui (${validation.wordCount} > ${maxWords}). Memulai Repair Pass Otomatis...`);
      repairPassCount++;
      
      const compressedDraft = await repairOversizedChapter(
        fullDraft,
        minWords,
        maxWords,
        novel,
        globalConfig,
        modelId,
        logStatus,
        signal
      );

      if (compressedDraft && compressedDraft !== fullDraft) {
        fullDraft = compressedDraft;
        if (onStreamingUpdate) onStreamingUpdate(fullDraft);
      }

      // Re-validate after compression pass
      validation = await validateStoryBoundaries(
        fullDraft,
        progressionState,
        minWords,
        maxWords,
        modelId,
        signal
      );
    }

    // =========================================================================
    // STEP 6: BOUNDARY VIOLATION REPAIR (IF FUTURE BEATS LEAKED PREMATURELY)
    // =========================================================================
    if (!validation.valid && validation.boundaryViolation && validation.prematureEvents.length > 0) {
      logStatus(`Terdeteksi resolusi beat prematur. Memperbaiki draf agar fokus pada beat saat ini...`);
      repairPassCount++;

      const currentBeatObjForRepair = progressionState.beats.find(b => b.id === progressionState.currentBeat) || progressionState.beats[0];
      const trimmedDraft = await repairPrematureEnding(
        fullDraft,
        validation.prematureEvents,
        currentBeatObjForRepair,
        minWords,
        maxWords,
        novel,
        globalConfig,
        modelId,
        logStatus,
        signal
      );

      if (trimmedDraft && trimmedDraft !== fullDraft) {
        fullDraft = trimmedDraft;
        if (onStreamingUpdate) onStreamingUpdate(fullDraft);
      }

      // Re-validate after boundary repair
      validation = await validateStoryBoundaries(
        fullDraft,
        progressionState,
        minWords,
        maxWords,
        modelId,
        signal
      );
    }

    // =========================================================================
    // STEP 7: EXPANSION CONTINUATION IF UNDERSHOOT < MIN_WORDS
    // =========================================================================
    let expandAttempts = 0;
    const MAX_EXPAND_ATTEMPTS = 2;
    while (!validation.valid && validation.suggestedAction === 'continue' && validation.wordCount < minWords && expandAttempts < MAX_EXPAND_ATTEMPTS) {
      expandAttempts++;
      logStatus(`Panjang kata (${validation.wordCount} kata) di bawah batas minimal (${minWords} kata). Pendalaman adegan natural (Upaya ${expandAttempts}/${MAX_EXPAND_ATTEMPTS})...`);
      
      const recentContext = getRecentSceneContext(fullDraft, 180);
      const tailSnippet = getContinuityAnchor(fullDraft, 50);
      const deficit = minWords - validation.wordCount;
      const currentBeatObjForExpand = progressionState.beats.find(b => b.id === progressionState.currentBeat) || progressionState.beats[0];

      const continuePrompt = `${baseContext}

=== TUGAS: PENDALAMAN ADEGAN (LANJUTKAN SECARA NATURAL) ===
[KONTEKS ALUR SAAT INI]:
- Stage: ${currentBeatObjForExpand?.stage || 'DEVELOPMENT'}
- Beat: ${currentBeatObjForExpand?.summary}

[KONTEKS CUPLIKAN ADEGAN SEBELUMNYA]:
"${recentContext}"

[TITIK SAMBUNGAN TERAKHIR]:
${tailSnippet}

[INSTRUKSI KHUSUS]:
Draf cerita saat ini membutuhkan pendalaman sekitar ${deficit} kata lagi agar mencapai panjang minimal.
Kembangkan percakapan, dinamika batin, sensasi fisik, dan suasana adegan yang sedang berlangsung saat ini secara mendalam.
JANGAN melompat ke ending atau peristiwa masa depan.
Mulai LANGSUNG dari kata sambungan berikutnya tanpa tanda elipsis (...).`;

      try {
        const extraChunk = await callAIStoryRouter(
          modelId,
          continuePrompt,
          globalConfig.temperature || 0.7,
          signal,
          undefined,
          systemInstruction,
          false,
          getEffectiveThinkingLevel(modelId, globalConfig),
          globalConfig.safetySettings
        );
        const cleanExtra = cleanStoryChunk(extraChunk);
        if (cleanExtra) {
          fullDraft = stitchContinuationChunk(fullDraft, cleanExtra);
          if (onStreamingUpdate) onStreamingUpdate(fullDraft);
        }
      } catch (expandErr) {
        console.warn("[AI Service] Ekspansi tambahan tidak berhasil:", expandErr);
        break;
      }

      // Re-validate after expansion
      validation = await validateStoryBoundaries(
        fullDraft,
        progressionState,
        minWords,
        maxWords,
        modelId,
        signal
      );
    }

    const finalWordCount = countWords(fullDraft);
    logStatus(`Bab berhasil disusun: ${finalWordCount} kata (Target: ${minWords}-${maxWords} kata).`);

    const finalDebugInfo: GenerationDebugInfo = {
      chapterStage: progressionState.currentStage,
      currentBeat: progressionState.currentBeat,
      completedBeats: progressionState.completedBeats,
      allowedNextBeats: progressionState.allowedNextBeats || [],
      blockedFutureBeats: progressionState.blockedFutureBeats || [],
      wordCount: finalWordCount,
      minWords,
      maxWords,
      validation,
      repairPass: repairPassCount,
      generationAttempt: loopCount,
      statusLog: statusLogs
    };

    generationStore.setState({ debugInfo: finalDebugInfo });

    return {
      content: fullDraft,
      progressionState,
      debugInfo: finalDebugInfo
    };
  } catch (err: any) {
    if (signal?.aborted || err.name === "AbortError") {
      const abortErr = new Error("Aborted");
      abortErr.name = "AbortError";
      (abortErr as any).partialText = fullDraft;
      throw abortErr;
    }

    if (err && typeof err === 'object') {
      err.partialText = fullDraft;
    }
    
    // If text was generated, return the draft safely rather than losing data
    const currentWords = countWords(fullDraft);
    if (currentWords > 0) {
      console.log(`[AI Service] AI selesai menulis dengan ${currentWords} kata. Menyimpan bab.`);
      return {
        content: fullDraft,
        progressionState: progressionState!
      };
    }
    
    throw err;
  } finally {
    novelLocks.set(novel.id, false);
  }
};


export const reviseChapterContent = async (
  content: string,
  mode: 'pro' | 'lite' | string,
  novel: Novel | undefined,
  globalConfig: GlobalConfig | undefined,
  onStreamingUpdate?: (currentText: string) => void
): Promise<string> => {
  const modelsToTry = mode === 'pro'
    ? ['gemini-3.1-pro-preview']
    : mode === 'lite'
    ? ['gemini-3.5-flash', 'gemini-3.1-flash-lite']
    : [mode];
  
  let activePrompt = "";
  if (mode === "lite") {
    activePrompt = `You are a professional novel editor performing a light editorial pass.
Your goal is to make the existing chapter read as though it had been polished by a professional editor.
Preserve the author's intent, story structure, pacing, characterization, plot progression, and emotional direction.
If a sentence is already natural, leave it unchanged. The fewer unnecessary edits, the better.


--- EDITING GUIDELINES (REALISM & ANTI-AI) ---
0. Always follow the System Instructions, writing style, and character consistency established for the novel.
1. Fix unnatural dialogue: Rewrite dialogue that sounds robotic, overly formal, repetitive, or like an AI explanation. Use messy, realistic conversational dialogue with natural particles (sih, dong, deh, kok, kan), hesitations, and interruptions. Never write long poetic monologues.
2. Eradicate AI Clichés & Banned Words: Remove words like "simfoni", "permadani", "merajut", "tarian", "tak tergoyahkan", "pada akhirnya", "sebuah kesaksian", "nuansa", "tak bisa dimungkiri", "bagai", "bak", "menyelami".
3. Show, Don't Tell: Eliminate narration that labels emotions directly ("merasa sedih/marah"). Express emotion through physical actions, bodily reactions, and ragged dialogue.
4. No Moralizing Endings: Remove any wrap-up moral lessons, philosophical summaries, or preachy concluding sentences at the end of the chapter.
5. Asymmetrical Paragraph Structure: Vary sentence lengths dynamically. Use 1-2 word sentences for tension and realistic pauses.
6. Remove AI Writing Habits & Thinking Traces: Delete any text that resembles AI reasoning, planning notes, outlines, or meta explanations.
7. Fix Overused Formatting: Remove excessive use of italics (*text*) or bold (**text**) used for dramatic effect. Replace any "***" scene dividers with standard markdown horizontal rules "---". Normal prose should rely on strong word choice, not formatting.

--- WHAT YOU MUST NOT DO ---
- Do NOT rewrite the entire chapter or change the direction of the story.
- Do NOT change pacing, shorten/expand scenes significantly, or summarize.
- Do NOT add literary flourishes simply for style.
- Do NOT replace the author's writing style with your own.
- Do NOT change point of view, tense, emotional meaning, or the ending of the scene.
- Do NOT output any thinking blocks, notes, or explanations. Just output the revised chapter text.

<CHAPTER CONTENT>
${content}
</CHAPTER CONTENT>`;
  } else {
    const originalWordCount = countWords(content);
    activePrompt = `You are a master novel editor and structural doctor performing a deep, substantive edit (Pro Mode).
Your goal is to fix pacing issues, illogical character actions, and rushed plot transitions. You have ABSOLUTE FREEDOM to completely overhaul, rewrite, or restructure the chapter.


--- EDITING GUIDELINES ---
0. Always follow the System Instructions, writing style, and character consistency established for the novel.
1. Complete Creative Freedom: Do not hold back. If the original chapter or prompt forces an illogical outcome, you are free to change the plot, alter the ending, or tear apart the chapter completely. The ONLY rule that matters is that the story must make logical sense.
2. Fix Rushed Pacing & Illogical Plots: Ensure events unfold logically. If characters jump to conclusions, accept strange things too easily, or if the scene rushes to a climax without buildup, add the necessary narrative tissue, internal reasoning, and action beats to make the progression believable.
3. Enhance Story Logic: Ensure cause and effect make sense. Characters must act consistently with their knowledge, limitations, and situation. 
4. Fix AI Formatting & Tropes: Remove excessive use of italics (*text*) or bold (**text**) for dramatic effect. Replace any "***" scene dividers with standard markdown horizontal rules "---". Eradicate cliché AI phrasing ("shivers down the spine", "a testament to").
5. Make Prose Human: Rewrite dialogue that sounds robotic. Humans interrupt, hesitate, and speak with subtext.

--- WHAT YOU MUST NOT DO ---
- DO NOT SUMMARIZE. DO NOT SHORTEN THE CHAPTER. The original text was generated to meet specific length targets (Recursive Force Engine).
- The original text has EXACTLY ${originalWordCount} words. Your revision MUST contain at least ${originalWordCount} words. 
- If you fix pacing, you should EXPAND the scenes, add internal monologue, detailed action beats, and environmental descriptions to pad out the logic. NEVER cut the scene down.

Do NOT output any thinking blocks, notes, or explanations. Just output the revised chapter text.

<CHAPTER CONTENT>
${content}
</CHAPTER CONTENT>`;
  }

  let systemInstructionStr = "";
  if (novel && globalConfig) {
    const { systemInstruction } = buildSmartContext(novel, globalConfig, modelsToTry[0]);
    systemInstructionStr = systemInstruction;
  }

  let lastError = null;
  for (const modelId of modelsToTry) {
    try {
      console.log(`[Revise] Attempting with model: ${modelId}`);
      let fullRevision = "";
      await callAIStoryRouter(
        modelId,
        activePrompt,
        0.7,
        undefined,
        (textChunk) => {
          fullRevision += textChunk;
          if (onStreamingUpdate) {
            onStreamingUpdate(fullRevision);
          }
        },
        systemInstructionStr,
        false
      );

      let cleanText = cleanStoryChunk(fullRevision);
      return cleanText;
    } catch (err) {
      console.warn(`[Revise] Model ${modelId} failed:`, err);
      lastError = err;
    }
  }
  throw lastError || new Error("Gagal melakukan revisi bab.");
};

export const callAIStoryRouter = async (
  modelName: string,
  fullPrompt: string,
  temperature: number = 0.7,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
  systemInstruction: string = "",
  highThinkingMode: boolean = false,
  thinkingLevel?: ThinkingLevelOption,
  safetySettings?: SafetySettingsConfig
): Promise<string> => {
  return callGeminiStory(
    modelName, 
    fullPrompt, 
    temperature, 
    signal, 
    1, 
    onChunk, 
    systemInstruction, 
    highThinkingMode,
    thinkingLevel,
    safetySettings
  );
};

