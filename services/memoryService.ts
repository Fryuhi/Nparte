
// --- DETERMINISTIC SUMMARIZER (Heuristic / Offline) ---
// Used when the context is too large and we need to compress older chapters immediately without API calls.
export const summarizeChapterDeterministic = (content: string, maxSentences = 5): string => {
  if (!content) return "";
  
  // 1. Split into sentences (Naive regex split)
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  if (sentences.length <= maxSentences) return content;

  // 2. Score sentences based on "Importance"
  const scored = sentences.map((s, i) => {
    // Priority: Proper nouns (Names/Places), Length (Not too short/long), Position (Start/End of chapter)
    const properNouns = (s.match(/[A-Z][a-z]+/g) || []).length;
    const lengthScore = Math.min(s.length / 100, 1); 
    const positionScore = (i === 0 || i === sentences.length - 1) ? 2 : 0;
    
    return { 
      text: s.trim(), 
      score: properNouns * 1.5 + lengthScore + positionScore, 
      index: i 
    };
  });

  // 3. Pick Top K
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxSentences);
  
  // 4. Sort back by original index to maintain narrative flow
  selected.sort((a, b) => a.index - b.index);

  return selected.map(s => s.text).join(" ");
};


