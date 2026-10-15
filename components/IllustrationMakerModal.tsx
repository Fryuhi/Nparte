import React, { useState } from 'react';
import { Novel, NovelIllustration, FLASH_LITE_MODELS } from '../types';
import { 
  X, 
  Loader2, 
  RefreshCw, 
  Image as ImageIcon, 
  Download, 
  Bookmark, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Wand2, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { extractIllustrationPrompt, IllustrationAnalysisResult, generateNovelImage } from '../services/aiService';

interface IllustrationMakerModalProps {
  novel: Novel;
  chapterId?: string;
  chapterTitle?: string;
  initialSnippet: string;
  onUpdateNovel: (novel: Novel) => void;
  onClose: () => void;
}

export const IllustrationMakerModal: React.FC<IllustrationMakerModalProps> = ({
  novel,
  chapterId,
  chapterTitle,
  initialSnippet,
  onUpdateNovel,
  onClose,
}) => {
  const [snippet, setSnippet] = useState(initialSnippet || '');
  const [analysisModel, setAnalysisModel] = useState<string>('gemini-3.1-flash-lite');
  const [modelName, setModelName] = useState<'gemini-3.1-flash-lite-image' | 'gemini-3.1-flash-image' | 'gemini-3-pro-image'>(
    'gemini-3.1-flash-lite-image'
  );
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '16:9' | '9:16' | '1:1' | '4:3'>('3:4');
  
  // Prompt & Lore Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<IllustrationAnalysisResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [generatedIllustration, setGeneratedIllustration] = useState<NovelIllustration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverSuccess, setCoverSuccess] = useState(false);

  const handleAnalyzeWithLoreLock = async (modelToUse = analysisModel) => {
    if (!snippet.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    const modelObj = FLASH_LITE_MODELS.find(m => m.id === modelToUse);
    const modelNameDisplay = modelObj ? modelObj.name : modelToUse;
    setProgressText(`Mengecek karakter & lore adegan (${modelNameDisplay})...`);

    try {
      const result = await extractIllustrationPrompt(
        snippet,
        novel.title,
        chapterTitle || 'Chapter',
        novel.loreDatabase,
        aspectRatio,
        modelToUse
      );
      setAnalysisResult(result);
      setCustomPrompt(result.visualPrompt);
      if (result.suggestedAspectRatio) {
        setAspectRatio(result.suggestedAspectRatio);
      }
      setShowPromptDetails(true);
    } catch (err: any) {
      console.error('Error analyzing prompt:', err);
      setError('Gagal menganalisis Lore Lock secara otomatis. Anda dapat memasukkan prompt manual atau langsung generate.');
    } finally {
      setIsAnalyzing(false);
      setProgressText('');
    }
  };

  const handleGenerate = async () => {
    if (!snippet.trim()) {
      setError('Teks adegan tidak boleh kosong.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCoverSuccess(false);
    setProgressText('Memulai proses ilustrasi adegan...');

    try {
      let promptToUse = customPrompt.trim();
      let characters = analysisResult?.identifiedCharacters || [];

      // If not yet analyzed or prompt is empty, run auto-analysis
      if (!promptToUse) {
        const modelObj = FLASH_LITE_MODELS.find(m => m.id === analysisModel);
        setProgressText(`Menganalisis adegan & karakter (${modelObj ? modelObj.name : analysisModel})...`);
        const analysis = await extractIllustrationPrompt(
          snippet,
          novel.title,
          chapterTitle || 'Chapter',
          novel.loreDatabase,
          aspectRatio,
          analysisModel
        );
        setAnalysisResult(analysis);
        promptToUse = analysis.visualPrompt;
        characters = analysis.identifiedCharacters;
        setCustomPrompt(promptToUse);
      }

      const displayName = 
        modelName === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite' :
        modelName === 'gemini-3.1-flash-image' ? 'Nano Banana 2' :
        'Nano Banana Pro';
      setProgressText(`Merender ilustrasi dengan ${displayName}...`);

      // Masterpiece default anime style prefix
      const defaultMasterpiecePrefix = 'Masterpiece Japanese light novel visual artwork, exquisite painterly anime digital illustration, textured brushwork, delicate linework, volumetric cinematic lighting, high aesthetic beauty. STRICTLY ADHERE TO THE FOLLOWING POSE AND ACTION:';
      const finalFullPrompt = `${defaultMasterpiecePrefix} ${promptToUse}`;

      const base64Image = await generateNovelImage(finalFullPrompt, modelName, aspectRatio);

      const newIllustration: NovelIllustration = {
        id: `illus_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        novelId: novel.id,
        chapterId: chapterId || '',
        chapterTitle: chapterTitle || '',
        selectedSnippet: snippet,
        prompt: promptToUse,
        imageUrl: base64Image,
        aspectRatio,
        modelName,
        identifiedCharacters: characters,
        createdAt: Date.now(),
      };

      setGeneratedIllustration(newIllustration);

      // Save to novel illustrations gallery and chapter
      const updatedIllustrations = novel.illustrations ? [newIllustration, ...novel.illustrations] : [newIllustration];
      
      let updatedChapters = novel.chapters;
      if (chapterId) {
        updatedChapters = novel.chapters.map(chap => {
          if (chap.id === chapterId) {
            const chapIllus = chap.illustrations ? [newIllustration, ...chap.illustrations] : [newIllustration];
            return { ...chap, illustrations: chapIllus };
          }
          return chap;
        });
      }

      onUpdateNovel({
        ...novel,
        illustrations: updatedIllustrations,
        chapters: updatedChapters,
        updatedAt: Date.now(),
      });

    } catch (err: any) {
      console.error('Illustration generation failed:', err);
      setError(err.message || 'Gagal menghasilkan ilustrasi. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleDownload = () => {
    if (!generatedIllustration) return;
    const a = document.createElement('a');
    a.href = generatedIllustration.imageUrl;
    a.download = `illustration_${novel.title.replace(/\s+/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSetAsCover = () => {
    if (!generatedIllustration) return;
    onUpdateNovel({
      ...novel,
      coverImage: generatedIllustration.imageUrl,
      updatedAt: Date.now(),
    });
    setCoverSuccess(true);
    setTimeout(() => setCoverSuccess(false), 3000);
  };

  const handleCopyPrompt = () => {
    if (!customPrompt) return;
    navigator.clipboard.writeText(customPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md anim-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#18181B] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh] anim-slide-up text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-gray-950 dark:text-white">
                Generate Illustration
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Visual Scene Render &bull; Lore Lock Synced
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Selected Text Snippet Card */}
          <div className="bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                <BookOpen size={14} className="text-primary" />
                Teks Adegan Terpilih
              </span>
              {chapterTitle && (
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-300 dark:border-zinc-700">
                  {chapterTitle}
                </span>
              )}
            </div>
            <textarea
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              placeholder="Teks adegan yang akan dibuatkan ilustrasi..."
              className="w-full bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-gray-800 dark:text-zinc-200 resize-y min-h-[70px] max-h-[120px] focus:ring-1 focus:ring-primary focus:border-primary outline-none leading-relaxed transition-all"
            />
          </div>

          {/* Model & Lore Analysis Settings */}
          <div className="bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-zinc-200 flex items-center gap-1.5">
                <Wand2 size={14} className="text-primary" />
                Model Analisis Adegan & Karakter
              </span>
              <button
                type="button"
                onClick={() => handleAnalyzeWithLoreLock(analysisModel)}
                disabled={isAnalyzing || isGenerating || !analysisModel}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />
                {isAnalyzing ? 'Menganalisis...' : 'Analisis Lore Lock'}
              </button>
            </div>

            <select
              value={analysisModel}
              onChange={(e) => {
                const newModel = e.target.value;
                setAnalysisModel(newModel);
                if (newModel) handleAnalyzeWithLoreLock(newModel);
              }}
              className="w-full p-2.5 bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Cepat & Akurat)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
            </select>

            {/* Identified Characters Badges */}
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-xs text-primary py-1 font-semibold">
                <Loader2 size={13} className="animate-spin" />
                Mengekstrak ciri karakter dari Lore Lock...
              </div>
            ) : analysisResult && analysisResult.identifiedCharacters && analysisResult.identifiedCharacters.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                <div className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                  Karakter Teridentifikasi:
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.identifiedCharacters.map((char, idx) => (
                    <div 
                      key={idx}
                      className="bg-white dark:bg-[#141416] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs space-y-0.5"
                    >
                      <div className="font-semibold text-primary text-xs flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {char.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1">
                        {char.appearance}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Formulated Visual Prompt Card (Collapsible) */}
          {customPrompt && (
            <div className="bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="text-xs font-bold text-gray-900 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors"
                >
                  <Wand2 size={13} className="text-primary" />
                  <span>Prompt Visual AI</span>
                  {showPromptDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check size={12} className="text-emerald-500" />
                      <span className="text-emerald-500">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Salin Prompt</span>
                    </>
                  )}
                </button>
              </div>

              {showPromptDetails && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Deskripsi visual yang akan digambar..."
                  className="w-full bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-gray-800 dark:text-zinc-200 resize-y min-h-[60px] max-h-[110px] outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              )}
            </div>
          )}

          {/* Step 2: Image Engine & Aspect Ratio Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Image Engine Cards */}
            <div className="bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold text-gray-800 dark:text-zinc-200">
                Mesin Generator Gambar
              </label>

              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: 'gemini-3.1-flash-lite-image' as const,
                    name: 'Nano Banana 2 Lite',
                    badge: 'Lite',
                    desc: 'Cepat & Ringan (Auto Free Fallback)'
                  },
                  {
                    id: 'gemini-3.1-flash-image' as const,
                    name: 'Nano Banana 2',
                    badge: 'Standard',
                    desc: 'Standar Detail Tinggi'
                  },
                  {
                    id: 'gemini-3-pro-image' as const,
                    name: 'Nano Banana Pro',
                    badge: 'Pro',
                    desc: 'Kualitas Maksimal & Presisi'
                  }
                ].map((engine) => {
                  const isSelected = modelName === engine.id;
                  return (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => setModelName(engine.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-gray-950 dark:text-white'
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141416] text-gray-700 dark:text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{engine.name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {engine.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                          {engine.desc}
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 size={16} className="text-primary shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio Buttons */}
            <div className="bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200/80 dark:border-zinc-800 p-4 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold text-gray-800 dark:text-zinc-200">
                Rasio Format Gambar
              </label>

              <div className="grid grid-cols-5 gap-1.5">
                {(['3:4', '16:9', '9:16', '1:1', '4:3'] as const).map((ratio) => {
                  const isSelected = aspectRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2.5 px-1 rounded-xl text-center transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary text-white font-bold'
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#141416] text-gray-700 dark:text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-bold tracking-tight">{ratio}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center">
                {aspectRatio === '3:4' ? 'Portrait (3:4) - Standar Novel' :
                 aspectRatio === '16:9' ? 'Lanskap (16:9) - Sinematik' :
                 aspectRatio === '9:16' ? 'Vertikal (9:16) - Wallpaper' :
                 aspectRatio === '1:1' ? 'Persegi (1:1) - Simetris' : 'Klasik (4:3) - Standar'}
              </p>
            </div>
          </div>

          {/* Generating Indicator */}
          {isGenerating && (
            <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-3 anim-pulse">
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 dark:text-white">
                  {progressText || 'Membuat Gambar Ilustrasi...'}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-zinc-400">
                  Menggabungkan arahan gaya anime masterpiece dan pose adegan
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedIllustration && (
            <div className="bg-slate-50 dark:bg-[#202023] border border-slate-200/80 dark:border-white/5 rounded-2xl p-4 space-y-3 anim-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Ilustrasi Berhasil Dibuat
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                  {generatedIllustration.aspectRatio} &bull; {modelName === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite' : modelName === 'gemini-3.1-flash-image' ? 'Nano Banana 2' : 'Nano Banana Pro'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:w-56 max-h-[300px] rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10 bg-black flex items-center justify-center">
                  <img
                    src={generatedIllustration.imageUrl}
                    alt="Novel Scene Illustration"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 w-full space-y-3 text-xs">
                  <p className="text-gray-600 dark:text-zinc-300 italic text-xs leading-relaxed">
                    "Gambar telah disisipkan langsung ke dalam naskah bab novel Anda."
                  </p>

                  {coverSuccess && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      Berhasil dipasang sebagai sampul cover novel!
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-2.5 bg-white dark:bg-[#27272A] hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs text-gray-800 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download size={14} />
                      Download HD
                    </button>
                    <button
                      type="button"
                      onClick={handleSetAsCover}
                      className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Bookmark size={14} />
                      Jadikan Cover
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-[#202023]/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            {generatedIllustration ? 'Selesai' : 'Batal'}
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isAnalyzing || !snippet.trim() || !analysisModel || !modelName}
            className="px-6 py-2.5 bg-primary hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{progressText || 'Membuat Gambar...'}</span>
              </>
            ) : generatedIllustration ? (
              <>
                <RefreshCw size={14} />
                <span>Generate Ulang</span>
              </>
            ) : (
              <>
                <Wand2 size={14} />
                <span>Generate Ilustrasi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
