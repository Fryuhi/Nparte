
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { createNovel, getNovels, saveNovel, deleteNovel, getGlobalConfig, saveGlobalConfig } from './services/storage';
import { Novel, ViewMode, GlobalConfig, Chapter } from './types';
import { NovelView } from './components/NovelView';
import { GlobalSettings } from './components/GlobalSettings';
import { ExportManager } from './components/ExportManager';
import { generateChapter } from './services/aiService';
import { generationStore } from './services/generationStore';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { FloatingNav } from './components/FloatingNav';
import { LoreExtractModal } from './components/LoreExtractModal';
import { NparteLogo } from './components/NparteLogo';
import { 
  Plus, Moon, Sun, Trash2, 
  BookOpen, Loader2, Palette, Maximize
} from 'lucide-react';

const COLORS = [
  { name: 'Nparte Cyan', value: '#00b8ff' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Amber', value: '#d97706' }
];

export const applyThemeColor = (colorHex: string) => {
  const root = document.documentElement;
  root.style.setProperty('--primary', colorHex);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorHex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.15)`);
    root.style.setProperty('--primary-glow-heavy', `rgba(${r}, ${g}, ${b}, 0.35)`);
    root.style.setProperty('--primary-light', `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--primary-light-heavy', `rgba(${r}, ${g}, ${b}, 0.15)`);
    root.style.setProperty('--primary-light-bg', `rgba(${r}, ${g}, ${b}, 0.05)`);
    
    let endR = Math.max(0, r - 30);
    let endG = Math.max(0, g - 30);
    let endB = Math.max(0, b + 40);
    if (colorHex === '#059669') { // Emerald
      endR = 13; endG = 148; endB = 136; // Teal-600
    } else if (colorHex === '#7c3aed') { // Purple
      endR = 192; endG = 38; endB = 211; // Fuchsia-600
    } else if (colorHex === '#e11d48') { // Rose
      endR = 219; endG = 39; endB = 119; // Pink-600
    } else if (colorHex === '#d97706') { // Amber
      endR = 234; endG = 88; endB = 12; // Orange-600
    } else if (colorHex === '#2563eb') { // Blue
      endR = 79; endG = 70; endB = 229; // Indigo-600
    }
    root.style.setProperty('--primary-gradient-end', `rgb(${endR}, ${endG}, ${endB})`);
  } else {
    root.style.setProperty('--primary-rgb', '37, 99, 235');
    root.style.setProperty('--primary-glow', 'rgba(37, 99, 235, 0.15)');
    root.style.setProperty('--primary-glow-heavy', 'rgba(37, 99, 235, 0.35)');
    root.style.setProperty('--primary-light', 'rgba(37, 99, 235, 0.08)');
    root.style.setProperty('--primary-light-heavy', 'rgba(37, 99, 235, 0.15)');
    root.style.setProperty('--primary-light-bg', 'rgba(37, 99, 235, 0.05)');
    root.style.setProperty('--primary-gradient-end', '#4f46e5');
  }
};

// --- HELPERS ---

// --- MAIN APP CONTENT ---

export default function App() {
  
  // Data State
  const [novels, setNovels] = useState<Novel[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(() => {
    const isAnimDisabled = typeof localStorage !== 'undefined'
      ? localStorage.getItem('user_disable_animations') === 'true'
      : false;
    return { styles: [], temperature: 0.7, highThinkingMode: true, disableAnimations: isAnimDisabled };
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // New Novel Modal State
  const [showNewNovelModal, setShowNewNovelModal] = useState(false);
  const [newNovelTitle, setNewNovelTitle] = useState("");
  const [newNovelType, setNewNovelType] = useState<'build' | 'fixing' | 'fanfic'>('build');
  const [newNovelWorldLore, setNewNovelWorldLore] = useState("");

  // UI State
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('user_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('HOME'); 
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'settings'>('home');

  // Novel Export State
  const [exportNovel, setExportNovel] = useState<Novel | null>(null);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNovelIds, setSelectedNovelIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lore Lock Extraction Modal State
  const [loreExtractTarget, setLoreExtractTarget] = useState<{
    novel: Novel;
    chapterTitle?: string;
    isNewChapterTrigger?: boolean;
  } | null>(null);

  // --- GLOBAL GENERATION STATE (Simplified for App level) ---
  const [activeGenerationMeta, setActiveGenerationMeta] = useState<{
    isGenerating: boolean;
    novelId: string | null;
  }>({
    isGenerating: false,
    novelId: null,
  });

  useEffect(() => {
    return generationStore.subscribe(() => {
      const state = generationStore.getState();
      if (
        state.isGenerating !== activeGenerationMeta.isGenerating ||
        state.novelId !== activeGenerationMeta.novelId
      ) {
        setActiveGenerationMeta({
          isGenerating: state.isGenerating,
          novelId: state.novelId
        });
      }
    });
  }, [activeGenerationMeta]);

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('user_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const isOff = Boolean(globalConfig.disableAnimations);
    try {
      localStorage.setItem('user_disable_animations', isOff ? 'true' : 'false');
    } catch (_) {}
    if (isOff) {
      document.documentElement.classList.add('disable-animations');
      document.body.classList.add('disable-animations');
    } else {
      document.documentElement.classList.remove('disable-animations');
      document.body.classList.remove('disable-animations');
    }
  }, [globalConfig.disableAnimations]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = "Terdapat pembaruan sistem atau pekerjaan aktif. Apakah Anda ingin memuat ulang halaman?";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    
    // Init theme color
    const savedColor = localStorage.getItem('user_theme_color') || '#2563eb';
    applyThemeColor(savedColor);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Sync project Nparte secret and fallback keys
        localStorage.removeItem('user_groq_api_key');
        localStorage.removeItem('user_openrouter_api_key');
        fetch('/api/key')
          .then((res) => res.json())
          .then((data) => {
            if (data.apiKey && data.apiKey !== "undefined") {
              if (!localStorage.getItem('user_gemini_api_key')) {
                localStorage.setItem('user_gemini_api_key', data.apiKey);
              }
            }
            if (data.apiKey2 && data.apiKey2 !== "undefined") {
              if (!localStorage.getItem('user_gemini_api_key_2')) {
                localStorage.setItem('user_gemini_api_key_2', data.apiKey2);
              }
            }
            if (data.apiKey3 && data.apiKey3 !== "undefined") {
              if (!localStorage.getItem('user_gemini_api_key_3')) {
                localStorage.setItem('user_gemini_api_key_3', data.apiKey3);
              }
            }
          })
          .catch(() => {});

        const [loadedNovels, loadedConfig] = await Promise.all([
          getNovels(),
          getGlobalConfig()
        ]);
        setNovels(loadedNovels);
        setGlobalConfig(loadedConfig);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    
    const handleNovelUpdated = async () => {
      try {
        const freshNovels = await getNovels();
        setNovels(freshNovels);
      } catch (err) {
        console.error("Failed to reload novels after background update", err);
      }
    };

    window.addEventListener('novelUpdated', handleNovelUpdated);
    return () => {
      window.removeEventListener('novelUpdated', handleNovelUpdated);
    };
  }, []);

  // --- Handlers ---

  const openNewNovelModal = () => {
    setNewNovelTitle(`New Novel ${novels.length + 1}`);
    setNewNovelType('build');
    setNewNovelWorldLore("");
    setShowNewNovelModal(true);
  };

  const confirmCreateNovel = async () => {
    const title = newNovelTitle.trim() || `New Novel ${novels.length + 1}`;
    const newNovel = createNovel(title, newNovelType, undefined, newNovelWorldLore); 
    
    try {
      await saveNovel(newNovel);
      setNovels(prev => [newNovel, ...prev]);
      setCurrentNovelId(newNovel.id);
      setViewMode('NOVEL_VIEW');
      setShowNewNovelModal(false);
    } catch (e) {
      console.error("Failed to create novel:", e);
      alert("Failed to create new novel. Storage error.");
    }
  };

  const handleUpdateNovel = async (updated: Novel) => {
    setNovels(prev => prev.map(n => n.id === updated.id ? updated : n));
    await saveNovel(updated);
  };

  const syncConfig = async (newConfig: GlobalConfig) => {
    setGlobalConfig(newConfig);
    await saveGlobalConfig(newConfig);
  };

  const handleDeleteSelected = () => {
    if (selectedNovelIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const idsToDelete = Array.from(selectedNovelIds) as string[];
    
    const foldersToDelete = idsToDelete.filter(id => globalConfig.folders?.some(f => f.id === id));
    const novelsToDelete = idsToDelete.filter(id => !foldersToDelete.includes(id));

    if (foldersToDelete.length > 0) {
      const remainingFolders = (globalConfig.folders || []).filter(f => !foldersToDelete.includes(f.id));
      const newConfig = { ...globalConfig, folders: remainingFolders };
      setGlobalConfig(newConfig);
      await saveGlobalConfig(newConfig);

      const novelsToUpdate = novels.filter(n => n.folderId && foldersToDelete.includes(n.folderId));
      if (novelsToUpdate.length > 0) {
         let updatedNovels = [...novels];
         for (const n of novelsToUpdate) {
            const updated = { ...n, folderId: undefined };
            await saveNovel(updated);
            const idx = updatedNovels.findIndex(un => un.id === updated.id);
            if (idx >= 0) updatedNovels[idx] = updated;
         }
         setNovels(updatedNovels);
      }
    }

    if (novelsToDelete.length > 0) {
      // Abort active generation if the novel being deleted is currently generating
      const activeState = generationStore.getState();
      if (activeState.isGenerating && activeState.novelId && novelsToDelete.includes(activeState.novelId)) {
        if (activeState.abortController) {
          activeState.abortController.abort();
        }
        generationStore.setState({
          isGenerating: false,
          novelId: null,
          chapterId: null,
          prompt: '',
          content: '',
          status: '',
          abortController: null
        });
      }

      setNovels(prev => prev.filter(n => !novelsToDelete.includes(n.id)));
      await Promise.all(novelsToDelete.map(id => deleteNovel(id)));
    }

    setSelectedNovelIds(new Set());
    setIsSelectionMode(false);
    setShowDeleteConfirm(false);
  };

  const toggleSelectNovel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedNovelIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedNovelIds(newSelected);
  };

  // --- GLOBAL GENERATION HANDLERS ---

  const handleGenerateChapter = async (
    novelId: string,
    prompt: string,
    modelId: string,
    config: GlobalConfig
  ) => {
    const novel = novels.find(n => n.id === novelId);
    if (!novel) return;

    const controller = new AbortController();
    const newChapterId = crypto.randomUUID();

    generationStore.setState({
      isGenerating: true,
      novelId,
      chapterId: newChapterId,
      prompt: prompt,
      content: '',
      status: 'Writing...',
      abortController: controller
    });

    try {
      const genResult = await generateChapter(
        novel,
        config,
        prompt,
        modelId,
        controller.signal,
        (status) => generationStore.setState({ status }),
        (streamedText) => generationStore.setState({ content: streamedText })
      );

      const chapterText = typeof genResult === 'string' ? genResult : genResult.content;
      const progressionState = typeof genResult === 'object' ? genResult.progressionState : undefined;
      const debugInfo = typeof genResult === 'object' ? genResult.debugInfo : undefined;

      // Create new chapter
      const newChapter: Chapter = {
        id: newChapterId,
        title: `Chapter ${novel.chapters.length + 1}`,
        content: chapterText,
        userPrompt: prompt,
        createdAt: Date.now(),
        progressionState,
        debugInfo
      };

      const updatedNovel = {
        ...novel,
        chapters: [...novel.chapters, newChapter],
        updatedAt: Date.now()
      };

      // Update local state and storage
      await saveNovel(updatedNovel);
      setNovels(prev => prev.map(n => n.id === novelId ? updatedNovel : n));
      
      // Lore Lock activation is now 100% manual by user - no automatic popups

    } catch (e: any) {
      const isAborted = e.name === 'AbortError' || e.message?.includes('Aborted');
      console.log(isAborted ? 'Generation stopped' : `Generation failed: ${e.message}`);
      
      const partialText = e.partialText || '';
      const hasContent = partialText.trim().length > 0;
      
      const newChapter: Chapter = {
        id: newChapterId,
        title: hasContent 
          ? `Chapter ${novel.chapters.length + 1}` 
          : `Chapter ${novel.chapters.length + 1} (${isAborted ? 'Stopped' : 'Failed'})`,
        content: partialText,
        userPrompt: prompt,
        createdAt: Date.now()
      };
      
      const updatedNovel = {
        ...novel,
        chapters: [...novel.chapters, newChapter],
        updatedAt: Date.now()
      };
      
      await saveNovel(updatedNovel);
      setNovels(prev => prev.map(n => n.id === novelId ? updatedNovel : n));
      
      if (!isAborted && !hasContent) {
         alert(e.message || "Please try again later.");
      }
    } finally {
      generationStore.setState({
        isGenerating: false,
        novelId: null,
        chapterId: null,
        content: '',
        status: '',
        abortController: null
      });
    }
  };

  const handleStopGeneration = () => {
    const activeState = generationStore.getState();
    if (activeState.abortController) {
      activeState.abortController.abort();
      generationStore.setState({ status: 'Saving progress...' });
    }
  };

  const handleReviseChapter = async (novelId: string, chapterId: string, content: string, mode: 'pro' | 'lite' | string) => {
    try {
      const { reviseChapterContent } = await import('./services/aiService');
      
      let statusText = 'Cleaning (Flash Lite)...';
      if (mode === 'pro' || mode === 'gemini-3.1-pro-preview') {
        statusText = 'Revising (Gemini 3.1 Pro)...';
      } else if (mode === 'gemini-3-flash-preview' || mode === 'gemini-3.0-flash') {
        statusText = 'Revising (Gemini 3 Flash)...';
      } else if (mode === 'gemini-3.5-flash') {
        statusText = 'Revising (Gemini 3.5 Flash)...';
      } else if (mode === 'gemini-3.5-flash-lite') {
        statusText = 'Revising (Gemini 3.5 Lite)...';
      } else if (mode === 'gemini-3.8-flash') {
        statusText = 'Revising (Gemini 3.8 Flash)...';
      } else if (mode === 'gemini-3.7-flash') {
        statusText = 'Revising (Gemini 3.7 Flash)...';
      } else if (mode === 'gemini-3.6-flash') {
        statusText = 'Revising (Gemini 3.6 Flash)...';
      } else if (mode === 'gemini-3.1-flash-lite') {
        statusText = 'Revising (Gemini 3.1 Lite)...';
      }

      generationStore.setState({
        isGenerating: true,
        novelId,
        chapterId,
        content: '',
        status: statusText
      });

      const targetNovel = novels.find(n => n.id === novelId);
      const revisedContent = await reviseChapterContent(content, mode, targetNovel, globalConfig, (streamed) => {
        generationStore.setState({ content: streamed });
      });

      if (targetNovel) {
        const updatedChapters = targetNovel.chapters.map(c => 
          c.id === chapterId ? { ...c, content: revisedContent } : c
        );
        const updatedNovel = { ...targetNovel, chapters: updatedChapters, updatedAt: Date.now() };
        await saveNovel(updatedNovel);
        setNovels(prev => prev.map(n => n.id === novelId ? updatedNovel : n));
      }

    } catch (e: any) {
      alert(`Revision failed: ${e.message}`);
    } finally {
      generationStore.setState({ isGenerating: false, status: '', novelId: null, chapterId: null });
    }
  };

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // 1. NOVEL EDITOR VIEW (Full Screen Overlay)
  if (viewMode === 'NOVEL_VIEW') {
    const currentNovel = novels.find(n => n.id === currentNovelId);
    if (currentNovel) {
      return (
        <MotionConfig
          reducedMotion={globalConfig.disableAnimations ? "always" : "user"}
          transition={globalConfig.disableAnimations ? { duration: 0 } : undefined}
        >
          <NovelView 
            novel={currentNovel} 
            globalConfig={globalConfig}
            onBack={() => {
              setViewMode('LIBRARY');
              setActiveTab('library');
            }}
            onUpdateNovel={handleUpdateNovel}
            onUpdateConfig={syncConfig}
            activeGeneration={activeGenerationMeta.novelId === currentNovel.id ? (activeGenerationMeta as any) : undefined}
            onGenerate={handleGenerateChapter}
            onReviseChapter={handleReviseChapter}
            onStop={handleStopGeneration}
          />
        </MotionConfig>
      );
    } else {
        setViewMode('LIBRARY');
    }
  }

  // 2. MAIN APP DASHBOARD
  return (
    <MotionConfig
      reducedMotion={globalConfig.disableAnimations ? "always" : "user"}
      transition={globalConfig.disableAnimations ? { duration: 0 } : undefined}
    >
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-black text-foreground transition-colors duration-300 relative overflow-hidden">
      
      {/* Top Bar - Minimalist */}
      <header className="flex-none px-4 md:px-8 py-4 flex justify-between items-center z-10 w-full max-w-7xl mx-auto">
         <div className="flex items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity">
            <NparteLogo className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Nparte</h1>
         </div>
         
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={openNewNovelModal}
              className="hidden md:flex bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm hover:shadow-md px-4 py-2 rounded-full text-sm font-semibold transition-all items-center gap-2"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create</span>
            </button>
            <div className="relative group">
                <button 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  title="Theme Color"
                >
                  <Palette size={18} />
                </button>
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 shadow-xl border border-gray-100 dark:border-zinc-800 rounded-2xl p-2 hidden group-hover:flex gap-1">
                   {COLORS.map(c => (
                     <button
                       key={c.value}
                       onClick={() => {
                          applyThemeColor(c.value);
                          localStorage.setItem('user_theme_color', c.value);
                       }}
                       className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 hover:scale-110 transition-transform shadow-sm"
                       style={{ backgroundColor: c.value }}
                       title={c.name}
                     />
                   ))}
                </div>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
         </div>
      </header>

      {/* Main Tab Content with Smooth Crossfade/Slide */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <WelcomeScreen 
                onCreate={openNewNovelModal}
                onLibrary={() => setActiveTab('library')}
                novels={novels}
              />
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <LibraryScreen 
                novels={novels}
                onCreate={openNewNovelModal}
                onSelect={(id) => { setCurrentNovelId(id); setViewMode('NOVEL_VIEW'); }}
                onDeleteMode={() => setIsSelectionMode(!isSelectionMode)}
                isSelectionMode={isSelectionMode}
                selectedIds={selectedNovelIds}
                onToggleSelect={toggleSelectNovel}
                activeGeneration={activeGenerationMeta as any}
                onExport={(novel) => setExportNovel(novel)}
                config={globalConfig}
                onUpdateConfig={syncConfig}
                onUpdateNovel={handleUpdateNovel}
                setSelectedNovelIds={setSelectedNovelIds}
                setIsSelectionMode={setIsSelectionMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {exportNovel && (
         <ExportManager novel={exportNovel} onClose={() => setExportNovel(null)} />
      )}

      {/* Floating Nav */}
      {activeTab !== 'settings' && (
          <FloatingNav activeTab={activeTab} onChange={setActiveTab} />
      )}

      {/* Global Settings Smooth Fullscreen Transition Layer */}
      <AnimatePresence>
        {activeTab === 'settings' && (
          <motion.div
            key="global-settings-overlay"
            initial={{ opacity: 0, y: 18, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.995 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 overflow-hidden bg-slate-50 dark:bg-[#09090b]"
          >
            <GlobalSettings 
               config={globalConfig}
               onUpdate={syncConfig}
               onBack={() => setActiveTab('library')}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-fade">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-zinc-800 anim-pop">
              <h3 className="font-bold text-lg mb-2 text-red-500 flex items-center gap-2">
                <Trash2 size={20} /> Delete Item?
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
                This action cannot be undone. {(() => {
                  const selFolderCount = Array.from(selectedNovelIds).filter(id => (globalConfig.folders || []).some(f => f.id === id)).length;
                  const selNovelCount = Array.from(selectedNovelIds).filter(id => novels.some(n => n.id === id)).length;
                  const total = selFolderCount + selNovelCount;
                  if (selFolderCount > 0 && selNovelCount > 0) {
                    return `${selFolderCount} folder(s) and ${selNovelCount} novel(s) (${total} total items) will be removed. Active novels inside deleted folders will be preserved in your library.`;
                  } else if (selFolderCount > 0) {
                    return `${selFolderCount} folder(s) (${total} total item(s)) will be deleted. Novels inside them will be safely preserved.`;
                  } else {
                    return `${selNovelCount} novel(s) will be permanently deleted.`;
                  }
                })()}
              </p>
              <div className="flex justify-end gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all">Yes, Delete</button>
              </div>
            </div>
        </div>
      )}

      {/* New Novel Modal */}
      {showNewNovelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-fade">
           <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-zinc-800 anim-pop">
              <h3 className="font-bold text-lg mb-2 text-primary flex items-center gap-2">
                 <BookOpen size={20} /> Create New Novel
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4 leading-relaxed">
                 Give your new novel a title and choose its type.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Title</label>
                  <input 
                     type="text"
                     autoFocus
                     value={newNovelTitle}
                     onChange={(e) => setNewNovelTitle(e.target.value)}
                     className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
                     placeholder="Example: The Star Voyager"
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmCreateNovel();
                     }}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Novel Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setNewNovelType('build')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border ${newNovelType === 'build' ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Build
                    </button>
                    <button
                      onClick={() => setNewNovelType('fixing')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border ${newNovelType === 'fixing' ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Fixer
                    </button>
                    <button
                      onClick={() => setNewNovelType('fanfic')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border ${newNovelType === 'fanfic' ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Fanfic
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {newNovelType === 'build' && "Build a novel from scratch using AI generation."}
                    {newNovelType === 'fixing' && "Fix or revise existing chapters instead of writing from scratch."}
                    {newNovelType === 'fanfic' && "Write fanfiction with a custom World Lore that acts as a strict foundation."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                  <button onClick={() => setShowNewNovelModal(false)} className="px-5 py-2.5 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button onClick={confirmCreateNovel} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg theme-glow-light">Create Novel</button>
              </div>
           </div>
        </div>
      )}


      {/* FAB for Deletion in Library */}
      {isSelectionMode && activeTab === 'library' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-red-500 text-white shadow-xl shadow-red-500/30 rounded-full px-6 py-3 flex items-center gap-4 anim-slide-up">
           <span className="text-sm font-bold">{selectedNovelIds.size} Selected</span>
           <div className="h-4 w-px bg-white/30"></div>
           <button 
             onClick={handleDeleteSelected}
             disabled={selectedNovelIds.size === 0}
             className="flex items-center gap-2 hover:opacity-80 disabled:opacity-50 font-medium text-sm"
           >
             <Trash2 size={16} /> Delete
           </button>
        </div>
      )}

      {/* API Key Modal */}
      {/* Lore Lock Extraction Modal (New Chapter & Retry Flow) */}
      {loreExtractTarget && (
        <LoreExtractModal
          isOpen={!!loreExtractTarget}
          onClose={() => setLoreExtractTarget(null)}
          novel={loreExtractTarget.novel}
          chapterTitle={loreExtractTarget.chapterTitle}
          isNewChapterTrigger={loreExtractTarget.isNewChapterTrigger}
          onSuccess={(updated) => {
            handleUpdateNovel(updated);
          }}
        />
      )}

      {/* Floating Fullscreen Toggle */}
      {!isFullscreen && (
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => console.log(err));
              setIsFullscreen(true);
            }
          }}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 shadow-xl border border-gray-100 dark:border-zinc-800 hover:scale-105 hover:text-primary transition-all duration-300"
          title="Fullscreen"
        >
          <Maximize size={20} />
        </button>
      )}
      </div>
    </MotionConfig>
  );
}