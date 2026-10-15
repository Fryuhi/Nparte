import React, { useState } from 'react';
import { Novel } from '../types';
import { generateDocxBlob, generatePdfBlob, generateTxtBlob } from '../services/exportService';
import { X, Download, Copy, CheckSquare, Square, FileText } from 'lucide-react';

export const ExportManager = ({ novel, onClose }: { novel: Novel, onClose: () => void }) => {
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set(novel.chapters.map(c => c.id)));
  const [format, setFormat] = useState<'docx'|'pdf'|'txt'>('docx');

  const toggleSelect = (id: string) => {
    const next = new Set(selectedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChapters(next);
  };
  
  const selectAll = () => setSelectedChapters(new Set(novel.chapters.map(c => c.id)));
  const deselectAll = () => setSelectedChapters(new Set());

  const getChaptersToExport = () => {
    return novel.chapters.filter(c => selectedChapters.has(c.id));
  };

  const handleCopy = async () => {
    const chapters = getChaptersToExport();
    if (!chapters.length) return;
    const txtBlob = generateTxtBlob(novel, chapters);
    const text = await txtBlob.text();
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleDownload = async () => {
    const chapters = getChaptersToExport();
    if (!chapters.length) return;
    
    let blob;
    if (format === 'docx') blob = await generateDocxBlob(chapters);
    else if (format === 'pdf') blob = generatePdfBlob(chapters);
    else blob = generateTxtBlob(novel, chapters);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title.replace(/[^a-zA-Z0-9]/g, '_')}_Export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-fade">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-zinc-800 anim-pop flex flex-col max-h-[80vh]">
         <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
           <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Download size={20} className="text-primary" />
              Export Manager
           </h3>
           <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:scale-110 transition-transform">
             <X size={16} className="text-gray-500" />
           </button>
         </div>

         <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-black/20">
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3">Select Chapters</h4>
            
            <div className="flex gap-2 mb-4">
               <button onClick={selectAll} className="text-xs font-bold px-3 py-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition">Select All</button>
               <button onClick={deselectAll} className="text-xs font-bold px-3 py-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition">Deselect All</button>
            </div>

            <div className="space-y-2 mb-8">
               {novel.chapters.map(chapter => (
                 <div 
                   key={chapter.id} 
                   onClick={() => toggleSelect(chapter.id)}
                   className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${selectedChapters.has(chapter.id) ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                 >
                   {selectedChapters.has(chapter.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                   <span className="font-medium text-sm truncate">{chapter.title}</span>
                 </div>
               ))}
               {novel.chapters.length === 0 && <p className="text-sm text-gray-400">No chapters to export yet.</p>}
            </div>

            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-3">Format</h4>
            <div className="flex gap-3">
               {(['docx', 'pdf', 'txt'] as const).map(f => (
                 <button 
                   key={f}
                   onClick={() => setFormat(f)}
                   className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 rounded-xl border transition-all ${format === f ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-500 hover:border-primary/50'}`}
                 >
                   <FileText size={20} />
                   <span className="text-xs font-bold uppercase">{f}</span>
                 </button>
               ))}
            </div>
         </div>

         <div className="p-5 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
            <button 
              onClick={handleCopy}
              disabled={selectedChapters.size === 0}
              className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
            >
               <Copy size={18} /> Copy
            </button>
            <button 
              onClick={handleDownload}
              disabled={selectedChapters.size === 0}
              className="flex-[2] py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition disabled:opacity-50"
            >
               <Download size={18} /> {selectedChapters.size === novel.chapters.length ? "Download All" : `Download (${selectedChapters.size})`}
            </button>
         </div>
      </div>
    </div>
  );
};
