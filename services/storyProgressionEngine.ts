import { 
  Novel, 
  GlobalConfig, 
  StoryBeat, 
  StoryProgressionState, 
  ChapterNarrativeStage, 
  StoryBoundaryValidationResult,
  getEffectiveThinkingLevel 
} from '../types';
import { 
  callAIStoryRouter, 
  countWords, 
  cleanStoryChunk, 
  buildSmartContext 
} from './aiService';

// Stage flow order
const STAGE_ORDER: ChapterNarrativeStage[] = [
  'SETUP',
  'INCITING_EVENT',
  'EARLY_DEVELOPMENT',
  'DEVELOPMENT',
  'ESCALATION',
  'TURNING_POINT',
  'CLIMAX',
  'RESOLUTION'
];

/**
 * Parses user story prompt into ordered story beats.
 * If model fails or prompt is short, uses deterministic fallback extraction.
 */
export const extractStoryBeats = async (
  userPrompt: string,
  modelId: string,
  signal?: AbortSignal
): Promise<StoryBeat[]> => {
  const promptText = userPrompt.trim();
  if (!promptText) {
    return [
      {
        id: 'beat_01',
        summary: 'Pengenalan situasi dan tindakan awal karakter',
        status: 'current',
        priority: 1,
        stage: 'SETUP'
      }
    ];
  }

  const extractionPrompt = `You are a narrative architecture engine.
Analyze the user's novel prompt and decompose it into an ordered list of sequential story beats.
Deconstruct the sequence of events from beginning to end.

Rules:
1. Each beat represents a single discrete event, realization, transition, or action.
2. Assign one of these stages to each beat: SETUP, INCITING_EVENT, EARLY_DEVELOPMENT, DEVELOPMENT, ESCALATION, TURNING_POINT, CLIMAX, RESOLUTION.
3. Be faithful to the user's prompt. Do NOT invent unrelated subplots.
4. Output STRICT JSON format only, with no markdown code blocks and no conversational text.

JSON Schema:
[
  {
    "id": "beat_01",
    "summary": "Concise summary of event/action (1-2 sentences)",
    "stage": "SETUP"
  }
]

User Story Prompt:
"""
${promptText}
"""`;

  try {
    const rawResult = await callAIStoryRouter(
      modelId,
      extractionPrompt,
      0.1,
      signal,
      undefined,
      "You are a structured narrative decomposition tool. Return strictly a raw JSON array.",
      false
    );

    const cleaned = rawResult
      .replace(/```(?:json)?/gi, '')
      .replace(/```/gi, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: any, idx: number) => {
        const stageVal: ChapterNarrativeStage = STAGE_ORDER.includes(item.stage) ? item.stage : 'SETUP';
        return {
          id: item.id || `beat_${String(idx + 1).padStart(2, '0')}`,
          summary: String(item.summary || item.title || `Beat ${idx + 1}`),
          status: idx === 0 ? 'current' : 'future',
          priority: idx + 1,
          stage: stageVal
        };
      });
    }
  } catch (err) {
    console.warn('[StoryProgression] AI beat extraction fallback to deterministic rules:', err);
  }

  // Deterministic fallback: split prompt by sentences / bullet points
  const lines = promptText
    .split(/\n+|(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (lines.length === 0) {
    return [
      {
        id: 'beat_01',
        summary: promptText.slice(0, 160),
        status: 'current',
        priority: 1,
        stage: 'SETUP'
      }
    ];
  }

  return lines.map((line, idx) => {
    let stage: ChapterNarrativeStage = 'DEVELOPMENT';
    if (idx === 0) stage = 'SETUP';
    else if (idx === 1) stage = 'INCITING_EVENT';
    else if (idx === 2) stage = 'EARLY_DEVELOPMENT';
    else if (idx === lines.length - 1) stage = 'RESOLUTION';
    else if (idx === lines.length - 2) stage = 'CLIMAX';

    return {
      id: `beat_${String(idx + 1).padStart(2, '0')}`,
      summary: line,
      status: idx === 0 ? 'current' : 'future',
      priority: idx + 1,
      stage
    };
  });
};

/**
 * Initializes story progression state from beats.
 */
export const initializeProgressionState = (beats: StoryBeat[]): StoryProgressionState => {
  const currentBeat = beats[0]?.id || 'beat_01';
  const futureBeats = beats.slice(1).map(b => b.id);
  const currentStage = beats[0]?.stage || 'SETUP';
  const allowedNextBeats = beats.slice(0, 2).map(b => b.id);
  const blockedFutureBeats = beats.slice(2).map(b => b.id);

  return {
    beats,
    currentBeat,
    completedBeats: [],
    futureBeats,
    chapterProgress: 0,
    currentStage,
    allowedNextBeats,
    blockedFutureBeats
  };
};

/**
 * Evaluates draft against beats and determines completed, current, and future beats.
 */
export const updateProgressionState = async (
  currentDraft: string,
  currentState: StoryProgressionState,
  modelId: string,
  signal?: AbortSignal
): Promise<StoryProgressionState> => {
  const words = countWords(currentDraft);
  if (words < 120 || currentState.beats.length <= 1) {
    return currentState;
  }

  // Sample recent and key portions of currentDraft
  const draftExcerpt = currentDraft.length > 4000 ? currentDraft.slice(-4000) : currentDraft;

  const evaluationPrompt = `You are a strict narrative progression auditor.
Compare the novel draft against the chronological story beats. Determine which beats have been ACTUALLY WRITTEN into the prose.

STORY BEATS LIST:
${currentState.beats.map(b => `- ID: ${b.id} | Stage: ${b.stage || 'N/A'} | Summary: ${b.summary}`).join('\n')}

DRAFT EXCERPT (Ending section):
"""
${draftExcerpt}
"""

Rules:
1. Mark a beat as "completed" ONLY if the events in that beat have already clearly occurred in the text.
2. Mark the beat that is currently unfolding as "current".
3. Any beats that have NOT yet happened must remain "future".
4. Do NOT mark future climax or resolution beats as completed if they have not been written.
5. Output STRICT JSON format with no markdown wrappers.

JSON Schema:
{
  "completedBeatIds": ["beat_01"],
  "currentBeatId": "beat_02",
  "reason": "Brief note on current narrative position"
}`;

  try {
    const rawResult = await callAIStoryRouter(
      modelId,
      evaluationPrompt,
      0.1,
      signal,
      undefined,
      "You are a narrative auditor. Return raw JSON matching the requested schema.",
      false
    );

    const cleaned = rawResult
      .replace(/```(?:json)?/gi, '')
      .replace(/```/gi, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const completedSet = new Set<string>(
      Array.isArray(parsed.completedBeatIds) ? parsed.completedBeatIds : currentState.completedBeats
    );
    let currentId = parsed.currentBeatId || currentState.currentBeat;

    // Validate currentId exists
    if (!currentState.beats.some(b => b.id === currentId)) {
      currentId = currentState.beats.find(b => !completedSet.has(b.id))?.id || currentState.currentBeat;
    }

    const updatedBeats = currentState.beats.map(b => {
      if (completedSet.has(b.id)) {
        return { ...b, status: 'completed' as const };
      }
      if (b.id === currentId) {
        return { ...b, status: 'current' as const };
      }
      return { ...b, status: 'future' as const };
    });

    const currentIndex = updatedBeats.findIndex(b => b.id === currentId);
    const completedBeats = updatedBeats.filter(b => b.status === 'completed').map(b => b.id);
    const futureBeats = updatedBeats.filter(b => b.status === 'future').map(b => b.id);

    // Allowed beats: current and at most 1 next beat in sequence
    const allowedNextBeats: string[] = [currentId];
    if (currentIndex >= 0 && currentIndex + 1 < updatedBeats.length) {
      allowedNextBeats.push(updatedBeats[currentIndex + 1].id);
    }

    const blockedFutureBeats = updatedBeats
      .slice(Math.max(0, currentIndex + 2))
      .map(b => b.id);

    const currentStage = updatedBeats[currentIndex]?.stage || currentState.currentStage;
    const progress = Math.min(100, Math.round((completedBeats.length / updatedBeats.length) * 100));

    return {
      beats: updatedBeats,
      currentBeat: currentId,
      completedBeats,
      futureBeats,
      chapterProgress: progress,
      currentStage,
      allowedNextBeats,
      blockedFutureBeats
    };
  } catch (err) {
    console.warn('[StoryProgression] Progression audit fallback to sequential step:', err);
    return currentState;
  }
};

/**
 * Validates word counts and story boundary rules.
 */
export const validateStoryBoundaries = async (
  draft: string,
  progression: StoryProgressionState,
  minWords: number,
  maxWords: number,
  modelId: string,
  signal?: AbortSignal
): Promise<StoryBoundaryValidationResult> => {
  const wordCount = countWords(draft);

  // 1. Strict Word Count Checks
  if (minWords > 0 && wordCount < minWords) {
    return {
      valid: false,
      wordCount,
      minWords,
      maxWords,
      repeatedEvents: [],
      prematureEvents: [],
      continuityIssues: [],
      boundaryViolation: false,
      repairRequired: true,
      reason: `Word count (${wordCount}) below minimum required (${minWords} words).`,
      suggestedAction: 'continue'
    };
  }

  if (maxWords > 0 && wordCount > maxWords) {
    return {
      valid: false,
      wordCount,
      minWords,
      maxWords,
      repeatedEvents: [],
      prematureEvents: [],
      continuityIssues: [],
      boundaryViolation: true,
      repairRequired: true,
      reason: `Word count (${wordCount}) exceeds maximum allowed (${maxWords} words).`,
      suggestedAction: 'compress'
    };
  }

  // 2. Boundary Check on Blocked Future Beats
  const blockedBeats = progression.beats.filter(b => progression.blockedFutureBeats?.includes(b.id));
  if (blockedBeats.length === 0) {
    return {
      valid: true,
      wordCount,
      minWords,
      maxWords,
      repeatedEvents: [],
      prematureEvents: [],
      continuityIssues: [],
      boundaryViolation: false,
      repairRequired: false
    };
  }

  // Quick boundary evaluation
  const tailText = draft.length > 3500 ? draft.slice(-3500) : draft;
  const boundaryCheckPrompt = `You are a story boundary auditor.
Check if the novel draft prematurely triggered any of the BLOCKED FUTURE EVENTS.

BLOCKED FUTURE EVENTS (FORBIDDEN FOR THIS CHAPTER):
${blockedBeats.map(b => `- ${b.id}: ${b.summary}`).join('\n')}

DRAFT EXCERPT:
"""
${tailText}
"""

Did the draft prematurely conclude or execute the blocked events listed above?
Respond with JSON only:
{
  "prematureEventsDetected": ["beat_id_if_any"],
  "repeatedEventsDetected": [],
  "hasBoundaryViolation": false,
  "reason": "..."
}`;

  try {
    const rawResult = await callAIStoryRouter(
      modelId,
      boundaryCheckPrompt,
      0.1,
      signal,
      undefined,
      "You are a boundary audit engine. Output raw JSON only.",
      false
    );

    const cleaned = rawResult.replace(/```(?:json)?/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    const premature = Array.isArray(parsed.prematureEventsDetected) ? parsed.prematureEventsDetected : [];
    const repeated = Array.isArray(parsed.repeatedEventsDetected) ? parsed.repeatedEventsDetected : [];
    const hasViolation = Boolean(parsed.hasBoundaryViolation || premature.length > 0);

    return {
      valid: !hasViolation,
      wordCount,
      minWords,
      maxWords,
      repeatedEvents: repeated,
      prematureEvents: premature,
      continuityIssues: [],
      boundaryViolation: hasViolation,
      repairRequired: hasViolation,
      reason: parsed.reason || (hasViolation ? 'Premature future story beat detected.' : undefined),
      suggestedAction: hasViolation ? 'retry' : 'none'
    };
  } catch (err) {
    // If boundary check call fails, rely on word count boundaries
    return {
      valid: true,
      wordCount,
      minWords,
      maxWords,
      repeatedEvents: [],
      prematureEvents: [],
      continuityIssues: [],
      boundaryViolation: false,
      repairRequired: false
    };
  }
};

/**
 * Repairs an oversized chapter via structured narrative compression.
 * Preserves POV, chronological events, core dialogue, and sensory weight while reducing fluff.
 * Includes retry mechanism if first compression attempt remains over maxWords.
 */
export const repairOversizedChapter = async (
  draft: string,
  minWords: number,
  maxWords: number,
  novel: Novel,
  globalConfig: GlobalConfig,
  modelId: string,
  onProgress?: (status: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  let currentDraft = draft;
  let currentCount = countWords(currentDraft);
  const MAX_RETRY_PASSES = 2;

  for (let pass = 1; pass <= MAX_RETRY_PASSES; pass++) {
    if (currentCount <= maxWords) {
      break;
    }

    const compressionRatio = pass === 1 ? 0.88 : 0.80;
    const targetCompress = Math.max(minWords, Math.floor(maxWords * compressionRatio));

    if (onProgress) {
      onProgress(`Menjalankan Repair Pass (Percobaan ${pass}/${MAX_RETRY_PASSES}): Mengompresi draf (${currentCount} kata -> target ~${targetCompress} kata)...`);
    }

    const { systemInstruction } = buildSmartContext(novel, globalConfig, modelId);

    const compressionPrompt = `You are a master literary editor performing an essential word-count compression repair.
The author's chapter generated ${currentCount} words, which violates the hard upper limit of ${maxWords} words.

YOUR MANDATE:
Rewrite and streamline the chapter text so that its word count is between ${minWords} and ${maxWords} words (Target: ~${targetCompress} words).

STRICT PRESERVATION RULES:
1. Preserve exact Point of View (POV) and tense.
2. Preserve the exact chronological sequence of events and character decisions.
3. Preserve all crucial character insights, sensory atmosphere, and pivotal dialogue.
4. DO NOT introduce any new story events or future plotlines.
5. Eliminate redundant narration, purple prose, verbal filler, and repetitive thoughts.
6. The entire chapter MUST remain complete and cohesive with a natural ending.
7. Output 100% pure story prose only. Never output commentary, notes, or chapter headers.
${pass > 1 ? `8. CRITICAL WARNING: The previous revision was still ${currentCount} words (> ${maxWords}). You MUST be more concise and strictly cut non-essential filler sentences!` : ''}

[MANUSCRIPT TO REPAIR]:
${currentDraft}`;

    const repaired = await callAIStoryRouter(
      modelId,
      compressionPrompt,
      0.3,
      signal,
      undefined,
      systemInstruction,
      false,
      getEffectiveThinkingLevel(modelId, globalConfig),
      globalConfig.safetySettings
    );

    const cleanRepaired = cleanStoryChunk(repaired);
    const newCount = countWords(cleanRepaired);

    if (newCount > 0 && newCount <= maxWords) {
      return cleanRepaired;
    }

    if (newCount > 0 && newCount < currentCount) {
      currentDraft = cleanRepaired;
      currentCount = newCount;
    }
  }

  return currentDraft;
};

/**
 * Repairs premature story resolution where future blocked events leaked into the chapter.
 * Trims or rewrites the ending to stop at the current beat without jumping ahead.
 */
export const repairPrematureEnding = async (
  draft: string,
  prematureBeats: string[],
  currentBeat: StoryBeat,
  minWords: number,
  maxWords: number,
  novel: Novel,
  globalConfig: GlobalConfig,
  modelId: string,
  onProgress?: (status: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  if (onProgress) {
    onProgress(`Memperbaiki batas cerita: Menghapus lompatan alur atau resolusi masa depan prematur...`);
  }

  const { systemInstruction } = buildSmartContext(novel, globalConfig, modelId);

  const repairPrompt = `You are a master fiction editor fixing a premature story resolution.
The current chapter prematurely executed future story events that are forbidden for this chapter.

CURRENT INTENDED CHAPTER SCOPE:
- Target Stage: ${currentBeat.stage || 'DEVELOPMENT'}
- Focus Event: ${currentBeat.summary}

PREMATURE / BLOCKED EVENTS THAT LEAKED INTO THIS DRAFT (MUST BE REMOVED FROM ENDING):
${prematureBeats.map(b => `- ${b}`).join('\n')}

YOUR MANDATE:
1. Revise the ending section of the manuscript so that the story STOPS naturally within the scope of [CURRENT INTENDED CHAPTER SCOPE].
2. REMOVE all premature resolutions, future events, or rushed endings that touched the blocked events.
3. Bring the scene to an organic, suspenseful, or natural chapter pause.
4. Word count MUST remain between ${minWords} and ${maxWords} words.
5. Output 100% pure story manuscript only. No conversational notes or chapter titles.

[MANUSCRIPT TO REPAIR]:
${draft}`;

  try {
    const repaired = await callAIStoryRouter(
      modelId,
      repairPrompt,
      0.3,
      signal,
      undefined,
      systemInstruction,
      false,
      getEffectiveThinkingLevel(modelId, globalConfig),
      globalConfig.safetySettings
    );

    const cleanRepaired = cleanStoryChunk(repaired);
    const newCount = countWords(cleanRepaired);

    if (newCount >= Math.min(minWords, 300) && newCount <= maxWords + 200) {
      return cleanRepaired;
    }
  } catch (err) {
    console.warn('[StoryProgression] repairPrematureEnding fallback to original:', err);
  }

  return draft;
};
