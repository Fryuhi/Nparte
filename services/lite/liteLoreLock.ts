import { Novel } from '../../types';

/**
 * Lite Lore Lock Engine
 * Specially designed for Gemini 3.1 Flash Lite:
 * - Filters and compresses Lore Lock entries to only what is relevant to the scene
 * - Uses compact key-value lines instead of verbose JSON/narrative dumps
 * - Reduces lore token consumption by up to 80%
 */
export const buildLiteLoreContext = (novel: Novel, userPrompt: string): string => {
  const parts: string[] = [];

  // 1. WORLD LORE (Fanfic Mode) - Compact extraction
  if (novel.type === 'fanfic' && novel.worldLore?.trim()) {
    // Truncate or extract first 600 characters of world lore to prevent token blowout
    const trimmedLore = novel.worldLore.trim();
    const compactLore = trimmedLore.length > 700 
      ? trimmedLore.slice(0, 700) + '... [aturan kanon lanjutan diringkas]' 
      : trimmedLore;
    parts.push(`[KANON DUNIA]\n${compactLore}`);
  }

  // 2. LORE LOCK DATABASE (Selective entity compression)
  if (novel.loreLockEnabled && novel.loreDatabase) {
    const db = novel.loreDatabase;
    const lowerPrompt = userPrompt.toLowerCase();

    // Characters: Prioritize characters mentioned in user prompt or top 4 active
    const allChars = db.characters || [];
    const relevantChars = allChars.filter((c) => {
      const charName = (c.name || '').toLowerCase();
      return lowerPrompt.includes(charName) || charName.split(' ').some(part => part.length > 2 && lowerPrompt.includes(part));
    });

    // If no specific mention, pick top 3 main characters
    const selectedChars = relevantChars.length > 0 ? relevantChars.slice(0, 4) : allChars.slice(0, 3);

    if (selectedChars.length > 0) {
      const charLines = selectedChars.map((c) => {
        const traits = [c.gender, c.age].filter(Boolean).join(', ');
        const desc = c.appearance ? `Ciri: ${c.appearance.slice(0, 80)}` : '';
        const status = c.currentStatus ? `Status: ${c.currentStatus.slice(0, 50)}` : '';
        const details = [traits, desc, status].filter(Boolean).join(' | ');
        return `• ${c.name}: ${details || 'Karakter utama'}`;
      });
      parts.push(`[KARAKTER KUNCI]\n${charLines.join('\n')}`);
    }

    // World Rules: Only include essential 1-2 line constraints if present
    const rules = db.world?.rules?.trim();
    if (rules) {
      const shortRules = rules.length > 250 ? rules.slice(0, 250) + '...' : rules;
      parts.push(`[ATURAN DUNIA]: ${shortRules}`);
    }
  }

  if (parts.length === 0) return '';
  return `=== PANDUAN LORE & KANON ===\n${parts.join('\n\n')}\n============================\n\n`;
};
