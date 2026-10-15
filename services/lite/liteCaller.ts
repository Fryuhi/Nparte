import { GoogleGenAI, HarmCategory, HarmBlockThreshold, ThinkingLevel } from '@google/genai';
import { getGlobalApiKey, rotateToNextApiKey, getAvailableGeminiApiKeys } from '../apiKeyService';
import { ThinkingLevelOption, SafetySettingsConfig, SafetyThreshold } from '../../types';

export const mapLiteSafetyThreshold = (threshold?: SafetyThreshold | string): HarmBlockThreshold => {
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

export const mapLiteThinkingLevel = (level?: ThinkingLevelOption | string): ThinkingLevel | undefined => {
  if (!level) return undefined;
  const upper = level.toUpperCase();
  if (upper === 'MINIMAL') return ThinkingLevel.MINIMAL;
  if (upper === 'LOW') return ThinkingLevel.LOW;
  if (upper === 'MEDIUM') return ThinkingLevel.MEDIUM;
  if (upper === 'HIGH') return ThinkingLevel.HIGH;
  return undefined;
};

export const stripLiteArtifacts = (raw: string): string => {
  if (!raw) return '';
  let text = raw;
  // Strip thought tags & reasoning blocks
  text = text.replace(/<thought[\s\S]*?<\/thought>/gi, '');
  text = text.replace(/<think[\s\S]*?<\/think>/gi, '');
  // Strip conversational openings (e.g. "Tentu, ini cerita...")
  text = text.replace(/^(?:tentu(?: saja)?|baiklah|halo|sure|certainly)[^\n]*\n+/i, '');
  // Strip markdown headers like # Bab 1
  text = text.replace(/^#+\s*(?:Bab|Chapter)\s*\d+[:\s-]*/i, '');
  return text.trim();
};

/**
 * Lean Gemini Caller for Gemini 3.1 Flash Lite
 * Respects user's custom thinking level, temperature, and safety settings
 */
export const callLiteGemini = async (
  prompt: string,
  systemInstruction: string = '',
  temperature: number = 0.7,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
  thinkingLevel?: ThinkingLevelOption,
  safetySettings?: SafetySettingsConfig,
  attempt: number = 1
): Promise<string> => {
  const modelName = 'gemini-3.1-flash-lite';
  const apiKey = getGlobalApiKey();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  try {
    const activeSafety = safetySettings;
    const safetyList = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: mapLiteSafetyThreshold(activeSafety?.harassment) },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: mapLiteSafetyThreshold(activeSafety?.hate) },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: mapLiteSafetyThreshold(activeSafety?.sexuallyExplicit) },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: mapLiteSafetyThreshold(activeSafety?.dangerousContent) },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.OFF },
    ];

    const mappedThinking = mapLiteThinkingLevel(thinkingLevel);

    const config: any = {
      systemInstruction: systemInstruction || undefined,
      temperature,
      maxOutputTokens: 8192,
      safetySettings: safetyList,
    };

    // User's custom thinking level is preserved and passed
    if (mappedThinking !== undefined) {
      config.thinkingConfig = {
        thinkingLevel: mappedThinking,
      };
    }

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config,
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const text = chunk.text || '';
      fullText += text;
      if (onChunk) onChunk(text);
    }

    return stripLiteArtifacts(fullText);
  } catch (err: any) {
    if (signal?.aborted || err.name === 'AbortError') {
      throw new DOMException('Aborted', 'AbortError');
    }

    const errMessage = (err.message || String(err)).toLowerCase();
    const isQuotaOrAuth =
      errMessage.includes('429') ||
      errMessage.includes('resource_exhausted') ||
      errMessage.includes('403') ||
      errMessage.includes('401') ||
      errMessage.includes('api_key') ||
      errMessage.includes('permission_denied') ||
      errMessage.includes('quota');

    const totalKeys = getAvailableGeminiApiKeys().length;
    if (isQuotaOrAuth && attempt < Math.max(3, totalKeys)) {
      rotateToNextApiKey();
      console.warn(`[Lite Engine] Auth/Quota error. Rotated to backup Gemini key (Percobaan ${attempt + 1})...`);
      await new Promise((res) => setTimeout(res, 1200 * attempt));
      return callLiteGemini(prompt, systemInstruction, temperature, signal, onChunk, thinkingLevel, safetySettings, attempt + 1);
    }

    if (attempt < 3) {
      console.warn(`[Lite Engine] Percobaan ${attempt} gagal: ${err.message}. Mencoba kembali...`);
      await new Promise((res) => setTimeout(res, 1500 * attempt));
      return callLiteGemini(prompt, systemInstruction, temperature, signal, onChunk, thinkingLevel, safetySettings, attempt + 1);
    }

    throw err;
  }
};
