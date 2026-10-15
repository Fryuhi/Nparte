import { Novel, GlobalConfig } from '../../types';
import { buildLiteSystemInstruction } from './liteInstruction';
import { buildLiteLoreContext } from './liteLoreLock';

export const estimateTokens = (text: string) => Math.ceil(text.length / 3.5);

/**
 * High-Efficiency Context Builder for Gemini 3.1 Flash Lite
 * Ensures airtight narrative continuity while keeping token footprint lean
 */
export const buildLiteSmartContext = (
  novel: Novel,
  globalConfig: GlobalConfig,
  userPrompt: string
): { systemInstruction: string; baseContext: string } => {
  // 1. Lite System Instruction
  const systemInstruction = buildLiteSystemInstruction(globalConfig, novel);

  // 2. Lite Lore Lock Context (Anti-Halusinasi Karakter & Dunia)
  const loreContext = buildLiteLoreContext(novel, userPrompt);

  // 3. Airtight Chapter Continuity Anchor
  let historyText = '';
  const chapters = novel.chapters || [];

  if (chapters.length > 0) {
    const lastChapter = chapters[chapters.length - 1];
    const prevChapter = chapters.length > 1 ? chapters[chapters.length - 2] : null;

    const parts: string[] = [];

    // Older chapters: short 1-line event summary list
    if (chapters.length > 2) {
      const summaryList = chapters
        .slice(0, chapters.length - 2)
        .map((c, i) => `Bab ${i + 1} (${c.title}): ${c.content.slice(0, 110).replace(/\n+/g, ' ')}...`)
        .slice(-4);
      parts.push(`[LOG BAB LAMPAU]:\n${summaryList.join('\n')}`);
    }

    if (prevChapter) {
      const prevSnippet = prevChapter.content.length > 400
        ? `...${prevChapter.content.slice(-400).trim()}`
        : prevChapter.content.trim();
      parts.push(`[AKHIR BAB ${chapters.length - 1}: ${prevChapter.title}]:\n${prevSnippet}`);
    }

    // Last chapter: keep ending snippet (up to 850 chars) for seamless continuity
    const lastSnippet = lastChapter.content.length > 850
      ? `...${lastChapter.content.slice(-850).trim()}`
      : lastChapter.content.trim();
    parts.push(`[AKHIR BAB SEBELUMNYA - BAB ${chapters.length}: ${lastChapter.title}]:\n${lastSnippet}\n[KONTINUITAS]: Bab baru WAJIB menyambung secara logis dari situasi dan kondisi karakter di atas.`);

    historyText = parts.join('\n\n');
  }

  const baseContext = `${loreContext}=== KONTINUITAS & REKAM JEJAK CERITA ===\n${historyText || 'Ini adalah bab pembuka / awal cerita novel.'}\n=======================================\n\n`;

  return { systemInstruction, baseContext };
};
