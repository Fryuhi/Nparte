import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Novel, Chapter, GlobalConfig } from "../types";
import { generateNovelSuggestion, generateWorldLore } from "../services/aiService";
import {
  ChevronLeft,
  Settings,
  X,
  Maximize2,
  Trash2,
  AlertTriangle,
  Loader2,
  BookOpen,
  Square,
  Zap,
  ArrowUp,
  Lock,
  Unlock,
  Plus,
  Minus,
  BookImage,
  Globe,
  Sparkles,
  Image as ImageIcon,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CHAPTER_AVAILABLE_MODELS } from "../types";
import { generationStore } from "../services/generationStore";
import { ModelSelectorPanel } from "./ModelSelectorPanel";
import { LoreLockModal } from "./LoreLockModal";
import { LoreExtractModal } from "./LoreExtractModal";
import { CoverMakerModal } from "./CoverMakerModal";
import { WorldLoreModal } from "./WorldLoreModal";
import { IllustrationMakerModal } from "./IllustrationMakerModal";
import { NovelIllustrationsGalleryModal } from "./NovelIllustrationsGalleryModal";
import { InlineChapterContent } from "./InlineChapterContent";

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SETUP: { 
    label: 'Tahap 1: Setup Awal', 
    color: 'text-sky-600 dark:text-sky-400', 
    bg: 'bg-sky-50 dark:bg-sky-950/40', 
    border: 'border-sky-200/80 dark:border-sky-800/60' 
  },
  INCITING_EVENT: { 
    label: 'Tahap 2: Titik Pemicu', 
    color: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-50 dark:bg-amber-950/40', 
    border: 'border-amber-200/80 dark:border-amber-800/60' 
  },
  EARLY_DEVELOPMENT: { 
    label: 'Tahap 3: Eskalasi Awal', 
    color: 'text-indigo-600 dark:text-indigo-400', 
    bg: 'bg-indigo-50 dark:bg-indigo-950/40', 
    border: 'border-indigo-200/80 dark:border-indigo-800/60' 
  },
  DEVELOPMENT: { 
    label: 'Tahap 4: Pengembangan Konflik', 
    color: 'text-blue-600 dark:text-blue-400', 
    bg: 'bg-blue-50 dark:bg-blue-950/40', 
    border: 'border-blue-200/80 dark:border-blue-800/60' 
  },
  ESCALATION: { 
    label: 'Tahap 5: Ketegangan Meningkat', 
    color: 'text-orange-600 dark:text-orange-400', 
    bg: 'bg-orange-50 dark:bg-orange-950/40', 
    border: 'border-orange-200/80 dark:border-orange-800/60' 
  },
  TURNING_POINT: { 
    label: 'Tahap 6: Titik Balik', 
    color: 'text-rose-600 dark:text-rose-400', 
    bg: 'bg-rose-50 dark:bg-rose-950/40', 
    border: 'border-rose-200/80 dark:border-rose-800/60' 
  },
  CLIMAX: { 
    label: 'Tahap 7: Klimaks Bab', 
    color: 'text-red-600 dark:text-red-400', 
    bg: 'bg-red-50 dark:bg-red-950/40', 
    border: 'border-red-200/80 dark:border-red-800/60' 
  },
  RESOLUTION: { 
    label: 'Tahap 8: Resolusi Bab', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    border: 'border-emerald-200/80 dark:border-emerald-800/60' 
  },
};

const formatModelDisplayName = (modelId: string) => {
  if (!modelId) return "";
  const found = CHAPTER_AVAILABLE_MODELS.find(m => m.id === modelId);
  if (found) return found.name;
  return modelId
    .replace(/^gemini-/i, "Gemini ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const parseGenerationProgress = (
  rawStatus: string,
  fallbackModel: string,
  currentWords: number,
  targetWords?: number
) => {
  let mainTitle = "Menulis Naskah Cerita...";
  let subtitle = "AI sedang menyusun rangkaian narasi dan dialog bab";
  let session = "";
  let extractedModel = fallbackModel;
  let pct: number | null = null;

  if (rawStatus) {
    const modelMatch = rawStatus.match(/\(Model:\s*([^)]+)\)/i);
    if (modelMatch) {
      extractedModel = modelMatch[1].trim();
    }

    const sessionMatch = rawStatus.match(/Sesi\s*(\d+)/i);
    if (sessionMatch) {
      session = `Sesi ${sessionMatch[1]}`;
    }

    const pctMatch = rawStatus.match(/(\d+)%/);
    if (pctMatch) {
      pct = parseInt(pctMatch[1], 10);
    }

    if (/mempersiapkan arsitektur story beats/i.test(rawStatus)) {
      mainTitle = "Menyiapkan Kerangka Story Beats";
      subtitle = "Menganalisis premis & merancang tahapan babak naratif";
    } else if (/memeriksa progres alur cerita/i.test(rawStatus)) {
      mainTitle = "Mengevaluasi Progres Alur Cerita";
      subtitle = `Meninjau kesinambungan naskah (${currentWords} kata tersusun)`;
    } else if (/menulis bab/i.test(rawStatus)) {
      mainTitle = session ? `Menulis Draf Naskah (${session})` : "Menulis Draf Naskah Bab";
      subtitle = pct 
        ? `Progres penyusunan cerita mencapai ~${pct}% target` 
        : `Sedang mengalirkan narasi dan dialog realistis...`;
    } else if (/sesi sambungan terhenti|pemulihan otomatis/i.test(rawStatus)) {
      mainTitle = "Menyambung Kembali Naskah";
      subtitle = "Memulihkan aliran cerita dari titik terakhir secara mulus";
    } else if (/menyelesaikan cerita secara alami/i.test(rawStatus)) {
      mainTitle = "Finalisasi Bab Selesai";
      subtitle = "Bab berhasil ditutup dengan wajar dan proporsional";
    } else {
      mainTitle = rawStatus
        .replace(/\([^)]+\)/g, "")
        .replace(/-\s*Sesi\s*\d+/gi, "")
        .replace(/\.{2,}/g, "")
        .trim();
      subtitle = "Sedang memproses penulisan bab...";
    }
  }

  if (pct === null && targetWords && targetWords > 0 && currentWords > 0) {
    pct = Math.min(100, Math.round((currentWords / targetWords) * 100));
  }

  return {
    mainTitle,
    subtitle,
    session,
    modelName: formatModelDisplayName(extractedModel),
    pct
  };
};

interface NovelViewProps {
  novel: Novel;
  globalConfig: GlobalConfig;
  onBack: () => void;
  onUpdateNovel: (updatedNovel: Novel) => void;
  onUpdateConfig: (config: GlobalConfig) => void;
  activeGeneration?: {
    isGenerating: boolean;
    chapterId: string | null;
    content: string;
    status: string;
  };
  onGenerate: (
    novelId: string,
    prompt: string,
    modelId: string,
    config: GlobalConfig,
  ) => void;
  onReviseChapter?: (novelId: string, chapterId: string, content: string, mode: 'pro' | 'lite' | string) => void;
  onStop: () => void;
}

const FONTS = [
  { id: "sans", name: "Open Sans", value: "Open Sans, sans-serif" },
  { id: "serif", name: "Merriweather", value: "Merriweather, serif" },
];

export const NovelView: React.FC<NovelViewProps> = ({
  novel,
  globalConfig,
  onBack,
  onUpdateNovel,
  onUpdateConfig,
  onGenerate,
  onReviseChapter,
  onStop,
}) => {
  // --- STATE ---
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(CHAPTER_AVAILABLE_MODELS[0].id);

  // Status States from generationStore
  const [genState, setGenState] = useState(() => generationStore.getState());
  const [revisingModeFor, setRevisingModeFor] = useState<string | null>(null);

  useEffect(() => {
    return generationStore.subscribe(() => {
      setGenState(generationStore.getState());
    });
  }, []);

  const isGenerating = genState.isGenerating && genState.novelId === novel.id;
  const generationStatus = isGenerating ? genState.status : "";
  const streamingContent = isGenerating ? genState.content : "";
  const streamingChapterId = isGenerating ? genState.chapterId : null;
  const isGeneratingLore = genState.isGeneratingLore || false;

  // UI States
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showLoreModal, setShowLoreModal] = useState(false);
  const [showLoreExtractModal, setShowLoreExtractModal] = useState(false);
  const [showWorldLoreModal, setShowWorldLoreModal] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(
    null,
  );

  // --- ILUSTRASI MAKER & ANDROID TEXT SELECTION STATES ---
  const [showIllustrationModal, setShowIllustrationModal] = useState(false);
  const [illustrationSnippet, setIllustrationSnippet] = useState("");
  const [activeIllustrationChapter, setActiveIllustrationChapter] = useState<{ id: string; title: string } | null>(null);
  const [showIllustrationsGallery, setShowIllustrationsGallery] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string; snippet?: string } | null>(null);

  // Floating Context Bar for Text Selection (Android & Desktop)
  const [selectionPopup, setSelectionPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
    chapterId?: string;
    chapterTitle?: string;
  } | null>(null);

  // Illustration deletion modal state
  const [illustrationToDelete, setIllustrationToDelete] = useState<string | null>(null);

  const handleDeleteIllustration = (illustrationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIllustrationToDelete(illustrationId);
  };

  const confirmDeleteIllustration = () => {
    if (!illustrationToDelete) return;
    const id = illustrationToDelete;
    const updatedIllustrations = (novel.illustrations || []).filter(
      (item) => item.id !== id
    );
    const updatedChapters = novel.chapters.map((chap) => {
      if (chap.illustrations) {
        return {
          ...chap,
          illustrations: chap.illustrations.filter((item) => item.id !== id),
        };
      }
      return chap;
    });

    onUpdateNovel({
      ...novel,
      illustrations: updatedIllustrations,
      chapters: updatedChapters,
      updatedAt: Date.now(),
    });

    if (lightboxImage?.url && novel.illustrations?.find((i) => i.id === id)?.imageUrl === lightboxImage.url) {
      setLightboxImage(null);
    }
    setIllustrationToDelete(null);
  };

  // Selection detection handler
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 4) {
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const chapterElement = (
      container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement)
        : container.parentElement
    )?.closest("[data-chapter-id]");

    if (chapterElement) {
      const chapId = chapterElement.getAttribute("data-chapter-id") || undefined;
      const chapTitle = chapterElement.getAttribute("data-chapter-title") || undefined;
      const rect = range.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640;
      
      let x = isMobile ? viewportWidth / 2 : rect.left + rect.width / 2;
      let y = rect.top - 54;
      if (y < 60) {
        y = rect.bottom + 12;
      }

      setSelectionPopup({
        visible: true,
        x,
        y,
        text,
        chapterId: chapId,
        chapterTitle: chapTitle,
      });
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 80);
    };
    const handleTouchEnd = () => {
      setTimeout(handleSelectionChange, 120);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const openIllustrationMakerForSnippet = (snippetText: string, chapId?: string, chapTitle?: string) => {
    setIllustrationSnippet(snippetText);
    if (chapId) {
      setActiveIllustrationChapter({ id: chapId, title: chapTitle || "Bab Novel" });
    } else {
      setActiveIllustrationChapter(null);
    }
    setSelectionPopup(null);
    setShowIllustrationModal(true);
  };

  // Modals & Overlays
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);

  // Fullscreen Editor / Reader
  const [fullScreenChapterId, setFullScreenChapterId] = useState<string | null>(
    null,
  );
  const [editContent, setEditContent] = useState("");
  const [isFullScreenEditMode, setIsFullScreenEditMode] = useState(false);

  // New States
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [showSuggestMenu, setShowSuggestMenu] = useState(false);
  const [suggestMode, setSuggestMode] = useState<'building' | 'fixing'>('building');
  const [showReviseLiteMenuFor, setShowReviseLiteMenuFor] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToast, setShowScrollToast] = useState(false);
  const [isPromptFocused, setIsPromptFocused] = useState(false);

  // Viewport tracking removed

  // Editor Appearance
  const [fontFamily, setFontFamily] = useState(
    localStorage.getItem('user_display_font') || novel.editorSettings?.fontFamily || "Open Sans",
  );
  const [fontSize, setFontSize] = useState(
    parseInt(localStorage.getItem('user_display_size') || '0', 10) || novel.editorSettings?.fontSize || 15,
  );
  const [lineSpacing, setLineSpacing] = useState(
    parseInt(localStorage.getItem('user_display_spacing') || '0', 10) || novel.editorSettings?.lineSpacing || 4,
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync internal state with props
  useEffect(() => {
    setFontFamily(localStorage.getItem('user_display_font') || novel.editorSettings?.fontFamily || "Open Sans");
    setFontSize(parseInt(localStorage.getItem('user_display_size') || '0', 10) || novel.editorSettings?.fontSize || 15);
    setLineSpacing(parseInt(localStorage.getItem('user_display_spacing') || '0', 10) || novel.editorSettings?.lineSpacing || 4);
    if (novel.chapters.length > 0 && !expandedChapterId && !isGenerating) {
      setExpandedChapterId(novel.chapters[novel.chapters.length - 1].id);
    }
  }, [novel.id, novel.chapters.length, novel.editorSettings]);

  // Auto-expand streaming chapter when generation starts
  useEffect(() => {
    if (isGenerating && streamingChapterId) {
      setExpandedChapterId(streamingChapterId);
    }
  }, [isGenerating, streamingChapterId]);

  // Fix textarea height bug: reset to auto when prompt is cleared
  useEffect(() => {
    if (currentPrompt === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    } else if (textareaRef.current && currentPrompt !== "") {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [currentPrompt]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [novel.chapters.length]);

  // Sync streaming content to fullscreen editor if open
  useEffect(() => {
    if (fullScreenChapterId === streamingChapterId && isGenerating) {
      setEditContent(streamingContent);
    }
  }, [streamingContent, fullScreenChapterId, streamingChapterId, isGenerating]);

  // Restore scroll position when opening fullscreen in read mode
  useEffect(() => {
    if (
      fullScreenChapterId &&
      !isFullScreenEditMode &&
      scrollContainerRef.current
    ) {
      const activeChapter = novel.chapters.find(
        (c) => c.id === fullScreenChapterId,
      );
      
      const savedPosStr = localStorage.getItem(`novel_read_pos_${fullScreenChapterId}`);
      let posToRestore = 0;
      
      if (activeChapter && activeChapter.readPosition && activeChapter.readPosition > 0) {
        posToRestore = activeChapter.readPosition;
      } else if (savedPosStr) {
        posToRestore = parseInt(savedPosStr, 10);
      }
      
      if (posToRestore > 0) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = posToRestore;
            setShowScrollToast(true);
            setTimeout(() => setShowScrollToast(false), 2500);
          }
        }, 10);
      }
    }
  }, [fullScreenChapterId, isFullScreenEditMode]);

  // --- ACTIONS ---

  const handleManualLoreSync = () => {
    setShowLoreExtractModal(true);
  };

  const handleGenerate = () => {
    if (!currentPrompt.trim()) return;
    onGenerate(novel.id, currentPrompt, selectedModel, globalConfig);
    setCurrentPrompt("");
  };

  const handleStop = () => {
    onStop();
  };

  // Removed triggerAutoSummary as it's now handled in App.tsx or can be kept here if needed for manual triggers
  // But for the generation flow, App.tsx handles it.

  // ... (handleManualSummary, confirmDeleteChapter, handleSaveMemory, handleSaveSettings, openFullscreen, saveFullscreenContent, handleExportTxt remain unchanged)

  const confirmDeleteChapter = () => {
    if (!chapterToDelete) return;

    const chapterIndexToDelete = novel.chapters.findIndex(c => c.id === chapterToDelete);
    const updatedChapters = novel.chapters.filter(
      (c) => c.id !== chapterToDelete,
    );
    
    const updatedNovel = { ...novel, chapters: updatedChapters };
    
    if (updatedChapters.length === 0) {
      updatedNovel.loreDatabase = undefined;
      updatedNovel.loreLockEnabled = false;
      onUpdateNovel(updatedNovel);
    } else {
      if (novel.loreDatabase) {
        // Update Lore Database locally without re-syncing from AI
        let filteredSummaries = novel.loreDatabase.chapterSummaries;
        if (chapterIndexToDelete !== -1) {
          filteredSummaries = novel.loreDatabase.chapterSummaries
            .filter((_, index) => index !== chapterIndexToDelete)
            .map((s, index) => ({
              ...s,
              chapterNumber: index + 1
            }));
        }
        
        updatedNovel.loreDatabase = {
          ...novel.loreDatabase,
          chapterSummaries: filteredSummaries
        };
      }
      onUpdateNovel(updatedNovel);
    }
    
    setChapterToDelete(null);
    if (expandedChapterId === chapterToDelete) setExpandedChapterId(null);
  };

  const openFullscreen = (chapter: Chapter, initialEditMode = false) => {
    setFullScreenChapterId(chapter.id);
    setEditContent(chapter.content);
    setIsFullScreenEditMode(initialEditMode);
  };

  const handleFullscreenScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (fullScreenChapterId && !isFullScreenEditMode) {
      const scrollTop = e.currentTarget.scrollTop;
      localStorage.setItem(`novel_read_pos_${fullScreenChapterId}`, scrollTop.toString());
    }
  };

  const closeFullscreen = () => {
    if (fullScreenChapterId && scrollContainerRef.current) {
      const updatedChapters = novel.chapters.map((c) =>
        c.id === fullScreenChapterId
          ? { ...c, readPosition: scrollContainerRef.current?.scrollTop }
          : c,
      );
      onUpdateNovel({
        ...novel,
        chapters: updatedChapters,
        updatedAt: Date.now(),
      });
    }
    setFullScreenChapterId(null);
  };

  const saveFullscreenContent = () => {
    if (!fullScreenChapterId) return;
    const updatedChapters = novel.chapters.map((c) =>
      c.id === fullScreenChapterId ? { ...c, content: editContent } : c,
    );
    onUpdateNovel({
      ...novel,
      chapters: updatedChapters,
      updatedAt: Date.now(),
    });
    setIsFullScreenEditMode(false);
  };

  const handleSuggestPrompt = async (modelId: string, mode: 'building' | 'fixing') => {
    setIsGeneratingSuggestion(true);
    setShowSuggestMenu(false);
    try {
      const promptToPass = mode === 'fixing' ? currentPrompt : ""; 
      const suggestion = await generateNovelSuggestion(
        novel,
        globalConfig,
        modelId,
        promptToPass,
      );
      setCurrentPrompt(suggestion);
    } catch (e: any) {
      alert(`Failed to generate suggestion: ${e.message || "Please try again."}`);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // --- APPEARANCE ---
  const handleSetFontFamily = (f: string) => {
    setFontFamily(f);
    localStorage.setItem('user_display_font', f);
    onUpdateNovel({
      ...novel,
      editorSettings: {
        fontFamily: f,
        fontSize,
        lineSpacing,
      },
    });
  };

  const handleSetFontSize = (s: number) => {
    setFontSize(s);
    localStorage.setItem('user_display_size', s.toString());
    onUpdateNovel({
      ...novel,
      editorSettings: {
        fontFamily,
        fontSize: s,
        lineSpacing,
      },
    });
  };

  const handleSetLineSpacing = (s: number) => {
    if (s < 1 || s > 10) return;
    setLineSpacing(s);
    localStorage.setItem('user_display_spacing', s.toString());
    onUpdateNovel({
      ...novel,
      editorSettings: {
        fontFamily,
        fontSize,
        lineSpacing: s,
      },
    });
  };

  // --- RENDER ---

  const activeChapter = novel.chapters.find(
    (c) => c.id === fullScreenChapterId,
  );

  return (
    <div
      className="flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 anim-slide-up relative overflow-hidden h-[100dvh] w-full"
    >
      {/* HEADER (MODERN GLASS DOCK) */}
      <header className="flex-none p-3 px-4 flex items-center justify-between sticky top-0 z-20 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-slate-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-slate-600 dark:text-zinc-300"
            title="Kembali ke Perpustakaan"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => setShowModelSelector(true)}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl flex items-center gap-2 bg-slate-100/80 dark:bg-zinc-800/80 hover:bg-slate-200/70 dark:hover:bg-zinc-700/80 border border-slate-200/80 dark:border-zinc-700/80 transition-all text-xs font-semibold text-slate-800 dark:text-zinc-200 shadow-subtle"
          >
            <span>
              {CHAPTER_AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name ||
                "Gemini Flash"}
            </span>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 -rotate-90" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPromptHistory(true)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            title="Riwayat Prompt"
          >
            <BookOpen size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-44 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-5">
          {novel.chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Zap size={24} strokeWidth={2} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1.5">
                Mulai Bab Pertama Anda
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-sm">
                Ketik instruksi cerita atau kerangka ide pada kolom di bawah untuk membiarkan NParte AI menuliskan narasinya.
              </p>
            </div>
          ) : (
            novel.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="bg-white dark:bg-zinc-900 shadow-subtle border border-slate-200/80 dark:border-zinc-800/90 rounded-3xl overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-card"
              >
                <div
                  onClick={() =>
                    setExpandedChapterId(
                      expandedChapterId === chapter.id ? null : chapter.id,
                    )
                  }
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer bg-gradient-to-r from-transparent to-slate-50/50 dark:to-zinc-800/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                      #{novel.chapters.indexOf(chapter) + 1}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                      {chapter.title}
                    </h3>
                    {chapter.content && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        {chapter.content.trim()
                          ? chapter.content.trim().split(/\s+/).length
                          : 0}{" "}
                        kata
                      </span>
                    )}
                    {chapter.progressionState?.currentStage && (
                      <span className="text-[9px] font-bold tracking-wider text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full">
                        {chapter.progressionState.currentStage}
                      </span>
                    )}
                    {Boolean(chapter.debugInfo?.repairPass && chapter.debugInfo.repairPass > 0) && (
                      <span className="text-[9px] font-bold tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Repaired ({chapter.debugInfo?.repairPass}x)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFullscreen(chapter, false);
                      }}
                      className="p-1.5 hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                      title="Baca Mode Layar Penuh"
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>

                {expandedChapterId === chapter.id && (
                  <div className="p-5 sm:p-7 border-t border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
                    <div className="flex flex-wrap items-center justify-end gap-2 mb-5">
                      {onReviseChapter && chapter.content && (
                        revisingModeFor === chapter.id ? (
                          <div className="flex gap-1.5 items-center bg-slate-50 dark:bg-zinc-800/60 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
                            <button
                              onClick={() => {
                                onReviseChapter(novel.id, chapter.id, chapter.content, 'pro');
                                setRevisingModeFor(null);
                              }}
                              className="px-3 py-1 text-xs font-bold text-white bg-primary hover:opacity-95 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              Gemini Pro (Full)
                            </button>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowReviseLiteMenuFor(showReviseLiteMenuFor === chapter.id ? null : chapter.id);
                                }}
                                className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-600 rounded-xl flex items-center gap-1 transition-colors border border-slate-200 dark:border-zinc-600 shadow-sm"
                              >
                                Flash
                              </button>
                              
                              {showReviseLiteMenuFor === chapter.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowReviseLiteMenuFor(null)} 
                                  />
                                  <div className="absolute right-0 bottom-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 w-48 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800 mb-1 uppercase tracking-wider">
                                      Pilih Model Cepat
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onReviseChapter?.(novel.id, chapter.id, chapter.content, 'gemini-3.5-flash');
                                        setShowReviseLiteMenuFor(null);
                                        setRevisingModeFor(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                                    >
                                      <span className="font-semibold">Gemini 3.5 Flash</span>
                                      <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">Fast</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onReviseChapter?.(novel.id, chapter.id, chapter.content, 'gemini-3.6-flash');
                                        setShowReviseLiteMenuFor(null);
                                        setRevisingModeFor(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between"
                                    >
                                      <span className="font-semibold">Gemini 3.6 Flash</span>
                                      <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">Smart</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => setRevisingModeFor(null)}
                              className="px-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRevisingModeFor(chapter.id)}
                            disabled={isGenerating}
                            className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <Sparkles size={13} /> Revisi Bab
                          </button>
                        )
                      )}
                      <button
                        onClick={() => setChapterToDelete(chapter.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>

                    {/* INLINE CHAPTER CONTENT & ILLUSTRATIONS */}
                    <InlineChapterContent
                      content={isGenerating && streamingChapterId === chapter.id ? streamingContent : chapter.content}
                      chapterId={chapter.id}
                      chapterTitle={chapter.title}
                      illustrations={novel.illustrations || []}
                      fontFamily={fontFamily}
                      fontSize={fontSize}
                      lineSpacing={lineSpacing}
                      isStreaming={isGenerating && streamingChapterId === chapter.id}
                      onDeleteIllustration={handleDeleteIllustration}
                      onImageClick={(illus) => setLightboxImage({
                        url: illus.imageUrl,
                        title: `${chapter.title} - Adegan`,
                        snippet: illus.selectedSnippet
                      })}
                    />
                    
                    {isGenerating && streamingChapterId === chapter.id && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 pt-4 border-t border-slate-100 dark:border-zinc-800/60 flex items-center gap-3 text-primary/70 dark:text-primary/60"
                      >
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">
                          {generationStatus || "Melanjutkan cerita..."}
                        </span>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {/* STREAMING CHAPTER CARD */}
          {isGenerating && streamingChapterId && !novel.chapters.find(c => c.id === streamingChapterId) && (() => {
            const currentWords = streamingContent.trim() ? streamingContent.trim().split(/\s+/).filter(Boolean).length : 0;
            const targetWords = globalConfig.customRecursiveForce?.active 
              ? (globalConfig.customRecursiveForce.max || 4000)
              : (globalConfig.chapterTargetWordCount || 0);

            const parsed = parseGenerationProgress(generationStatus, selectedModel, currentWords, targetWords);
            const stageKey = genState.debugInfo?.chapterStage;
            const stageInfo = stageKey ? STAGE_CONFIG[stageKey] || {
              label: stageKey.replace(/_/g, ' '),
              color: 'text-primary',
              bg: 'bg-primary/10',
              border: 'border-primary/20'
            } : null;

            const isExpanded = expandedChapterId === streamingChapterId;

            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-zinc-900 shadow-card border-2 border-primary/25 dark:border-primary/35 rounded-3xl overflow-hidden relative"
              >
                {/* CARD HEADER */}
                <div
                  className="p-4 sm:p-5 flex justify-between items-center cursor-pointer bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/8 dark:to-transparent relative z-10 transition-colors hover:bg-primary/10"
                  onClick={() => setExpandedChapterId(isExpanded ? null : streamingChapterId)}
                >
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0 pr-3">
                    {/* Animated Loader Icon Container with Beacon Glow */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-primary shrink-0 bg-primary/15 dark:bg-primary/25 border border-primary/30 shadow-xs relative mt-0.5 sm:mt-0">
                      <Loader2 size={20} className="animate-spin text-primary" />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top Eyebrow: Category, Model & Session */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-primary">
                          PROGRES BAB #{novel.chapters.length + 1}
                        </span>
                        {parsed.modelName && (
                          <>
                            <span className="text-slate-300 dark:text-zinc-700 text-[10px] font-bold">•</span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.2 rounded-md">
                              {parsed.modelName}
                            </span>
                          </>
                        )}
                        {parsed.session && (
                          <>
                            <span className="text-slate-300 dark:text-zinc-700 text-[10px] font-bold">•</span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-primary/80 bg-primary/10 px-2 py-0.2 rounded-md">
                              {parsed.session}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Main Action Title (High visual weight) */}
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight leading-snug truncate">
                        {parsed.mainTitle}
                      </h3>

                      {/* Subtitle / Context Explanation (Distinct, smaller, readable) */}
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {parsed.subtitle}
                      </p>

                      {/* Contextual Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5">
                        {stageInfo && (
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${stageInfo.bg} ${stageInfo.color} ${stageInfo.border}`}>
                            {stageInfo.label}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-100/90 dark:bg-zinc-800/90 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-zinc-700/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          {currentWords} kata
                          {targetWords > 0 && (
                            <span className="text-slate-400 dark:text-zinc-500 font-normal">
                              / ~{targetWords} target
                            </span>
                          )}
                        </span>
                        {parsed.pct !== null && parsed.pct > 0 && (
                          <span className="text-[10px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                            {parsed.pct}%
                          </span>
                        )}
                        {Boolean(genState.debugInfo?.repairPass && genState.debugInfo.repairPass > 0) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Perbaikan #{genState.debugInfo?.repairPass}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenChapterId(streamingChapterId);
                        setEditContent(streamingContent);
                      }}
                      className="p-2 hover:bg-primary/15 rounded-xl transition-colors text-primary border border-primary/20 bg-primary/5 cursor-pointer"
                      title="Baca Layar Penuh"
                    >
                      <Maximize2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                      title={isExpanded ? "Tutup Teks Draf" : "Lihat Teks Draf"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Modern Dynamic Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-1 overflow-hidden relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-primary-gradient-end to-primary"
                    initial={{ width: 0 }}
                    animate={{
                      width: parsed.pct !== null ? `${Math.min(100, Math.max(8, parsed.pct))}%` : "100%",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>

                {/* Expanded Streaming Content Area */}
                {isExpanded && (
                  <div className="p-6 sm:p-8 md:p-10 border-t border-slate-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 min-h-[300px]">
                    <div
                      className="whitespace-pre-wrap leading-loose text-slate-800 dark:text-zinc-200 selection:bg-primary/20"
                      style={{
                        fontFamily,
                        fontSize: `${fontSize}px`,
                        lineHeight: lineSpacing
                          ? `${lineSpacing * 0.4 + 1.2}`
                          : "2",
                      }}
                    >
                      {streamingContent}
                      <motion.span 
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="inline-block w-[2.5px] h-[1em] ml-1 bg-primary align-middle"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* FLOATING INPUT DOCK */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 pointer-events-none"
          style={{ top: "-30px" }}
        />
        <div className="max-w-3xl mx-auto pointer-events-auto relative px-4 pb-4 md:pb-6 pt-1">
          {/* Input Bar */}
          <div
            className={`bg-white dark:bg-zinc-900 rounded-3xl p-1.5 pr-2 flex items-end gap-1 transition-all duration-200 shadow-card border border-slate-200/90 dark:border-zinc-800 relative mb-2.5`}
          >
            {/* Left Suggest Button */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => setShowSuggestMenu(!showSuggestMenu)}
                disabled={isGenerating || isGeneratingSuggestion}
                className="p-2.5 mb-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl transition-all shrink-0 ml-0.5"
                title={
                  currentPrompt.trim() !== ""
                    ? "Sempurnakan Prompt"
                    : "Saran Ide Cerita"
                }
              >
                {isGeneratingSuggestion ? (
                  <Loader2 size={18} className="animate-spin text-primary" />
                ) : (
                  <Plus size={20} strokeWidth={2} />
                )}
              </button>

              {showSuggestMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSuggestMenu(false)} 
                  />
                  <div className="absolute left-1 bottom-14 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 w-60 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="px-3 pb-2 pt-1 border-b border-slate-100 dark:border-zinc-800 mb-1">
                      <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => setSuggestMode('fixing')}
                          className={`flex-1 text-[11px] py-1.5 font-bold rounded-lg transition-colors ${suggestMode === 'fixing' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}>Fixing</button>
                        <button 
                          type="button"
                          onClick={() => setSuggestMode('building')}
                          className={`flex-1 text-[11px] py-1.5 font-bold rounded-lg transition-colors ${suggestMode === 'building' ? 'bg-white dark:bg-zinc-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}>Building</button>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 leading-tight">
                        {suggestMode === 'fixing' ? "Perbaiki prompt yang sudah ada agar lebih sempurna." : "Buat prompt cerita dari awal (mengikuti Lore Lock jika ada)."}
                      </div>
                    </div>
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Model {suggestMode === 'fixing' ? 'Fixing' : 'Building'}
                    </div>

                    {suggestMode === 'fixing' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSuggestPrompt('gemini-3.5-flash-lite', 'fixing')}
                          disabled={!currentPrompt.trim()}
                          className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between disabled:opacity-50"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">Gemini 3.5 Flash Lite</span>
                            <span className="text-[10px] text-slate-400">Cepat & Ringan</span>
                          </div>
                          <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold shrink-0">Fast</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSuggestPrompt('gemini-3.1-flash-lite', 'fixing')}
                          disabled={!currentPrompt.trim()}
                          className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between disabled:opacity-50"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">Gemini 3.1 Flash Lite</span>
                            <span className="text-[10px] text-slate-400">Efisien & Ringkas</span>
                          </div>
                          <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold shrink-0">Lite</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSuggestPrompt('gemini-3.5-flash-lite', 'building')}
                          disabled={!!currentPrompt.trim()}
                          className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between disabled:opacity-50"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">Gemini 3.5 Flash Lite</span>
                            <span className="text-[10px] text-slate-400">Cepat & Responsif</span>
                          </div>
                          <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold shrink-0">Fast</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSuggestPrompt('gemini-3.1-flash-lite', 'building')}
                          disabled={!!currentPrompt.trim()}
                          className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between disabled:opacity-50"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">Gemini 3.1 Flash Lite</span>
                            <span className="text-[10px] text-slate-400">Ringan & Efisien</span>
                          </div>
                          <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold shrink-0">Lite</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder="Instruksikan alur, konflik, atau bab berikutnya..."
              disabled={isGenerating}
              rows={isPromptFocused ? 4 : 1}
              style={{ 
                minHeight: "40px", 
                maxHeight: "350px", 
                height: isPromptFocused ? "auto" : undefined 
              }}
              className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-zinc-100 py-2.5 px-2 text-sm resize-none overflow-y-auto placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium transition-all"
              onFocus={(e) => {
                setIsPromptFocused(true);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onBlur={(e) => {
                setIsPromptFocused(false);
                e.target.style.height = 'auto';
              }}
              onInput={(e) => {
                if (isPromptFocused) {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }
              }}
            />

            {/* Right Send Button */}
            <div className="flex items-center gap-1 shrink-0 mb-1">
              <button
                onClick={isGenerating ? handleStop : handleGenerate}
                disabled={
                  (!isGenerating && !currentPrompt.trim()) ||
                  isGeneratingSuggestion
                }
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                  isGenerating
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90"
                    : !currentPrompt.trim()
                      ? "opacity-0 scale-75 pointer-events-none text-slate-400"
                      : "bg-primary text-white hover:opacity-95 shadow-md shadow-primary/20"
                }`}
              >
                {isGenerating ? (
                  <Square size={14} fill="currentColor" />
                ) : (
                  <ArrowUp size={18} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-2">
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm">
                {novel.title}
              </h1>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <span>{novel.chapters.length} Bab</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Illustrations Gallery */}
              <button
                onClick={() => setShowIllustrationsGallery(true)}
                disabled={isGenerating}
                className="p-2 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 rounded-xl shadow-subtle border border-slate-200/80 dark:border-zinc-800 relative transition-all"
                title="Galeri Ilustrasi Novel"
              >
                <ImageIcon size={15} strokeWidth={2} />
                {novel.illustrations && novel.illustrations.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-1 bg-primary text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                    {novel.illustrations.length}
                  </span>
                )}
              </button>

              {novel.type === 'fanfic' && (
                <button
                  onClick={() => setShowWorldLoreModal(true)}
                  disabled={isGenerating}
                  className="p-2 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 rounded-xl shadow-subtle border border-slate-200/80 dark:border-zinc-800 transition-all"
                  title="World Lore (Fanfic)"
                >
                  <Globe size={15} strokeWidth={2} />
                </button>
              )}
              <button
                onClick={() => setShowLoreModal(true)}
                disabled={isGenerating}
                className="p-2 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 rounded-xl shadow-subtle border border-slate-200/80 dark:border-zinc-800 relative transition-all"
                title="Lore Lock"
              >
                {novel.loreLockEnabled ? (
                  <Lock size={15} strokeWidth={2} />
                ) : (
                  <Unlock size={15} strokeWidth={2} />
                )}
                {isGeneratingLore && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setShowCoverModal(true)}
                className="p-2 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 rounded-xl shadow-subtle border border-slate-200/80 dark:border-zinc-800 transition-colors"
                title="Cover Maker"
              >
                <BookImage size={15} strokeWidth={2} />
              </button>
              <button
                onClick={() => setShowAppearanceModal(!showAppearanceModal)}
                className="p-2 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 rounded-xl shadow-subtle border border-slate-200/80 dark:border-zinc-800 transition-colors"
                title="Pengaturan Tampilan"
              >
                <Settings size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* FULLSCREEN EDITOR / READER */}
      {fullScreenChapterId && (
        <div
          className="fixed inset-0 flex flex-col anim-slide-up overflow-hidden bg-white dark:bg-[#09090b] z-50 h-[100dvh]"
        >
          <header className="flex-none p-4 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#09090b]">
            <div className="flex items-center gap-3">
              <button
                onClick={closeFullscreen}
                className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 className="font-bold text-lg">
                  {fullScreenChapterId === streamingChapterId ? (
                    <span className="flex items-center gap-2 text-primary animate-pulse">
                      <Loader2 size={16} className="animate-spin" /> Writing...
                    </span>
                  ) : (
                    activeChapter?.title
                  )}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isFullScreenEditMode ? (
                <button
                  onClick={() => setIsFullScreenEditMode(true)}
                  disabled={fullScreenChapterId === streamingChapterId}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    fullScreenChapterId === streamingChapterId
                      ? "bg-gray-50 dark:bg-zinc-900 text-gray-300 dark:text-zinc-700 cursor-not-allowed"
                      : "bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsFullScreenEditMode(false);
                      setEditContent(activeChapter?.content || ""); // Reset content
                    }}
                    className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFullscreenContent}
                    className="px-4 py-2 text-white rounded-full text-sm font-bold theme-btn-primary"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative">
            {isFullScreenEditMode ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full resize-none border-none focus:ring-0 p-8 max-w-3xl mx-auto bg-transparent outline-none text-gray-800 dark:text-gray-200"
                style={{
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineSpacing ? `${lineSpacing * 0.4 + 1.2}` : "2",
                  paddingBottom: "80px",
                }}
                placeholder="Write a chapter..."
                autoFocus
              />
            ) : (
              <div
                className="h-full overflow-y-auto w-full relative"
                ref={scrollContainerRef}
                onScroll={handleFullscreenScroll}
              >
                {showScrollToast && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg anim-pop transition-all">
                    Restoring to last position...
                  </div>
                )}
                <div className="max-w-3xl mx-auto p-8 md:p-12 pb-32">
                  <InlineChapterContent
                    content={editContent}
                    chapterId={activeChapter?.id}
                    chapterTitle={activeChapter?.title}
                    illustrations={novel.illustrations || []}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    lineSpacing={lineSpacing}
                    onDeleteIllustration={handleDeleteIllustration}
                    onImageClick={(illus) => setLightboxImage({
                      url: illus.imageUrl,
                      title: `${activeChapter?.title || 'Bab'} - Adegan`,
                      snippet: illus.selectedSnippet
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROMPT HISTORY MODAL */}
      {showPromptHistory && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPromptHistory(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-zinc-800 anim-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-800/20">
              <h2 className="font-bold text-lg flex items-center gap-2 text-primary">
                <BookOpen size={20} /> Prompt History
              </h2>
              <button
                onClick={() => setShowPromptHistory(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {novel.chapters.length === 0 && !isGenerating && (
                <p className="text-gray-400 italic text-center py-10">
                  No prompts yet.
                </p>
              )}
              {novel.chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="p-4 border border-gray-100 dark:border-zinc-700 rounded-2xl bg-gray-50 dark:bg-zinc-800/50"
                >
                  <div className="font-bold text-xs text-gray-500 mb-2">
                    Chapter {index + 1}
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {chapter.userPrompt}
                  </div>
                </div>
              ))}
              {isGenerating && genState.prompt && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ 
                    opacity: 1,
                    scale: 1,
                    borderColor: ["rgba(147, 51, 234, 0.2)", "var(--primary)", "rgba(147, 51, 234, 0.2)"],
                    backgroundColor: ["rgba(147, 51, 234, 0.02)", "rgba(59, 130, 246, 0.06)", "rgba(147, 51, 234, 0.02)"]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="p-4 border rounded-2xl"
                >
                  <div className="font-bold text-xs text-primary mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[10px]">
                      Writing Next Block...
                    </span>
                    <Loader2 size={12} className="animate-spin text-primary" />
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-medium">
                    {genState.prompt}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {chapterToDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setChapterToDelete(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl anim-pop border border-gray-100 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2 text-red-500 flex items-center gap-2">
              <AlertTriangle size={24} /> Delete Chapter?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setChapterToDelete(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChapter}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LORE LOCK MODAL */}
      <LoreLockModal
        isOpen={showLoreModal}
        onClose={() => setShowLoreModal(false)}
        loreEnabled={!!novel.loreLockEnabled}
        onToggleLore={(enabled) =>
          onUpdateNovel({ ...novel, loreLockEnabled: enabled })
        }
        loreDatabase={novel.loreDatabase}
        isGeneratingLore={isGeneratingLore}
        onManualSync={handleManualLoreSync}
      />

      {/* LORE EXTRACT MODAL (WITH MODEL SELECTION & RETRY LOGIC) */}
      <LoreExtractModal
        isOpen={showLoreExtractModal}
        onClose={() => setShowLoreExtractModal(false)}
        novel={novel}
        isNewChapterTrigger={false}
        onSuccess={(updated) => {
          onUpdateNovel(updated);
        }}
      />

      {/* APPEARANCE MODAL */}
      {showAppearanceModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm anim-fade-in"
          onClick={() => setShowAppearanceModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 w-full max-w-md p-6 rounded-t-3xl md:rounded-3xl shadow-2xl anim-scale-up border border-slate-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Opsi Tampilan Pembaca</h3>
              <button
                onClick={() => setShowAppearanceModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6 mb-2">
              {/* Font Family */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-300 text-sm font-semibold">Jenis Font</span>
                <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-2xl p-1 w-48 border border-slate-200/80 dark:border-zinc-700/80">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleSetFontFamily(f.value)}
                      className={`flex-1 text-xs py-2 rounded-xl font-bold transition-all ${
                        fontFamily === f.value
                          ? "bg-white dark:bg-zinc-700 text-primary shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-300 text-sm font-semibold">Ukuran Teks</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSetFontSize(fontSize - 1)}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-base w-6 text-center text-slate-900 dark:text-white">
                    {fontSize}
                  </span>
                  <button
                    onClick={() => handleSetFontSize(fontSize + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Line Spacing */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-zinc-300 text-sm font-semibold">Jarak Baris</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSetLineSpacing(lineSpacing - 1)}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-base w-6 text-center text-slate-900 dark:text-white">
                    {lineSpacing}
                  </span>
                  <button
                    onClick={() => handleSetLineSpacing(lineSpacing + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModelSelectorPanel
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        selectedModel={selectedModel}
        onSelectModel={(id) => {
          setSelectedModel(id);
        }}
        isGenerating={isGenerating}
        geminiModels={CHAPTER_AVAILABLE_MODELS}
        globalConfig={globalConfig}
        onUpdateConfig={onUpdateConfig}
      />

      {showCoverModal && (
        <CoverMakerModal
          novel={novel}
          onUpdateNovel={onUpdateNovel}
          onClose={() => setShowCoverModal(false)}
        />
      )}

      {showWorldLoreModal && novel.type === 'fanfic' && (
        <WorldLoreModal
          initialLore={novel.worldLore || ''}
          onSave={(lore) => {
            onUpdateNovel({ ...novel, worldLore: lore });
          }}
          onClose={() => setShowWorldLoreModal(false)}
          onAutoGenerate={generateWorldLore}
        />
      )}

      {/* FLOATING SELECTION POPUP */}
      {selectionPopup && selectionPopup.visible && (
        <div
          className="fixed z-[999] -translate-x-1/2 flex items-center gap-1.5 bg-gray-900/95 dark:bg-zinc-900/95 backdrop-blur-md text-white p-1.5 rounded-2xl shadow-2xl border border-zinc-700/60 anim-pop select-none"
          style={{
            left: `${Math.max(130, Math.min(window.innerWidth - 130, selectionPopup.x))}px`,
            top: `${Math.max(16, selectionPopup.y)}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const text = selectionPopup.text;
              const chapId = selectionPopup.chapterId;
              const chapTitle = selectionPopup.chapterTitle;
              // Dismiss selection popup and clear text selection
              setSelectionPopup(null);
              window.getSelection()?.removeAllRanges();
              openIllustrationMakerForSnippet(text, chapId, chapTitle);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Sparkles size={13} />
            <span>Generate Illustration</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(selectionPopup.text);
              setSelectionPopup(null);
            }}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-xs flex items-center gap-1 px-2.5"
            title="Salin Teks"
          >
            <Copy size={13} />
            <span className="hidden sm:inline">Salin</span>
          </button>

          <button
            onClick={() => {
              setSelectionPopup(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ILLUSTRATION MAKER MODAL */}
      {showIllustrationModal && (
        <IllustrationMakerModal
          novel={novel}
          initialSnippet={illustrationSnippet}
          chapterId={activeIllustrationChapter?.id}
          chapterTitle={activeIllustrationChapter?.title}
          onUpdateNovel={onUpdateNovel}
          onClose={() => {
            setShowIllustrationModal(false);
            setIllustrationSnippet("");
            setActiveIllustrationChapter(null);
          }}
        />
      )}

      {/* NOVEL ILLUSTRATIONS GALLERY MODAL */}
      {showIllustrationsGallery && (
        <NovelIllustrationsGalleryModal
          novel={novel}
          onUpdateNovel={onUpdateNovel}
          onOpenIllustrationMaker={(snippet, chapId) => {
            setShowIllustrationsGallery(false);
            openIllustrationMakerForSnippet(
              snippet || (novel.chapters.length > 0 ? novel.chapters[0].content.slice(0, 350) : ""),
              chapId || (novel.chapters.length > 0 ? novel.chapters[0].id : undefined),
              chapId ? novel.chapters.find(c => c.id === chapId)?.title : undefined
            );
          }}
          onClose={() => setShowIllustrationsGallery(false)}
        />
      )}

      {/* ILLUSTRATION DELETE CONFIRMATION MODAL */}
      {illustrationToDelete && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in"
          onClick={() => setIllustrationToDelete(null)}
        >
          <div 
            className="bg-white dark:bg-[#18181b] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 anim-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
              Hapus Ilustrasi?
            </h3>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              Gambar ilustrasi ini akan dihapus dari cerita dan ruang paragraf akan kembali menyatu seperti semula.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIllustrationToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteIllustration}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 anim-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-700/50 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-bold text-xs text-gray-700 dark:text-gray-300">
                {lightboxImage.title || "Ilustrasi Adegan"}
              </span>
              <div className="flex items-center gap-1.5">
                {(() => {
                  const currentIllus = novel.illustrations?.find(i => i.imageUrl === lightboxImage.url);
                  if (currentIllus) {
                    return (
                      <button
                        onClick={(e) => handleDeleteIllustration(currentIllus.id, e)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors"
                        title="Hapus Ilustrasi"
                      >
                        <Trash2 size={16} />
                      </button>
                    );
                  }
                  return null;
                })()}
                <button 
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-zinc-950 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={lightboxImage.url}
                alt="Enlarged Illustration"
                className="max-h-[55vh] w-auto object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            {lightboxImage.snippet && (
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 text-xs italic text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-zinc-800">
                "{lightboxImage.snippet}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
