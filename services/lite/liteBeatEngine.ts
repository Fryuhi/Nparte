import { StoryBeat, StoryProgressionState, ChapterNarrativeStage } from '../../types';

/**
 * Lite Story Beat Engine
 * Tailored for Gemini 3.1 Flash Lite:
 * - Creates 3-4 clear, high-impact narrative beats without heavy LLM JSON overhead
 * - Tracks progression efficiently through prose milestones and word-count progress
 * - Completely avoids multiple recursive LLM evaluation roundtrips that exhaust tokens
 */

export const extractLiteStoryBeats = (userPrompt: string): StoryBeat[] => {
  const cleanPrompt = userPrompt.trim();
  
  // If prompt has numbered list or bullet points, extract them directly
  const lines = cleanPrompt.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const bulletLines = lines.filter(l => /^(\d+[\.\)]|[-*•])\s+/.test(l));

  if (bulletLines.length >= 2 && bulletLines.length <= 5) {
    const stages: ChapterNarrativeStage[] = ['SETUP', 'DEVELOPMENT', 'CLIMAX', 'RESOLUTION'];
    return bulletLines.map((line, idx) => ({
      id: `beat-lite-${idx + 1}`,
      summary: line.replace(/^(\d+[\.\)]|[-*•])\s+/, '').slice(0, 120),
      status: idx === 0 ? 'current' : 'future',
      priority: idx + 1,
      stage: stages[idx] || 'DEVELOPMENT',
    }));
  }

  // Otherwise, construct a robust 3-stage beat structure
  const shortSummary = cleanPrompt.replace(/\n+/g, ' ').slice(0, 140);

  return [
    {
      id: 'beat-lite-1',
      summary: `Awal adegan: Pengenalan situasi dan ketegangan awal (${shortSummary.slice(0, 70)})`,
      status: 'current',
      priority: 1,
      stage: 'SETUP',
    },
    {
      id: 'beat-lite-2',
      summary: `Eskalasi: Percakapan atau aksi mendalam yang mengembangkan konflik`,
      status: 'future',
      priority: 2,
      stage: 'ESCALATION',
    },
    {
      id: 'beat-lite-3',
      summary: `Puncak adegan: Klimaks dan akhir bab yang mengesankan`,
      status: 'future',
      priority: 3,
      stage: 'CLIMAX',
    },
  ];
};

export const initializeLiteProgressionState = (beats: StoryBeat[]): StoryProgressionState => {
  const currentBeat = beats[0]?.id || 'beat-lite-1';
  const futureBeats = beats.slice(1).map((b) => b.id);

  return {
    beats,
    currentBeat,
    completedBeats: [],
    futureBeats,
    chapterProgress: 0,
    currentStage: beats[0]?.stage || 'SETUP',
    allowedNextBeats: [currentBeat, beats[1]?.id].filter(Boolean) as string[],
    blockedFutureBeats: beats.slice(2).map((b) => b.id),
  };
};

/**
 * Deterministic progression updater based on current word count vs target
 * Saves 100% of LLM token costs for progress evaluation!
 */
export const updateLiteProgression = (
  currentWordCount: number,
  minWords: number,
  _maxWords: number,
  state: StoryProgressionState
): StoryProgressionState => {
  const target = Math.max(minWords, 500);
  const ratio = Math.min(1, currentWordCount / target);
  const beats = [...state.beats];

  let currentIdx = 0;
  if (ratio >= 0.75) {
    currentIdx = Math.min(beats.length - 1, 2);
  } else if (ratio >= 0.35) {
    currentIdx = Math.min(beats.length - 1, 1);
  }

  const completedBeats: string[] = [];
  const futureBeats: string[] = [];

  beats.forEach((b, idx) => {
    if (idx < currentIdx) {
      b.status = 'completed';
      completedBeats.push(b.id);
    } else if (idx === currentIdx) {
      b.status = 'current';
    } else {
      b.status = 'future';
      futureBeats.push(b.id);
    }
  });

  const currentBeatObj = beats[currentIdx] || beats[0];
  const nextBeatObj = beats[currentIdx + 1];

  return {
    beats,
    currentBeat: currentBeatObj.id,
    completedBeats,
    futureBeats,
    chapterProgress: Math.round(ratio * 100),
    currentStage: currentBeatObj.stage || 'DEVELOPMENT',
    allowedNextBeats: [currentBeatObj.id, nextBeatObj?.id].filter(Boolean) as string[],
    blockedFutureBeats: beats.slice(currentIdx + 2).map((b) => b.id),
  };
};
