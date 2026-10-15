import React, { useState } from 'react';
import { Globe, Wand2, X } from 'lucide-react';

interface WorldLoreModalProps {
  initialLore: string;
  onSave: (lore: string) => void;
  onClose: () => void;
  onAutoGenerate: (prompt: string) => Promise<string>;
}

export const WorldLoreModal: React.FC<WorldLoreModalProps> = ({
  initialLore,
  onSave,
  onClose,
  onAutoGenerate,
}) => {
  const [lore, setLore] = useState(initialLore);
  const [autoPrompt, setAutoPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!autoPrompt.trim()) return;
    setIsGenerating(true);
    try {
        const result = await onAutoGenerate(autoPrompt);
        setLore(result);
    } catch (e) {
        console.error(e);
        alert('Failed to generate world lore.');
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-fade">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-zinc-800 flex flex-col h-[80vh] max-h-[800px]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-primary">
            <Globe size={20} />
            <h3 className="font-bold">World Lore (Fanfic)</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="space-y-2 shrink-0">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Auto Generate</label>
                <p className="text-xs text-gray-500">Provide a concept (e.g. "Tensura", "Harry Potter world") and let AI create the foundational lore for you.</p>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        placeholder="e.g. Tensura anime world..."
                        className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={autoPrompt}
                        onChange={(e) => setAutoPrompt(e.target.value)}
                        disabled={isGenerating}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') handleGenerate();
                        }}
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !autoPrompt.trim()}
                        className="px-4 py-2 theme-btn-primary text-white rounded-xl text-sm font-bold flex items-center gap-2  disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? 'Generating...' : <><Wand2 size={16} /> Generate</>}
                    </button>
                </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">World Lore Details</label>
                <p className="text-xs text-gray-500">Edit manually to ensure precision. This text will be injected with high priority to guide AI generations.</p>
                <textarea
                    className="w-full flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                    placeholder="Describe the world, rules, characters, and factions..."
                    value={lore}
                    onChange={(e) => setLore(e.target.value)}
                />
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button 
            onClick={() => {
              onSave(lore);
              onClose();
            }}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Save World Lore
          </button>
        </div>
      </div>
    </div>
  );
};
