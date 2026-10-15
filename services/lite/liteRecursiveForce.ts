import { StoryProgressionState } from '../../types';

/**
 * Lite Recursive Force & Pacing Prompts
 * Engineered for Gemini 3.1 Flash Lite:
 * - Direct, high-impact continuation cues (<120 tokens per turn)
 * - Anti-Hallucination & Story Continuity enforcement
 * - Natural dialogue with subtext and physical beats
 */

export const buildLiteInitialPrompt = (
  baseContext: string,
  userPrompt: string,
  progressionState: StoryProgressionState,
  minWords: number,
  maxWords: number
): string => {
  const currentBeat = progressionState.beats.find(b => b.id === progressionState.currentBeat) || progressionState.beats[0];

  return `${baseContext}=== TUGAS PENULISAN BAB NOVEL ===
[INSTRUKSI CERITA DARI PENULIS]
${userPrompt}

[FOKUS ADEGAN PEMBUKA]
${currentBeat?.summary || 'Buka adegan dengan deskripsi atmosfer, situasi ruang, aksi fisik karakter, dan dialog awal.'}

[PANDUAN KUALITAS & KONTINUITAS]
1. KONTINUITAS: Sambungkan emosi dan situasi karakter secara alami dari peristiwa sebelumnya. Dilarang berhalusinasi atau mengubah fakta lore.
2. DIALOG: Tulis dialog yang hidup, luwes, dan kasual (sih, kok, dong, kan). Sisipkan reaksi tubuh mikro.
3. KEDALAMAN: Target bab adalah ${minWords} - ${maxWords} kata. Tulis adegan ini secara mendalam, rinci, dan hidup. JANGAN terburu-buru merangkum adegan.`;
};

export const buildLiteContinuationPrompt = (
  _userPrompt: string,
  fullDraft: string,
  progressionState: StoryProgressionState,
  currentWordCount: number,
  minWords: number,
  maxWords: number
): string => {
  // Extract last 2 sentences of draft for seamless continuation hook
  const cleanDraft = fullDraft.trim();
  const sentences = cleanDraft.match(/[^.!?]+[.!?]+["']?|\S+/g) || [cleanDraft];
  const lastContext = sentences.slice(-2).join(' ').trim().slice(-280);

  const currentBeat = progressionState.beats.find(b => b.id === progressionState.currentBeat) || progressionState.beats[0];
  const isNearEnd = currentWordCount >= minWords;

  if (isNearEnd) {
    return `[INSTRUKSI PENYELESAIAN BAB]
Panjang saat ini: ${currentWordCount} kata (Target minimal ${minWords} kata tercapai).
Kelanjutan dari kalimat terakhir: "...${lastContext}"

Fokus: Tuntaskan adegan puncak (${currentBeat?.summary || 'klimaks adegan'}) dan selesaikan bab secara alami.
Aturan:
1. Sambung langsung kelanjutan prosanya tanpa mengulang kalimat sebelumnya.
2. Pertahankan kontinuitas emosi dan dialog alami. Dilarang menulis kesimpulan moral.`;
  }

  return `[INSTRUKSI LANJUTAN BAB - TEMPO BERTARAP & KONTINUITAS]
Panjang saat ini: ${currentWordCount} kata (Target: ${minWords} - ${maxWords} kata).
Kelanjutan langsung dari kalimat terakhir: "...${lastContext}"

Fokus Lanjutan: ${currentBeat?.summary || 'Lanjutkan percakapan, perdalam interaksi, dan kembangkan ketegangan konflik.'}
Aturan Mutlak:
1. SAMBUNG LANGSUNG: Lanjutkan prosa tanpa mengulang kalimat terakhir atau membuat pembukaan baru.
2. KONTINUITAS & ANTI-HALUSINASI: Jaga konsistensi lokasi dan karakter. Jangan memunculkan entitas asing tanpa alasan logis.
3. DIALOG HIDUP: Sisipkan dialog realistis, selaan, dan gerak-gerik fisik karakter.
4. JANGAN MERANGKUM: Kembangkan adegan secara mendalam kalimat demi kalimat. Dilarang terburu-buru mengakhiri bab.`;
};
