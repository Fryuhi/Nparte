import { LoreDatabase, Chapter } from "../types";
import { callAIStoryRouter } from "./aiService";

export const generateLoreDatabase = async (
  chapters: Chapter[], 
  modelId: string = 'gemini-3.5-flash-lite'
): Promise<LoreDatabase | null> => {
  const safeChapters = chapters || [];
  if (safeChapters.length === 0) {
    throw new Error("Tidak ada konten bab untuk dianalisis oleh Lore Lock.");
  }

  const fullText = safeChapters.map((c, i) => `--- Chapter ${i + 1}: ${c.title || `Bab ${i + 1}`} ---\n${c.content || ''}`).join("\n\n");

  const prompt = `You are a highly analytical literary archivist and canon supervisor. 
Your task is to thoroughly analyze the novel chapters provided below and construct a comprehensive, structured "Lore Database" in strictly valid JSON.
Prioritize accuracy, consistency, and completeness across characters, world lore, and chapter arcs.

Expected JSON Schema:
{
  "characters": [
    {
      "id": "unique-slug-or-name",
      "name": "Character Full/Known Name",
      "age": "age or unknown",
      "gender": "gender or unknown",
      "appearance": "Detailed physical description, hair, eyes, distinctive clothing and traits",
      "personality": "Detailed psychological profile, behavioral tendencies, and speech style",
      "relationships": "Key relationships with other characters",
      "goals": "Current motivations, desires, and objectives",
      "importantHistory": "Relevant backstory, origin, or past experiences",
      "currentStatus": "Where they are, physical condition, and current activity at the end of the chapters"
    }
  ],
  "world": {
    "locations": "Detailed descriptions of all visited or mentioned locations, cities, realms, or environments",
    "factions": "Political, social, guild, religious, or magical groups and their dynamics",
    "rules": "Laws of the world, magic/power systems, technology, physics, or societal norms",
    "importantEvents": "Major historical or current events shaping the world",
    "consistentFacts": "Absolute canonical truths and rules about the world that must not be contradicted"
  },
  "chapterSummaries": [
    {
      "chapterNumber": 1,
      "chapterId": "id-or-index",
      "shortSummary": "1-2 sentence overview of what happens in this chapter",
      "keyEvents": "Concise summary of major plot developments and breakthroughs",
      "characterChanges": "Status changes, injuries, emotional shifts, or relationship evolutions",
      "importantDetails": "Small details, items acquired, clues, or foreshadowing"
    }
  ],
  "fullLoreSummary": "A comprehensive, synthesized narrative summary of the entire story so far, weaving character arcs and major world events together."
}

CRITICAL: Return ONLY valid raw JSON. Do not include introductory or concluding commentary.

--- SOURCE CHAPTERS ---
${fullText}
`;

  try {
    const textResponse = await callAIStoryRouter(
      modelId,
      prompt,
      0.1,
      undefined,
      undefined,
      "You are a strict JSON data extractor. Output valid JSON only."
    );
    
    let result = textResponse?.trim() || "{}";
    
    // Clean up markdown code blocks if any
    const match = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
       result = match[1];
    } else {
       result = result.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "");
    }
    
    // Find first '{' and last '}'
    const firstBrace = result.indexOf('{');
    const lastBrace = result.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      result = result.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(result) as LoreDatabase;
    if (parsed && (parsed.characters?.length || parsed.world || parsed.fullLoreSummary)) {
      return parsed;
    }

    throw new Error(`Data JSON dari model ${modelId} tidak lengkap atau kosong.`);
  } catch (e: any) {
    console.error(`[Lore Lock] Extraction failed with model ${modelId}:`, e);
    throw new Error(`Gagal mengekstrak dengan model [${modelId}]: ${e.message || "Parsing JSON gagal"}`);
  }
};
