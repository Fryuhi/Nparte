import React, { useState } from 'react';
import { Novel } from '../types';
import { X, Image as ImageIcon, Loader2, RefreshCw, Check } from 'lucide-react';
import { globalTaskStore, useTask } from '../services/taskStore';
import { extractCoverPrompt } from '../services/aiService';

interface CoverMakerModalProps {
  novel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  onClose: () => void;
}

export const CoverMakerModal: React.FC<CoverMakerModalProps> = ({
  novel,
  onUpdateNovel,
  onClose
}) => {
  const [analysisModel, setAnalysisModel] = useState<string>('gemini-3.1-flash-lite');
  const [modelName, setModelName] = useState<'gemini-3.1-flash-lite-image' | 'gemini-3.1-flash-image' | 'gemini-3-pro-image' | ''>('gemini-3.1-flash-lite-image');
  const [artStyle, setArtStyle] = useState<'real-tion' | 'nime-tion'>('real-tion');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const taskId = `${novel.id}_cover`;
  const task = useTask(taskId);
  const isGenerating = task?.status === 'generating';
  const error = localError || task?.error;
  const loadingText = task?.loadingText || 'Generating...';

  const getPromptSource = () => {
    const loreSynopsis = novel.loreDatabase?.fullLoreSummary ? novel.loreDatabase.fullLoreSummary.trim() : "";
    return loreSynopsis || novel.synopsis?.trim() || novel.title;
  };

  const handlePreviewPrompt = async () => {
    const promptSource = getPromptSource();
    if (!promptSource) {
      setLocalError("Sinopsis dan judul novel masih kosong.");
      return;
    }
    setIsPreviewing(true);
    setLocalError(null);
    try {
      const prompt = await extractCoverPrompt(
        novel.title,
        promptSource,
        novel.loreDatabase,
        artStyle,
        analysisModel
      );
      setCustomPrompt(prompt);
    } catch (err: any) {
      setLocalError("Gagal mengekstrak prompt dengan Gemini: " + err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    const promptSource = getPromptSource();
    if (!promptSource) {
      setLocalError("Sinopsis dan judul novel masih kosong. Masukkan judul atau sinopsis.");
      return;
    }
    setLocalError(null);
    globalTaskStore.runCoverGeneration(
      novel.id,
      novel.title,
      promptSource,
      novel.loreDatabase,
      modelName,
      artStyle,
      analysisModel
    );
  };

  const handleRemove = () => {
    onUpdateNovel({ ...novel, coverImage: undefined, updatedAt: Date.now() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Cover Maker
            </h2>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mt-1">
              Pilih Gemini untuk analisis & gambar otomatis
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            
            {/* Step 1: Ask for AI Analysis Model */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">
                  1. Model AI (Analisis Lore Lock & Sinopsis)
                </label>
                <button
                  type="button"
                  onClick={handlePreviewPrompt}
                  disabled={isPreviewing || isGenerating || !analysisModel}
                  className="text-[11px] font-bold text-primary hover:text-primary-gradient-end flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isPreviewing ? 'animate-spin' : ''} />
                  {isPreviewing ? 'Menganalisis...' : 'Pratinjau Prompt'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Pilih model yang terdaftar di aplikasi untuk mengekstrak dan merumuskan prompt visual cover dari sinopsis & Lore Lock.
              </p>

              <select
                value={analysisModel}
                onChange={(e) => setAnalysisModel(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 font-semibold outline-none focus:ring-2 focus:ring-primary shadow-xs"
              >
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Direkomendasikan)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              </select>

              {customPrompt && (
                <div className="mt-2 p-2.5 bg-white dark:bg-zinc-800/90 border border-purple-200 dark:border-purple-800/60 rounded-xl text-[11px] text-slate-700 dark:text-zinc-300">
                  <div className="font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                    <Check size={12} /> Prompt Visual Hasil Ekstraksi:
                  </div>
                  <p className="line-clamp-3 italic">{customPrompt}</p>
                </div>
              )}
            </div>
            
            {/* Step 2: Art Style & Image Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl">
                <label className="block text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest mb-2.5">
                  2. Gaya Seni (Style)
                </label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value as any)}
                  className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 font-semibold focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="real-tion">Real-Tion (Original Style)</option>
                  <option value="nime-tion">Nime-Tion (Anime Style)</option>
                </select>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl">
                <label className="block text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest mb-2.5">
                  3. Mesin Gambar
                </label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 font-semibold focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="gemini-3.1-flash-lite-image">⚡ Nano Banana 2 Lite (Auto Free Fallback)</option>
                  <option value="gemini-3.1-flash-image">🎨 Nano Banana 2 (High Dynamic)</option>
                  <option value="gemini-3-pro-image">✨ Nano Banana Pro (Ultra Detail)</option>
                </select>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-800/30">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !analysisModel || !modelName}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold transition-all hover:bg-primary-gradient-end disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md shadow-primary/20 active:scale-[0.99]"
            >
              {isGenerating ? (
                <><Loader2 size={18} className="animate-spin" /> {loadingText}</>
              ) : (
                <>Generate Cover Sekarang</>
              )}
            </button>
          </div>

          {/* Right Column: Cover Preview */}
          <div className="w-full md:w-56 flex flex-col gap-2 shrink-0">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">Cover Saat Ini</label>
            <div className="aspect-[3/4] w-full bg-slate-100 dark:bg-zinc-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 flex items-center justify-center relative shadow-inner">
              {novel.coverImage ? (
                <img src={novel.coverImage} alt="Novel Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-slate-400 dark:text-zinc-500 flex flex-col items-center gap-2">
                  <ImageIcon size={32} />
                  <span className="text-xs">Belum ada cover</span>
                </div>
              )}
            </div>
            {novel.coverImage && (
              <button onClick={handleRemove} className="text-xs text-red-500 hover:text-red-600 mt-1 font-semibold text-center w-full py-1">
                Hapus Cover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

