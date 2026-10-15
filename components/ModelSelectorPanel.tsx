import React, { useState, useEffect } from 'react';
import { Settings, X, CheckCircle2, ChevronDown, ChevronUp, Shield, ExternalLink } from 'lucide-react';
import { 
  CHAPTER_AVAILABLE_MODELS, 
  AIModel, 
  GlobalConfig, 
  ThinkingLevelOption, 
  SafetySettingsConfig, 
  DEFAULT_SAFETY_SETTINGS,
  getSupportedThinkingLevels, 
  getEffectiveThinkingLevel 
} from '../types';
import { SafetySettingsModal } from './SafetySettingsModal';
import { getGlobalConfig, saveGlobalConfig } from '../services/storage';
import { getGlobalApiKey } from '../services/aiService';

interface ModelSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isGenerating: boolean;
  geminiModels?: AIModel[];
  globalConfig?: GlobalConfig;
  onUpdateConfig?: (config: GlobalConfig) => void;
}

export const ModelSelectorPanel: React.FC<ModelSelectorPanelProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  isGenerating,
  geminiModels = CHAPTER_AVAILABLE_MODELS,
  globalConfig: propGlobalConfig,
  onUpdateConfig: propOnUpdateConfig,
}) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiKey2, setGeminiKey2] = useState('');
  const [geminiKey3, setGeminiKey3] = useState('');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isEditingKey2, setIsEditingKey2] = useState(false);
  const [isEditingKey3, setIsEditingKey3] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(isOpen);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<GlobalConfig | undefined>(propGlobalConfig);

  useEffect(() => {
    if (propGlobalConfig) {
      setLocalConfig(propGlobalConfig);
    } else {
      getGlobalConfig().then(setLocalConfig);
    }
  }, [propGlobalConfig, isOpen]);

  useEffect(() => {
    const isAnimOff = Boolean(
      localConfig?.disableAnimations ||
      (typeof document !== 'undefined' && document.documentElement.classList.contains('disable-animations'))
    );

    if (isOpen) {
      setRendered(true);
      const activeGeminiKey = getGlobalApiKey();
      setGeminiKey(activeGeminiKey);
      setGeminiKey2(localStorage.getItem('user_gemini_api_key_2') || (process.env.GEMINI_API_KEY_2 as string) || '');
      setGeminiKey3(localStorage.getItem('user_gemini_api_key_3') || (process.env.GEMINI_API_KEY_3 as string) || '');

      fetch('/api/key')
        .then((res) => res.json())
        .then((data) => {
          if (data.apiKey) {
            setGeminiKey(data.apiKey);
            localStorage.setItem('user_gemini_api_key', data.apiKey);
          }
          if (data.apiKey2 && !localStorage.getItem('user_gemini_api_key_2')) {
            setGeminiKey2(data.apiKey2);
            localStorage.setItem('user_gemini_api_key_2', data.apiKey2);
          }
          if (data.apiKey3 && !localStorage.getItem('user_gemini_api_key_3')) {
            setGeminiKey3(data.apiKey3);
            localStorage.setItem('user_gemini_api_key_3', data.apiKey3);
          }
        })
        .catch(() => {});

      // Purge any lingering legacy keys from local storage
      localStorage.removeItem('user_groq_api_key');
      localStorage.removeItem('user_openrouter_api_key');

      setIsEditingKey(false);
      setIsEditingKey2(false);
      setIsEditingKey3(false);
      setIsThinkingOpen(false);

      if (isAnimOff) {
        setMounted(true);
      } else {
        requestAnimationFrame(() => {
          setTimeout(() => setMounted(true), 10);
        });
      }
    } else {
      setMounted(false);
      if (isAnimOff) {
        setRendered(false);
      } else {
        const timer = setTimeout(() => setRendered(false), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, localConfig?.disableAnimations]);

  const handleSaveKey = (slot: 'primary' | 'backup2' | 'backup3', key: string) => {
    const storageMap = {
      primary: 'user_gemini_api_key',
      backup2: 'user_gemini_api_key_2',
      backup3: 'user_gemini_api_key_3',
    };
    const storageKey = storageMap[slot];
    if (key.trim()) {
      localStorage.setItem(storageKey, key.trim());
    } else {
      localStorage.removeItem(storageKey);
    }
    if (slot === 'primary') setIsEditingKey(false);
    if (slot === 'backup2') setIsEditingKey2(false);
    if (slot === 'backup3') setIsEditingKey3(false);
  };

  const getMaskedKey = (key: string) => {
    if (!key) return 'No API Key Set';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  const currentModels = geminiModels;
  const filteredModels = currentModels;

  const activeModelObj = currentModels.find((m) => m.id === selectedModel) || currentModels[0];

  // Dynamic Thinking Level options strictly according to the model's capabilities (Gemini)
  const supportedLevels = getSupportedThinkingLevels(activeModelObj?.id || selectedModel);
  const currentThinkingLevel = getEffectiveThinkingLevel(activeModelObj?.id || selectedModel, localConfig);

  const handleSelectThinkingLevel = (level: ThinkingLevelOption) => {
    if (!supportedLevels.includes(level)) return;

    const updatedConfig: GlobalConfig = {
      ...(localConfig || {
        instructionMode: 'build',
        styles: [],
        temperature: 0.7,
      }),
      thinkingLevel: level,
      modelThinkingLevels: {
        ...(localConfig?.modelThinkingLevels || {}),
        [activeModelObj.id]: level,
      },
    };

    setLocalConfig(updatedConfig);
    if (propOnUpdateConfig) {
      propOnUpdateConfig(updatedConfig);
    }
    saveGlobalConfig(updatedConfig);
    setIsThinkingOpen(false);
  };

  const handleUpdateSafetySettings = (newSafety: SafetySettingsConfig) => {
    const updatedConfig: GlobalConfig = {
      ...(localConfig || {
        instructionMode: 'build',
        styles: [],
        temperature: 0.7,
      }),
      safetySettings: newSafety,
    };

    setLocalConfig(updatedConfig);
    if (propOnUpdateConfig) {
      propOnUpdateConfig(updatedConfig);
    }
    saveGlobalConfig(updatedConfig);
  };

  if (!rendered) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-200 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed bottom-0 md:bottom-auto md:top-1/2 left-1/2 w-full md:w-[560px] max-h-[92vh] bg-white dark:bg-[#18181B] text-gray-900 dark:text-gray-100 md:rounded-3xl rounded-t-3xl shadow-2xl z-[101] border border-black/10 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          mounted
            ? '-translate-x-1/2 translate-y-0 md:-translate-y-1/2 opacity-100 md:scale-100'
            : '-translate-x-1/2 translate-y-full md:-translate-y-1/2 opacity-0 md:scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            AI Engine Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(92vh-140px)] flex flex-col gap-5">
          {/* Active Model Card */}
          {activeModelObj && (
            <div className="bg-slate-50/80 dark:bg-[#202023] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 space-y-4">
              {/* Model Info Header */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white">
                    {activeModelObj.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {activeModelObj.id.includes('flash-lite') && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        ⚡ Lite Engine
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold border bg-primary/10 text-primary border-primary/20">
                      Gemini
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                </div>
                <div className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                  {activeModelObj.id}
                </div>
                {activeModelObj.description && (
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400 pt-1 leading-relaxed">
                    {activeModelObj.description}
                  </p>
                )}
              </div>

              {/* Thinking Level Dropdown */}
              {supportedLevels.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                    Thinking level
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                      disabled={isGenerating}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#27272A] border border-slate-200 dark:border-white/10 text-gray-900 dark:text-white flex items-center justify-between text-sm font-semibold transition-all hover:border-slate-300 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-xs"
                    >
                      <span>{currentThinkingLevel}</span>
                      {isThinkingOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {isThinkingOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-20 anim-pop">
                        <div className="p-1 space-y-0.5">
                          {supportedLevels.map((lvl) => {
                            const isCurrent = currentThinkingLevel === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleSelectThinkingLevel(lvl)}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                                  isCurrent
                                    ? 'bg-slate-100 dark:bg-white/10 text-primary dark:text-white'
                                    : 'text-gray-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                              >
                                <span>{lvl}</span>
                                {isCurrent && <CheckCircle2 className="w-4 h-4 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Safety Settings Trigger */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-gray-500 dark:text-zinc-400" />
                  <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                    Safety settings
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSafetyModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Model Switcher List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Pilih Model Gemini ({filteredModels.length})
              </label>
            </div>

            <div className="space-y-1.5">
              {filteredModels.map((model) => {
                const isSelected = selectedModel === model.id;

                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsThinkingOpen(false);
                    }}
                    disabled={isGenerating}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20 shadow-xs'
                        : 'border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-[#202023]/60 hover:bg-slate-100 dark:hover:bg-[#27272A] hover:border-slate-300 dark:hover:border-white/10'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {model.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Gemini
                        </span>
                        {model.id.includes('flash-lite') && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Lite Engine
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 mt-0.5 truncate">
                        {model.id}
                      </div>
                      {model.description && (
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-1">
                          {model.description}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-zinc-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Management Section (Multi-Key Secret & Fallback) */}
          <div className="pt-5 border-t border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider">
                Multi-Key Secret & Fallback
              </span>
              <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 font-bold">
                Auto-Fallback Aktif
              </span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed bg-primary/5 dark:bg-white/5 p-2.5 rounded-xl border border-primary/10 dark:border-white/10">
              💡 <strong>Cadangan Anti-Putus:</strong> Anda dapat mengisi <strong>Key 2</strong> dan <strong>Key 3</strong> dengan API Key Gemini cadangan Anda. Jika kunci utama terputus, limit (429), atau error, AI langsung otomatis beralih ke kunci cadangan secara mulus tanpa menghentikan penulisan.
            </p>

            {/* 1. Primary Gemini Key */}
            <div className="space-y-1.5 bg-slate-50/60 dark:bg-[#202023]/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>Gemini API Key (Utama)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Primary
                  </span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                >
                  Dapatkan Key <ExternalLink size={10} />
                </a>
              </div>

              {!isEditingKey && geminiKey ? (
                <div
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#27272A] text-gray-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors font-mono text-xs"
                  onClick={() => setIsEditingKey(true)}
                >
                  <span>{getMaskedKey(geminiKey)}</span>
                  <span className="text-xs font-sans text-primary font-bold">Edit</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy... (atau AQ.Ab8...)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#27272A] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-mono text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveKey('primary', geminiKey)}
                      className="flex-1 py-1.5 px-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-opacity text-xs"
                    >
                      Simpan Primary Key
                    </button>
                    {isEditingKey && (
                      <button
                        onClick={() => setIsEditingKey(false)}
                        className="py-1.5 px-3 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg font-bold text-xs"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Backup Gemini Key 2 */}
            <div className="space-y-1.5 bg-slate-50/60 dark:bg-[#202023]/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>Gemini API Key 2 (Backup 1)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Backup 1
                  </span>
                </label>
                <span className="text-[10px] text-gray-400">Opsional</span>
              </div>

              {!isEditingKey2 && geminiKey2 ? (
                <div
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#27272A] text-gray-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors font-mono text-xs"
                  onClick={() => setIsEditingKey2(true)}
                >
                  <span>{getMaskedKey(geminiKey2)}</span>
                  <span className="text-xs font-sans text-amber-600 dark:text-amber-400 font-bold">Edit</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={geminiKey2}
                    onChange={(e) => setGeminiKey2(e.target.value)}
                    placeholder="Masukkan Gemini API Key cadangan 1 (AIzaSy...)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#27272A] text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-gray-400 font-mono text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveKey('backup2', geminiKey2)}
                      className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors text-xs"
                    >
                      Simpan Backup Key 1
                    </button>
                    {isEditingKey2 && (
                      <button
                        onClick={() => setIsEditingKey2(false)}
                        className="py-1.5 px-3 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg font-bold text-xs"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Backup Gemini Key 3 */}
            <div className="space-y-1.5 bg-slate-50/60 dark:bg-[#202023]/60 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>Gemini API Key 3 (Backup 2)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Backup 2
                  </span>
                </label>
                <span className="text-[10px] text-gray-400">Opsional</span>
              </div>

              {!isEditingKey3 && geminiKey3 ? (
                <div
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#27272A] text-gray-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors font-mono text-xs"
                  onClick={() => setIsEditingKey3(true)}
                >
                  <span>{getMaskedKey(geminiKey3)}</span>
                  <span className="text-xs font-sans text-purple-600 dark:text-purple-400 font-bold">Edit</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={geminiKey3}
                    onChange={(e) => setGeminiKey3(e.target.value)}
                    placeholder="Masukkan Gemini API Key cadangan 2 (AIzaSy...)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#27272A] text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400 font-mono text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveKey('backup3', geminiKey3)}
                      className="flex-1 py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-colors text-xs"
                    >
                      Simpan Backup Key 2
                    </button>
                    {isEditingKey3 && (
                      <button
                        onClick={() => setIsEditingKey3(false)}
                        className="py-1.5 px-3 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg font-bold text-xs"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Run Safety Settings Modal (Screen 10 Style) */}
      <SafetySettingsModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        safetySettings={localConfig?.safetySettings || DEFAULT_SAFETY_SETTINGS}
        onUpdate={handleUpdateSafetySettings}
      />
    </>
  );
};
