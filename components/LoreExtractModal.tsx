import React, { useState, useEffect } from 'react';
import { Novel, FLASH_LITE_MODELS } from '../types';
import { generateLoreDatabase } from '../services/loreService';
import { 
  AlertCircle, CheckCircle2, 
  Loader2, RefreshCw, X
} from 'lucide-react';

interface LoreExtractModalProps {
  isOpen: boolean;
  onClose: () => void;
  novel: Novel;
  chapterTitle?: string;
  isNewChapterTrigger?: boolean;
  onSuccess: (updatedNovel: Novel) => void;
  initialModelId?: string;
}

export const LoreExtractModal: React.FC<LoreExtractModalProps> = ({
  isOpen,
  onClose,
  novel,
  chapterTitle,
  onSuccess,
  initialModelId = 'gemini-3.5-flash-lite',
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModelId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    charactersCount: number;
    chaptersCount: number;
    hasWorld: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessInfo(null);
      setIsProcessing(false);
      if (initialModelId) {
        setSelectedModelId(initialModelId);
      }
    }
  }, [isOpen, initialModelId]);

  if (!isOpen) return null;

  const handleStartExtraction = async () => {
    if (!novel.chapters || novel.chapters.length === 0) {
      setErrorMessage("Novel belum memiliki bab untuk diekstrak.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const loreDb = await generateLoreDatabase(novel.chapters, selectedModelId);

      if (!loreDb || (!loreDb.characters?.length && !loreDb.fullLoreSummary && !loreDb.world)) {
        throw new Error(`Model ${selectedModelId} tidak menghasilkan data Lore Lock yang valid. Respons kosong atau format tidak sesuai.`);
      }

      const updatedNovel: Novel = {
        ...novel,
        loreDatabase: loreDb,
        updatedAt: Date.now()
      };

      setSuccessInfo({
        charactersCount: loreDb.characters?.length || 0,
        chaptersCount: loreDb.chapterSummaries?.length || 0,
        hasWorld: !!(loreDb.world?.locations || loreDb.world?.rules || loreDb.world?.factions),
      });

      onSuccess(updatedNovel);

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error("[LoreExtractModal] Extraction failed:", err);
      const msg = err.message || "Gagal melakukan ekstraksi Lore Lock. Periksa koneksi atau pilih model lain.";
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedModelObj = FLASH_LITE_MODELS.find(m => m.id === selectedModelId);

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Typographic Focus */}
        <div className="flex items-start justify-between pb-3.5 sm:pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Ekstraksi Lore Lock (Manual)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-md">
                Lore Lock
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 sm:line-clamp-none">
              {chapterTitle ? `Target: ${chapterTitle}` : `Novel: ${novel.title}`} • Analisis entitas karakter, aturan semesta, dan plot log.
            </p>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Error Alert Box (if failed) */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <h3 className="font-bold text-sm text-red-900 dark:text-red-200 mb-1">
                    Gagal Mengekstrak Lore Lock
                  </h3>
                  <p className="leading-relaxed mb-2 opacity-90">
                    {errorMessage}
                  </p>
                  <p className="font-medium text-[11px] text-red-700 dark:text-red-300">
                    Silakan pilih model AI lain di bawah atau klik Coba Lagi Ekstraksi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Alert Box */}
          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 text-xs">
                  <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Lore Lock Berhasil Disinkronkan
                  </h3>
                  <p className="mt-1 font-medium text-emerald-800 dark:text-emerald-300">
                    {successInfo.charactersCount} Karakter • {successInfo.chaptersCount} Ringkasan Bab
                    {successInfo.hasWorld ? ' • Aturan Dunia Terverifikasi' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Pilih Model AI
              </label>
              <span className="text-xs text-gray-400">
                {FLASH_LITE_MODELS.length} Model Flash Lite Tersedia
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FLASH_LITE_MODELS.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 text-gray-900 dark:text-white ring-1 ring-primary/40'
                        : 'border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs">{model.name}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      )}
                    </div>
                    <code className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded self-start">
                      {model.id}
                    </code>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Model Indicator */}
          {selectedModelObj && (
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>
                Model Aktif: <strong className="text-gray-900 dark:text-gray-100">{selectedModelObj.name}</strong>
              </span>
              <code className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                {selectedModelObj.id}
              </code>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Lewati
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleStartExtraction}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all ${
              errorMessage 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-primary hover:opacity-95'
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Mengekstrak...</span>
              </>
            ) : errorMessage ? (
              <>
                <RefreshCw size={14} />
                <span>Coba Lagi Ekstraksi</span>
              </>
            ) : (
              <span>Mulai Ekstraksi</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
