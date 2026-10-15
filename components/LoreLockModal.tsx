import React, { useState } from 'react';
import { LoreDatabase } from '../types';
import { RefreshCw, X } from 'lucide-react';

interface LoreLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  loreEnabled: boolean;
  onToggleLore: (enabled: boolean) => void;
  loreDatabase?: LoreDatabase;
  isGeneratingLore?: boolean;
  onManualSync: () => void;
}

export const LoreLockModal: React.FC<LoreLockModalProps> = ({
  isOpen,
  onClose,
  loreEnabled,
  onToggleLore,
  loreDatabase,
  isGeneratingLore,
  onManualSync
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'characters' | 'world' | 'chapters'>('summary');

  if (!isOpen) return null;

  const charactersCount = loreDatabase?.characters?.length || 0;
  const chaptersCount = loreDatabase?.chapterSummaries?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-zinc-800" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Matching Cover Maker Style */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Lore Lock
            </h2>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mt-1">
              Basis data karakter, aturan dunia & kesinambungan novel (Manual)
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 shrink-0"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Status & Sync Card - Exact Cover Maker Card Pattern */}
          <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 sm:p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">
                Status Sistem (Aktivasi Manual)
              </label>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                loreEnabled 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20'
              }`}>
                {loreEnabled ? 'Sistem Aktif' : 'Nonaktif'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              {loreEnabled 
                ? 'Sistem aktif: AI menggunakan basis data Lore Lock yang sudah terekstrak saat menulis bab baru. Aktivasi pembaruan data berjalan 100% manual tanpa popup otomatis.' 
                : 'Sistem nonaktif: Bab baru ditulis bebas tanpa memvalidasi atau memuat basis data cerita.'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button 
                type="button"
                onClick={() => onToggleLore(!loreEnabled)}
                className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all border ${
                  loreEnabled 
                    ? 'bg-primary text-white border-primary shadow-xs hover:opacity-95' 
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                {loreEnabled ? 'Nonaktifkan Sistem' : 'Aktifkan Sistem'}
              </button>

              <button
                 type="button"
                 onClick={onManualSync}
                 disabled={isGeneratingLore}
                 className="flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-colors disabled:opacity-50 shadow-xs"
              >
                 <RefreshCw size={12} className={isGeneratingLore ? 'animate-spin' : ''} />
                 <span>{isGeneratingLore ? 'Mengekstrak...' : 'Ekstrak Lore Manual'}</span>
              </button>
            </div>
          </div>

          {!loreDatabase ? (
             <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700/80">
                <h3 className="font-extrabold text-sm text-slate-700 dark:text-zinc-200 mb-1 uppercase tracking-wider">Basis Data Lore Kosong</h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Klik tombol &quot;Ekstrak Lore Manual&quot; di atas untuk menganalisis bab dan membentuk basis data entitas cerita.
                </p>
             </div>
          ) : (
            <div className="space-y-4">
              {/* Tabs Bar - Minimalist Tracked Uppercase Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                 <button 
                   onClick={() => setActiveTab('summary')} 
                   className={`whitespace-nowrap px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all shrink-0 ${
                     activeTab === 'summary' 
                       ? 'bg-primary text-white shadow-xs' 
                       : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60'
                   }`}
                 >
                   Ringkasan
                 </button>
                 <button 
                   onClick={() => setActiveTab('characters')} 
                   className={`whitespace-nowrap px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                     activeTab === 'characters' 
                       ? 'bg-primary text-white shadow-xs' 
                       : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60'
                   }`}
                 >
                   <span>Karakter</span>
                   <span className="opacity-75">({charactersCount})</span>
                 </button>
                 <button 
                   onClick={() => setActiveTab('world')} 
                   className={`whitespace-nowrap px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all shrink-0 ${
                     activeTab === 'world' 
                       ? 'bg-primary text-white shadow-xs' 
                       : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60'
                   }`}
                 >
                   Dunia & Aturan
                 </button>
                 <button 
                   onClick={() => setActiveTab('chapters')} 
                   className={`whitespace-nowrap px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                     activeTab === 'chapters' 
                       ? 'bg-primary text-white shadow-xs' 
                       : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-700/60'
                   }`}
                 >
                   <span>Rekap Bab</span>
                   <span className="opacity-75">({chaptersCount})</span>
                 </button>
              </div>

              {/* Tab Content Section */}
              {activeTab === 'summary' && (
                <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 sm:p-5 rounded-2xl space-y-2.5">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest block">
                    Sinopsis Keseluruhan
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed mb-1">
                    Ekstraksi narasi menyeluruh dari bab cerita yang sudah tercatat.
                  </p>
                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                    {loreDatabase.fullLoreSummary || "Belum ada ringkasan sinopsis yang tersedia."}
                  </div>
                </div>
              )}

              {activeTab === 'characters' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">
                      Daftar Tokoh ({charactersCount})
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">Profil Konsistensi</span>
                  </div>

                  <div className="space-y-2.5">
                    {loreDatabase.characters?.map((c, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between items-baseline">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            {[c.gender, c.age].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                          <div>
                            <span className="font-bold text-slate-500 dark:text-zinc-400">Penampilan: </span>
                            <span>{c.appearance}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-zinc-400">Kepribadian: </span>
                            <span>{c.personality}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-zinc-400">Tujuan: </span>
                            <span>{c.goals}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-zinc-400">Status: </span>
                            <span>{c.currentStatus}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!loreDatabase.characters || loreDatabase.characters.length === 0) && (
                      <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                        <p className="text-[11px] italic">Belum ada karakter yang terdaftar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'world' && (
                <div className="space-y-3">
                  <div className="px-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">
                      Aturan & Fakta Dunia
                    </label>
                  </div>

                  {loreDatabase.world ? (
                    <div className="space-y-2.5">
                      <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest block">
                          Lokasi & Faksi
                        </label>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">{loreDatabase.world.locations}</p>
                        {loreDatabase.world.factions && (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 pt-1 leading-relaxed border-t border-slate-200/50 dark:border-zinc-700/50">{loreDatabase.world.factions}</p>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest block">
                          Hukum & Fakta Konsisten
                        </label>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">{loreDatabase.world.rules}</p>
                        {loreDatabase.world.consistentFacts && (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 pt-1 leading-relaxed border-t border-slate-200/50 dark:border-zinc-700/50">{loreDatabase.world.consistentFacts}</p>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest block">
                          Peristiwa Bersejarah
                        </label>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">{loreDatabase.world.importantEvents}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                      <p className="text-[11px] italic">Belum ada data dunia yang terekam.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chapters' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-widest">
                      Rekapitulasi Bab ({chaptersCount})
                    </label>
                  </div>

                  <div className="space-y-2.5">
                    {loreDatabase.chapterSummaries?.map((cs, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 p-4 rounded-2xl space-y-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Bab {cs.chapterNumber}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">{cs.shortSummary}</p>
                        
                        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 space-y-1 text-[11px]">
                          <div>
                            <span className="font-bold text-slate-500 dark:text-zinc-400">Poin Kunci: </span>
                            <span className="text-slate-600 dark:text-zinc-300">{cs.keyEvents}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500 dark:text-zinc-400">Perubahan: </span>
                            <span className="text-slate-600 dark:text-zinc-300">{cs.characterChanges}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!loreDatabase.chapterSummaries || loreDatabase.chapterSummaries.length === 0) && (
                      <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700">
                        <p className="text-[11px] italic">Belum ada rangkuman bab yang terekam.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
