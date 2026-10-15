
// Removed InstructionEntry and StyleEntry
export interface StyleEntry {
  id: string;
  rule: string;
  priority?: number; // Deprecated
}

export interface NovelIllustration {
  id: string;
  novelId: string;
  chapterId: string;
  chapterTitle?: string;
  selectedSnippet: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
  modelName: 'gemini-3.1-flash-lite-image' | 'gemini-3.1-flash-image';
  identifiedCharacters: {
    name: string;
    appearance: string;
  }[];
  createdAt: number;
}

export type ChapterNarrativeStage =
  | 'SETUP'
  | 'INCITING_EVENT'
  | 'EARLY_DEVELOPMENT'
  | 'DEVELOPMENT'
  | 'ESCALATION'
  | 'TURNING_POINT'
  | 'CLIMAX'
  | 'RESOLUTION';

export interface StoryBeat {
  id: string;
  summary: string;
  status: 'completed' | 'current' | 'future';
  priority: number;
  stage?: ChapterNarrativeStage;
}

export interface StoryProgressionState {
  beats: StoryBeat[];
  currentBeat: string;
  completedBeats: string[];
  futureBeats: string[];
  chapterProgress: number; // 0 - 100
  currentStage: ChapterNarrativeStage;
  allowedNextBeats?: string[];
  blockedFutureBeats?: string[];
}

export interface StoryBoundaryValidationResult {
  valid: boolean;
  wordCount: number;
  minWords: number;
  maxWords: number;
  repeatedEvents: string[];
  prematureEvents: string[];
  continuityIssues: string[];
  boundaryViolation: boolean;
  repairRequired: boolean;
  reason?: string;
  suggestedAction?: 'none' | 'compress' | 'continue' | 'retry';
}

export interface GenerationDebugInfo {
  chapterStage: ChapterNarrativeStage;
  currentBeat: string;
  completedBeats: string[];
  allowedNextBeats: string[];
  blockedFutureBeats: string[];
  wordCount: number;
  minWords: number;
  maxWords: number;
  validation: StoryBoundaryValidationResult;
  repairPass: number;
  generationAttempt: number;
  statusLog: string[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  userPrompt: string;
  createdAt: number;
  readPosition?: number;
  illustrations?: NovelIllustration[];
  progressionState?: StoryProgressionState;
  debugInfo?: GenerationDebugInfo;
}

export interface LoreCharacter {
  id: string;
  name: string;
  age: string;
  gender: string;
  appearance: string;
  personality: string;
  relationships: string;
  goals: string;
  importantHistory: string;
  currentStatus: string;
}

export interface LoreWorld {
  locations: string;
  factions: string;
  rules: string;
  importantEvents: string;
  consistentFacts: string;
}

export interface LoreChapterSummary {
  chapterNumber: number;
  chapterId: string;
  shortSummary: string;
  keyEvents: string;
  characterChanges: string;
  importantDetails: string;
}

export interface LoreDatabase {
  characters: LoreCharacter[];
  world: LoreWorld;
  chapterSummaries: LoreChapterSummary[];
  fullLoreSummary: string;
}

export type ThinkingLevelOption = 'Minimal' | 'Low' | 'Medium' | 'High';

export type SafetyThreshold = 'OFF' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';

export interface SafetySettingsConfig {
  harassment: SafetyThreshold;
  hate: SafetyThreshold;
  sexuallyExplicit: SafetyThreshold;
  dangerousContent: SafetyThreshold;
}

export const DEFAULT_SAFETY_SETTINGS: SafetySettingsConfig = {
  harassment: 'OFF',
  hate: 'OFF',
  sexuallyExplicit: 'OFF',
  dangerousContent: 'OFF',
};

export interface AIModel {
  id: string;
  name: string;
  provider?: string;
  isFree?: boolean;
  description?: string;
  supportedThinkingLevels?: ThinkingLevelOption[];
  defaultThinkingLevel?: ThinkingLevelOption;
}

export const ALL_GEMINI_MODELS: AIModel[] = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (Paling Stabil)',
    description: 'Model Flash paling stabil, responsif, dan konsisten untuk generasi bab dan naskah panjang tanpa gangguan kuota.',
    supportedThinkingLevels: ['Minimal', 'Low', 'Medium', 'High'],
    defaultThinkingLevel: 'Medium'
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows.',
    supportedThinkingLevels: ['Low', 'Medium', 'High'],
    defaultThinkingLevel: 'Medium'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    description: 'Our high-speed, efficient Flash model built for everyday coding, agentic tool use, and reliable multi-step execution.',
    supportedThinkingLevels: ['Low', 'Medium', 'High'],
    defaultThinkingLevel: 'Medium'
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'Our earlier Flash model, built for speed and foundational performance across routine, high-throughput workloads.',
    supportedThinkingLevels: ['Minimal', 'Low', 'Medium', 'High'],
    defaultThinkingLevel: 'Medium'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    description: 'Our fastest, most cost-effective 3.5 model for high-throughput execution.',
    supportedThinkingLevels: ['Minimal', 'Low', 'Medium', 'High'],
    defaultThinkingLevel: 'Minimal'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    description: 'Our latest SOTA reasoning model with unprecedented depth and nuance, and powerful multimodal understanding and coding capabilities',
    supportedThinkingLevels: ['Low', 'Medium', 'High'],
    defaultThinkingLevel: 'High'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Model ultra cepat & hemat token dengan Dedicated Lite Engine (Compact Beats, Streamlined Lore Lock, & Zero-Bloat Recursive Force).',
    supportedThinkingLevels: ['Minimal', 'Low', 'Medium', 'High'],
    defaultThinkingLevel: 'High'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Our legacy Flash model, providing baseline speed and intelligence.',
    supportedThinkingLevels: ['Minimal', 'Low', 'Medium', 'High'],
    defaultThinkingLevel: 'High'
  }
];

// Flash Lite models
export const FLASH_LITE_MODELS: AIModel[] = ALL_GEMINI_MODELS.filter(m => m.id.includes('flash-lite'));

// All available novel generation models including Flash Lite (with its dedicated engine)
export const NOVEL_GENERATION_MODELS: AIModel[] = [...ALL_GEMINI_MODELS];
export const CHAPTER_GEMINI_MODELS: AIModel[] = [...ALL_GEMINI_MODELS];
export const CHAPTER_AVAILABLE_MODELS: AIModel[] = [...CHAPTER_GEMINI_MODELS];
export const GEMINI_MODELS: AIModel[] = [...ALL_GEMINI_MODELS];
export const AVAILABLE_MODELS: AIModel[] = [...ALL_GEMINI_MODELS];

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export type NovelType = 'build' | 'fixing' | 'fanfic';

export interface Novel {
  id: string;
  title: string;
  type?: NovelType; // New: indicates what kind of novel this is
  worldLore?: string; // New: for fanfic mode
  description?: string;
  folderId?: string;
  loreDatabase?: LoreDatabase;
  loreLockEnabled?: boolean;
  coverImage?: string;
  illustrations?: NovelIllustration[];
  createdAt: number;
  updatedAt: number;
  chapters: Chapter[];
  editorSettings?: {
    fontFamily: string;
    fontSize: number;
    lineSpacing?: number;
  };
}

export interface InstructionPreset {
  id: string;
  name: string;
  content: string;
  active?: boolean;
}

export type SystemInstructionMode = 'build' | 'fixing' | 'custom';

export interface GlobalConfig {
  folders?: Folder[];
  libraryViewMode?: 'grid' | 'grid-2x2' | 'list'; // Added for persisting view mode
  instructionMode?: SystemInstructionMode;
  customModeType?: 'build' | 'fixing';
  customInstruction?: string;
  instructionPresets?: InstructionPreset[];
  activeInstructionIds?: string[];
  styles: StyleEntry[];
  temperature: number; // New field for creativity control
  highThinkingMode?: boolean; // Controls whether AI uses full thinking mode or minimal (legacy)
  thinkingLevel?: ThinkingLevelOption; // Global preferred thinking level
  modelThinkingLevels?: Record<string, ThinkingLevelOption>; // Per-model thinking levels
  safetySettings?: SafetySettingsConfig; // Safety threshold settings
  chapterTargetWordCount?: number; // 0 or null means Unlimited
  customRecursiveForce?: {
    active: boolean;
    min: number;
    max: number;
  };
  disableAnimations?: boolean;
  promptPriorityOrder?: string[];
  enableDebugMode?: boolean;
}

export const getSupportedThinkingLevels = (modelId: string): ThinkingLevelOption[] => {
  const normalizedId = modelId === 'gemini-3.0-flash' ? 'gemini-3-flash-preview' : modelId;
  const model = AVAILABLE_MODELS.find((m) => m.id === normalizedId || m.id === modelId);
  return model?.supportedThinkingLevels || ['Low', 'Medium', 'High'];
};

export const getEffectiveThinkingLevel = (
  modelId: string,
  config?: GlobalConfig
): ThinkingLevelOption => {
  const supported = getSupportedThinkingLevels(modelId);
  const normalizedId = modelId === 'gemini-3.0-flash' ? 'gemini-3-flash-preview' : modelId;

  // Check per-model override first
  const perModel = config?.modelThinkingLevels?.[normalizedId] || config?.modelThinkingLevels?.[modelId];
  if (perModel && supported.includes(perModel)) {
    return perModel;
  }

  // Check global preference
  const globalPref = config?.thinkingLevel;
  if (globalPref && supported.includes(globalPref)) {
    return globalPref;
  }

  // Model default
  const model = AVAILABLE_MODELS.find((m) => m.id === normalizedId || m.id === modelId);
  if (model?.defaultThinkingLevel && supported.includes(model.defaultThinkingLevel)) {
    return model.defaultThinkingLevel;
  }

  return supported.includes('Medium') ? 'Medium' : supported[0];
};

export type ViewMode = 'HOME' | 'LIBRARY' | 'NOVEL_VIEW' | 'SETTINGS';
