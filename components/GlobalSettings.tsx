import React, { useRef, useState, useMemo } from 'react';
import { GlobalConfig, StyleEntry, DEFAULT_SAFETY_SETTINGS, InstructionPreset } from '../types';
import { ConfigList } from './ConfigList';
import { 
  ChevronLeft, 
  Trash2, 
  Download, 
  Upload, 
  AlertTriangle, 
  RefreshCw,
  Plus,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const PRESETS = [
  { name: 'Precision', value: 0.65 },
  { name: 'Narrative Flow', value: 0.72 },
  { name: 'Standard', value: 0.85 },
  { name: 'Dynamic', value: 1.15 },
  { name: 'Creative', value: 1.45 }
];

const AdaptiveTextarea = ({ 
  value, 
  onChange, 
  placeholder, 
  className 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string; 
  className?: string; 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <textarea 
      ref={textareaRef}
      className={className || `w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-100 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 outline-none shadow-md shadow-black/5 dark:shadow-black/10`}
      rows={isFocused ? 5 : 1}
      style={{ height: isFocused ? 'auto' : undefined }}
      placeholder={placeholder}
      value={localValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  );
};

interface GlobalSettingsProps {
  config: GlobalConfig;
  onUpdate: (newConfig: GlobalConfig) => void;
  onBack: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ config, onUpdate, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputInstructionsRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Multi Persona State
  const [isAddingPersona, setIsAddingPersona] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaContent, setNewPersonaContent] = useState('');
  const [expandedPersonaIds, setExpandedPersonaIds] = useState<Set<string>>(new Set());

  // Presets from config - no automatic/fake default personas
  const presets: InstructionPreset[] = useMemo(() => {
    if (config.instructionPresets && Array.isArray(config.instructionPresets)) {
      return config.instructionPresets.filter(p => p.id !== 'tana-french' && !p.name?.toLowerCase().includes('tana french'));
    }
    return [];
  }, [config.instructionPresets]);

  // System persona only active if explicitly set to true
  const activePersonasCount = presets.filter(p => p.active === true).length;

  const commitPresets = (updated: InstructionPreset[]) => {
    onUpdate({
      ...config,
      instructionPresets: updated,
      customInstruction: ''
    });
  };

  const togglePersonaActive = (id: string) => {
    const updated = presets.map(p => {
      if (p.id === id) {
        return { ...p, active: p.active === true ? false : true };
      }
      return p;
    });
    commitPresets(updated);
  };

  const updatePersona = (id: string, updates: Partial<InstructionPreset>) => {
    const updated = presets.map(p => p.id === id ? { ...p, ...updates } : p);
    commitPresets(updated);
  };

  const deletePersona = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    commitPresets(updated);
  };

  const handleCreatePersona = () => {
    if (!newPersonaName.trim() || !newPersonaContent.trim()) return;
    const newPreset: InstructionPreset = {
      id: `persona_${Date.now()}`,
      name: newPersonaName.trim(),
      content: newPersonaContent.trim(),
      active: true
    };
    commitPresets([...presets, newPreset]);
    setNewPersonaName('');
    setNewPersonaContent('');
    setIsAddingPersona(false);
    setExpandedPersonaIds(new Set([...expandedPersonaIds, newPreset.id]));
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedPersonaIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedPersonaIds(next);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "nparte-settings.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedConfig = JSON.parse(event.target?.result as string);
        if (importedConfig && typeof importedConfig === 'object') {
          onUpdate({ ...config, ...importedConfig });
        }
      } catch (err) {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportSystemInstructions = () => {
    const dataToExport = {
      instructionPresets: presets
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "nparte-personas.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportSystemInstructions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const textContent = event.target?.result as string;
        try {
          const importedData = JSON.parse(textContent);
          if (importedData && typeof importedData === 'object') {
            if (Array.isArray(importedData.instructionPresets)) {
              commitPresets([...presets, ...importedData.instructionPresets]);
            } else {
              const singleName = importedData.name || 'Imported Persona';
              const singleContent = importedData.customInstruction || importedData.content || textContent;
              commitPresets([
                ...presets,
                {
                  id: `imported_${Date.now()}`,
                  name: singleName,
                  content: singleContent,
                  active: true
                }
              ]);
            }
          }
        } catch (jsonErr) {
          commitPresets([
            ...presets,
            {
              id: `imported_${Date.now()}`,
              name: 'Imported Persona',
              content: textContent.trim(),
              active: true
            }
          ]);
        }
      } catch (err) {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  const renderStyle = (
    item: StyleEntry,
    index: number, 
    onDelete: () => void, 
    onEdit: (s: StyleEntry) => void
  ) => (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
            Rule {index + 1}
          </div>
        </div>
        <button 
          type="button"
          onClick={onDelete} 
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 shrink-0 p-2 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Delete rule"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="relative">
        <AdaptiveTextarea 
          placeholder="Enter writing style description (e.g. 'Use detailed sensory adjectives, avoid clichés...')"
          value={item.rule}
          onChange={(val) => onEdit({ ...item, rule: val })}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#09090b] text-foreground relative">
      <header className="flex-none p-5 sm:p-6 flex justify-between items-center sticky top-0 z-30 bg-slate-50/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900 transition-all">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 bg-white dark:bg-zinc-900 border border-gray-200/55 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-all flex items-center justify-center text-gray-700 dark:text-zinc-300 shadow-md shadow-black/5 dark:shadow-black/10 cursor-pointer"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-xl">System Settings</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 font-medium">Configure Personas, Styles, & Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200/60 dark:border-zinc-850 rounded-xl transition-all text-gray-600 dark:text-zinc-300 shadow-md shadow-black/5 dark:shadow-black/10 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Import Settings"
          >
            <Upload size={15} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button 
            onClick={handleExport}
            className="p-2 sm:p-2.5 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-200/60 dark:border-zinc-850 rounded-xl transition-all text-gray-600 dark:text-zinc-300 shadow-md shadow-black/5 dark:shadow-black/10 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Export Settings"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-36 max-w-3xl mx-auto w-full space-y-8">
         
         <div className="space-y-8">
            
            {/* 1. SYSTEM PERSONAS (CLEAN MULTI-SELECT) */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  <h2 className="text-xs tracking-wider text-gray-900 dark:text-zinc-200 uppercase font-bold">
                    System Persona
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80">
                    {activePersonasCount} dari {presets.length} Aktif
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-5 sm:p-6 border border-gray-200/50 dark:border-zinc-800/50 shadow-md shadow-black/5 dark:shadow-black/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800/60 flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 tracking-tight">
                      Daftar Persona Sistem
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Persona hanya aktif dan digunakan jika dicentang di sini. Anda dapat mengaktifkan beberapa persona sekaligus.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input 
                      type="file" 
                      accept=".json,.txt" 
                      ref={fileInputInstructionsRef} 
                      onChange={handleImportSystemInstructions} 
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputInstructionsRef.current?.click()}
                      className="p-1.5 sm:p-2 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-lg transition-all text-gray-600 dark:text-zinc-300 hover:text-primary shadow-xs flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="Import File Persona"
                    >
                      <Upload size={13} />
                      <span className="text-[11px]">Import</span>
                    </button>
                    <button 
                      type="button"
                      onClick={handleExportSystemInstructions}
                      className="p-1.5 sm:p-2 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-lg transition-all text-gray-600 dark:text-zinc-300 hover:text-primary shadow-xs flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="Export File Persona"
                    >
                      <Download size={13} />
                      <span className="text-[11px]">Export</span>
                    </button>
                  </div>
                </div>

                {/* Persona Cards */}
                <div className="space-y-3">
                  {presets.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-slate-50/50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 space-y-2">
                      <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">
                        Belum ada persona sistem
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                        Tambahkan persona baru di bawah ini dan centang status aktif untuk menerapkannya pada AI.
                      </p>
                    </div>
                  ) : (
                    presets.map((persona) => {
                      const isActive = persona.active === true;
                      const isExpanded = expandedPersonaIds.has(persona.id);

                      return (
                        <div 
                          key={persona.id}
                          className={`rounded-2xl border transition-all ${
                            isActive 
                              ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 shadow-xs' 
                              : 'bg-slate-50/60 dark:bg-zinc-950/60 border-gray-200/80 dark:border-zinc-850 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="p-3.5 flex items-center justify-between gap-3">
                            {/* Checkbox toggle */}
                            <button
                              type="button"
                              onClick={() => togglePersonaActive(persona.id)}
                              className="cursor-pointer shrink-0"
                              title={isActive ? 'Nonaktifkan persona' : 'Aktifkan persona'}
                            >
                              {isActive ? (
                                <CheckCircle2 size={20} className="text-primary fill-primary/20" />
                              ) : (
                                <Circle size={20} className="text-gray-400 dark:text-zinc-600" />
                              )}
                            </button>

                            {/* Name & snippet */}
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleExpand(persona.id)}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-gray-950 dark:text-gray-100 truncate">
                                  {persona.name}
                                </span>
                                {isActive && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                    Aktif
                                  </span>
                                )}
                              </div>
                              {!isExpanded && (
                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                                  {persona.content}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleExpand(persona.id)}
                                className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                title={isExpanded ? 'Tutup instruksi' : 'Buka instruksi'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePersona(persona.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                title="Hapus persona"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Editor */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 border-t border-black/5 dark:border-white/5 space-y-3">
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                                  Nama Persona
                                </label>
                                <input
                                  type="text"
                                  value={persona.name}
                                  onChange={(e) => updatePersona(persona.id, { name: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary/40"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                                  Instruksi Persona
                                </label>
                                <textarea
                                  value={persona.content}
                                  onChange={(e) => updatePersona(persona.id, { content: e.target.value })}
                                  rows={6}
                                  className="w-full p-3 bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 font-mono leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                  placeholder="Tulis instruksi persona..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add New Persona Form or Button */}
                {isAddingPersona ? (
                  <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-primary/40 rounded-2xl space-y-3 anim-slide-up shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-950 dark:text-white flex items-center gap-1.5">
                        <Plus size={15} className="text-primary" />
                        Tambah Persona Baru
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingPersona(false)}
                        className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                          Nama Persona
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Gaya Realis Noir, Dialog Cepat..."
                          value={newPersonaName}
                          onChange={(e) => setNewPersonaName(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 font-bold outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                          Instruksi Persona
                        </label>
                        <textarea
                          placeholder="Tuliskan petunjuk gaya, batas dialog, atau fokus persona ini..."
                          value={newPersonaContent}
                          onChange={(e) => setNewPersonaContent(e.target.value)}
                          rows={5}
                          className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 font-mono leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingPersona(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleCreatePersona}
                        disabled={!newPersonaName.trim() || !newPersonaContent.trim()}
                        className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Simpan Persona
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingPersona(true)}
                    className="w-full py-2.5 border border-dashed border-gray-300 dark:border-zinc-700 hover:border-primary text-gray-600 dark:text-zinc-300 hover:text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:bg-primary/5"
                  >
                    <Plus size={15} />
                    Tambah Persona Baru
                  </button>
                )}
              </div>
            </section>

            {/* 2. STYLING RULES */}
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <h2 className="text-xs tracking-wider text-gray-900 dark:text-zinc-200 uppercase font-bold">
                      Styling Rules
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    High Priority
                  </span>
                </div>
                <ConfigList<StyleEntry>
                    title="Mandatory Style Directives"
                    items={config.styles}
                    onUpdate={(items) => onUpdate({ ...config, styles: items })}
                    renderItem={renderStyle}
                    createEmpty={() => ({ id: crypto.randomUUID(), rule: '' })}
                />
            </section>

            {/* 3. GENERATION PRESETS (TEMPERATURE & WORD RANGE) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <h2 className="text-xs tracking-wider text-gray-900 dark:text-zinc-200 uppercase font-bold">
                  Generation Presets
                </h2>
              </div>

              <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-5 sm:p-6 border border-gray-200/50 dark:border-zinc-800/50 shadow-md shadow-black/5 dark:shadow-black/10">
                <div className="mb-6 pb-4 border-b border-gray-100 dark:border-zinc-800/60">
                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100 tracking-tight">Engine Temperature & Word Target</h3>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">Kreativitas & Batas Kata</p>
                </div>
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => onUpdate({ ...config, temperature: preset.value })}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    config.temperature === preset.value
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'bg-slate-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300'
                                }`}
                            >
                                {preset.name} ({preset.value})
                            </button>
                        ))}
                    </div>

                    {/* DYNAMIC WORD-RANGE FORCE */}
                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800/60 space-y-3">
                      <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">Dynamic Word-Range Force</h4>
                              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">Batas kata minimum dan maksimum untuk recursive force loop</p>
                          </div>
                          <button 
                              type="button"
                              onClick={() => {
                                const current = config.customRecursiveForce;
                                onUpdate({ 
                                    ...config, 
                                    customRecursiveForce: { 
                                        active: !current?.active, 
                                        min: current?.min || 2000, 
                                        max: current?.max || 4000 
                                    } 
                                });
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${config.customRecursiveForce?.active ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-850'}`}
                          >
                              <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${config.customRecursiveForce?.active ? 'translate-x-2' : '-translate-x-2'}`}/>
                          </button>
                      </div>
                      
                      {config.customRecursiveForce?.active && (
                          <div className="flex items-center gap-3 pt-1 anim-slide-up">
                              <div className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden flex items-center focus-within:border-primary">
                                  <div className="pl-3.5 text-[9px] text-gray-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider">MIN</div>
                                  <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={config.customRecursiveForce?.min === undefined || Number.isNaN(config.customRecursiveForce.min) ? '' : config.customRecursiveForce.min}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          onUpdate({ ...config, customRecursiveForce: { ...config.customRecursiveForce!, min: isNaN(val) ? 0 : val } });
                                      }}
                                      className="w-full bg-transparent border-none focus:ring-0 text-xs sm:text-sm font-bold py-2.5 px-3 outline-none"
                                  />
                              </div>
                              <span className="text-gray-400 dark:text-zinc-500 font-bold">-</span>
                              <div className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden flex items-center focus-within:border-primary">
                                  <div className="pl-3.5 text-[9px] text-gray-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider">MAX</div>
                                  <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={config.customRecursiveForce?.max === undefined || Number.isNaN(config.customRecursiveForce.max) ? '' : config.customRecursiveForce.max}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          onUpdate({ ...config, customRecursiveForce: { ...config.customRecursiveForce!, max: isNaN(val) ? 0 : val } });
                                      }}
                                      className="w-full bg-transparent border-none focus:ring-0 text-xs sm:text-sm font-bold py-2.5 px-3 outline-none"
                                  />
                              </div>
                          </div>
                      )}
                    </div>
                </div>
              </div>
            </section>

            {/* 4. PERFORMANCE & ANIMATIONS */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-1.5 w-3 rounded-full bg-sky-500"></span>
                  <h2 className="text-xs tracking-[0.18em] text-gray-500 dark:text-zinc-400 uppercase font-bold">Device Performance</h2>
                </div>

                <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-5 sm:p-6 border border-gray-200/50 dark:border-zinc-800/50 shadow-md shadow-black/5 dark:shadow-black/10">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                              Disable UI Animations
                              {config.disableAnimations && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Zero-Lag Aktif
                                </span>
                              )}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">
                              Mematikan 100% animasi CSS, transisi Framer Motion, dan blur untuk performa super instan & anti-lag.
                            </p>
                        </div>
                        <button 
                            id="toggle-turn-off-animations"
                            type="button"
                            onClick={() => {
                              const nextVal = !config.disableAnimations;
                              try {
                                localStorage.setItem('user_disable_animations', nextVal ? 'true' : 'false');
                                if (typeof document !== 'undefined') {
                                  document.documentElement.classList.toggle('disable-animations', nextVal);
                                  document.body.classList.toggle('disable-animations', nextVal);
                                }
                              } catch (_) {}
                              onUpdate({ ...config, disableAnimations: nextVal });
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${config.disableAnimations ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-850'}`}
                        >
                            <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${config.disableAnimations ? 'translate-x-2' : '-translate-x-2'}`}/>
                        </button>
                    </div>
                </div>
            </section> 

         </div>          
         
         <div className="pt-8 border-t border-gray-200/50 dark:border-zinc-800/60">
            <button 
               type="button"
               onClick={() => setShowResetConfirm(true)}
               className="w-full py-4 rounded-2xl border border-red-500/20 hover:border-red-500/40 text-red-500 font-extrabold hover:bg-red-50/40 dark:hover:bg-red-950/10 cursor-pointer transition-all duration-200 text-sm flex items-center justify-center gap-2"
            >
               <RefreshCw size={15} />
               Reset Engine to Factory Defaults
            </button>
         </div>

         {showResetConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade">
               <div className="bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl w-full max-w-sm p-6 border border-gray-200/60 dark:border-zinc-800/80 anim-pop">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20">
                     <AlertTriangle size={24} />
                  </div>
                  <h3 className="font-extrabold text-lg mb-2 text-gray-950 dark:text-white">
                     Reset All Settings?
                  </h3>
                  <p className="text-gray-500 dark:text-zinc-400 text-xs leading-relaxed mb-6">
                     Tindakan ini akan mengembalikan semua direktif persona, aturan gaya, dan konfigurasi engine ke default pabrik.
                  </p>
                  <div className="flex justify-end gap-3.5">
                     <button 
                        type="button"
                        onClick={() => setShowResetConfirm(false)} 
                        className="px-4.5 py-2.5 text-xs font-bold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                     >
                        Batal
                     </button>
                     <button 
                        type="button"
                        onClick={() => {
                           onUpdate({
                              folders: config.folders,
                              libraryViewMode: config.libraryViewMode,
                              instructionMode: 'build',
                              styles: [],
                              temperature: 0.7,
                              highThinkingMode: true,
                              thinkingLevel: 'Medium',
                              modelThinkingLevels: {},
                              safetySettings: { ...DEFAULT_SAFETY_SETTINGS },
                              chapterTargetWordCount: undefined,
                              customRecursiveForce: { active: false, min: 2000, max: 4000 },
                              customInstruction: '',
                              instructionPresets: []
                           });
                           setShowResetConfirm(false);
                        }} 
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/10 transition-all cursor-pointer"
                     >
                        Reset Factory
                     </button>
                  </div>
               </div>
            </div>
         )}

         <div className="text-center pt-8 opacity-45">
           <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-gray-500">NParte Engine Pro v2.0</p>
         </div>
      </main>
    </div>
  );
};
