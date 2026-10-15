import {
  Novel,
  GlobalConfig,
  StoryProgressionState,
  GenerationDebugInfo,
  StoryBoundaryValidationResult,
  getEffectiveThinkingLevel
} from '../../types';
import { buildLiteSmartContext } from './liteContextBuilder';
import {
  extractLiteStoryBeats,
  initializeLiteProgressionState,
  updateLiteProgression
} from './liteBeatEngine';
import {
  buildLiteInitialPrompt,
  buildLiteContinuationPrompt
} from './liteRecursiveForce';
import { callLiteGemini, stripLiteArtifacts } from './liteCaller';

export const isLiteModel = (modelId: string): boolean => {
  return modelId.includes('flash-lite') || modelId === 'gemini-3.1-flash-lite';
};

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

/**
 * Dedicated Chapter Generation Engine for Gemini 3.1 Flash Lite
 * Features:
 * - High density, token-conservative prompts
 * - Zero extra LLM roundtrips for beat tracking
 * - Streamlined Recursive Force continuation loops
 * - Selective entity Lore Lock compression
 */
export const generateChapterLite = async (
  novel: Novel,
  globalConfig: GlobalConfig,
  userPrompt: string,
  modelId: string,
  signal?: AbortSignal,
  onProgress?: (status: string) => void,
  onStreamingUpdate?: (currentFullContent: string) => void
): Promise<{
  content: string;
  progressionState?: StoryProgressionState;
  debugInfo?: GenerationDebugInfo;
}> => {
  const statusLogs: string[] = [];
  const logStatus = (msg: string) => {
    statusLogs.push(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  logStatus(`[Lite Engine] Mengaktifkan arsitektur ringkas hemat token (${modelId})...`);

  // 1. Calculate Target Words
  const isCustomActive = Boolean(globalConfig.customRecursiveForce?.active);
  let maxWords = isCustomActive
    ? Math.max(100, globalConfig.customRecursiveForce?.max || 3500)
    : globalConfig.chapterTargetWordCount || 3500;

  let minWords = isCustomActive
    ? Math.max(0, globalConfig.customRecursiveForce?.min || 1500)
    : Math.floor(maxWords * 0.65);

  if (minWords > maxWords) {
    const temp = minWords;
    minWords = maxWords;
    maxWords = temp;
  }

  // 2. Build Compact Beats & Context
  logStatus('[Lite Engine] Menyusun Story Beats & Lore Lock ringkas...');
  const beats = extractLiteStoryBeats(userPrompt);
  let progressionState = initializeLiteProgressionState(beats);
  const { systemInstruction, baseContext } = buildLiteSmartContext(novel, globalConfig, userPrompt);

  let fullDraft = '';
  let loopCount = 0;
  const MAX_LOOPS = 12; // Streamlined max loops

  while (loopCount < MAX_LOOPS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    loopCount++;

    const currentWordCount = countWords(fullDraft);
    const isFirstLoop = currentWordCount === 0;

    // Update progression state deterministically
    progressionState = updateLiteProgression(currentWordCount, minWords, maxWords, progressionState);

    // Stop condition: target reached and at least 1 loop completed
    if (!isFirstLoop && currentWordCount >= minWords) {
      logStatus(`[Lite Engine] Target kata tercapai (${currentWordCount} kata). Menyelesaikan bab.`);
      break;
    }

    // Build concise prompt
    let promptText = '';
    if (isFirstLoop) {
      logStatus(`[Lite Engine] Menulis babak pembuka adegan...`);
      promptText = buildLiteInitialPrompt(baseContext, userPrompt, progressionState, minWords, maxWords);
    } else {
      logStatus(`[Lite Engine] Melanjutkan adegan (Sesi ${loopCount}, ${currentWordCount}/${minWords} kata)...`);
      promptText = buildLiteContinuationPrompt(
        userPrompt,
        fullDraft,
        progressionState,
        currentWordCount,
        minWords,
        maxWords
      );
    }

    let chunkOutput = '';
    try {
      const customThinking = getEffectiveThinkingLevel(modelId, globalConfig);
      const response = await callLiteGemini(
        promptText,
        systemInstruction,
        globalConfig.temperature ?? 0.7,
        signal,
        (chunk) => {
          chunkOutput += chunk;
          const cleanedSoFar = stripLiteArtifacts(
            isFirstLoop ? chunkOutput : `${fullDraft}\n\n${chunkOutput}`
          );
          if (onStreamingUpdate) onStreamingUpdate(cleanedSoFar);
        },
        customThinking,
        globalConfig.safetySettings
      );

      const cleanedChunk = stripLiteArtifacts(response || chunkOutput).trim();
      if (!cleanedChunk) {
        logStatus('[Lite Engine] Tidak ada kelanjutan tambahan. Menyelesaikan bab.');
        break;
      }

      if (isFirstLoop) {
        fullDraft = cleanedChunk;
      } else {
        // Stitch without duplicate introductory overlap
        fullDraft = `${fullDraft.trim()}\n\n${cleanedChunk}`;
      }

      if (onStreamingUpdate) onStreamingUpdate(fullDraft);

      // If chunk is tiny and we've met minimal progress, exit gracefully
      const chunkWordCount = countWords(cleanedChunk);
      if (chunkWordCount < 60 && currentWordCount >= Math.floor(minWords * 0.75)) {
        break;
      }
    } catch (err: any) {
      if (signal?.aborted) throw err;
      console.warn('[Lite Engine] Loop error:', err);
      logStatus(`[Lite Engine] Peringatan: ${err.message || 'Koneksi melambat'}. Menyelesaikan bab yang ada.`);
      break;
    }
  }

  const finalWordCount = countWords(fullDraft);
  logStatus(`[Lite Engine] Selesai: Berhasil menyusun bab dengan ${finalWordCount} kata.`);

  const validation: StoryBoundaryValidationResult = {
    valid: finalWordCount >= Math.floor(minWords * 0.7),
    wordCount: finalWordCount,
    minWords,
    maxWords,
    repeatedEvents: [],
    prematureEvents: [],
    continuityIssues: [],
    boundaryViolation: false,
    repairRequired: false,
  };

  const debugInfo: GenerationDebugInfo = {
    chapterStage: progressionState.currentStage,
    currentBeat: progressionState.currentBeat,
    completedBeats: progressionState.completedBeats,
    allowedNextBeats: progressionState.allowedNextBeats || [],
    blockedFutureBeats: progressionState.blockedFutureBeats || [],
    wordCount: finalWordCount,
    minWords,
    maxWords,
    validation,
    repairPass: 0,
    generationAttempt: 1,
    statusLog: statusLogs,
  };

  return {
    content: fullDraft.trim(),
    progressionState,
    debugInfo,
  };
};
