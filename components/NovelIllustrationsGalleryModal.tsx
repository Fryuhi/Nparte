import React, { useState } from 'react';
import { Novel, NovelIllustration } from '../types';
import { 
  X, Image as ImageIcon, Download, Trash2, Crown, 
  Eye, Copy
} from 'lucide-react';

interface NovelIllustrationsGalleryModalProps {
  novel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  onOpenIllustrationMaker: (snippet?: string, chapterId?: string) => void;
  onClose: () => void;
}

export const NovelIllustrationsGalleryModal: React.FC<NovelIllustrationsGalleryModalProps> = ({
  novel,
  onUpdateNovel,
  onOpenIllustrationMaker,
  onClose,
}) => {
  const [selectedIllustration, setSelectedIllustration] = useState<NovelIllustration | null>(null);
  const [filterChapterId, setFilterChapterId] = useState<string>('all');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [coverSuccessMessage, setCoverSuccessMessage] = useState(false);

  const allIllustrations: NovelIllustration[] = novel.illustrations || [];

  const filteredIllustrations = filterChapterId === 'all'
    ? allIllustrations
    : allIllustrations.filter(item => item.chapterId === filterChapterId);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    const updated = allIllustrations.filter(item => item.id !== id);
    
    // Also remove from chapters if present
    const updatedChapters = novel.chapters.map(chap => {
      if (chap.illustrations) {
        return { ...chap, illustrations: chap.illustrations.filter(i => i.id !== id) };
      }
      return chap;
    });

    onUpdateNovel({
      ...novel,
      illustrations: updated,
      chapters: updatedChapters,
      updatedAt: Date.now(),
    });

    if (selectedIllustration?.id === id) {
      setSelectedIllustration(null);
    }
    setDeleteTargetId(null);
  };

  const handleSetCover = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNovel({
      ...novel,
      coverImage: imageUrl,
      updatedAt: Date.now(),
    });
    setCoverSuccessMessage(true);
    setTimeout(() => setCoverSuccessMessage(false), 2500);
  };

  const handleDownload = (illustration: NovelIllustration, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = illustration.imageUrl;
    a.download = `illustration_${novel.title.replace(/\s+/g, '_')}_${illustration.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPrompt = (illustration: NovelIllustration, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(illustration.prompt);
    setCopiedPromptId(illustration.id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm anim-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#141416] w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden anim-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Galeri Ilustrasi Novel
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-md border border-gray-200 dark:border-zinc-700">
                  {allIllustrations.length} gambar
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Koleksi artwork visual per bab & adegan cerita
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenIllustrationMaker()}
              className="px-3 py-1.5 bg-primary hover:opacity-90 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ImageIcon size={14} /> Buat Baru
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {novel.chapters.length > 0 && (
          <div className="px-6 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-gray-400 shrink-0 font-medium">Filter Bab:</span>
            <button
              onClick={() => setFilterChapterId('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filterChapterId === 'all'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700'
              }`}
            >
              Semua ({allIllustrations.length})
            </button>
            {novel.chapters.map((chap, idx) => {
              const count = allIllustrations.filter(i => i.chapterId === chap.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={chap.id}
                  onClick={() => setFilterChapterId(chap.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    filterChapterId === chap.id
                      ? 'bg-primary text-white font-bold'
                      : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700'
                  }`}
                >
                  Bab {idx + 1} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Gallery Grid or Empty State */}
        <div className="p-6 overflow-y-auto flex-1">
          {filteredIllustrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-3">
                <ImageIcon size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
                Belum Ada Ilustrasi
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mb-5">
                Blok kalimat di naskah novel atau klik tombol di bawah untuk membuat ilustrasi visual adegan.
              </p>
              <button
                onClick={() => onOpenIllustrationMaker()}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                <ImageIcon size={14} /> Buka Ilustrasi Maker
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredIllustrations.map((illustration) => (
                <div
                  key={illustration.id}
                  onClick={() => setSelectedIllustration(illustration)}
                  className="group relative bg-gray-50 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-lg flex flex-col"
                >
                  <div className="aspect-[3/4] w-full relative overflow-hidden bg-zinc-950">
                    <img
                      src={illustration.imageUrl}
                      alt="Novel Illustration"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 text-white">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold flex items-center gap-1">
                          <Eye size={12} /> Perbesar
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDownload(illustration, e)}
                            className="p-1 hover:bg-white/20 rounded-lg"
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={(e) => handleSetCover(illustration.imageUrl, e)}
                            className="p-1 hover:bg-white/20 rounded-lg text-amber-300"
                            title="Set as Cover"
                          >
                            <Crown size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 flex-1 flex flex-col justify-between text-xs">
                    <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2 text-[11px] mb-1">
                      "{illustration.selectedSnippet}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100 dark:border-zinc-800">
                      <span>{illustration.chapterTitle || 'Novel Scene'}</span>
                      <button
                        onClick={(e) => handleDelete(illustration.id, e)}
                        className="text-red-400 hover:text-red-600 p-0.5 rounded"
                        title="Hapus"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox / Detail View Modal */}
        {selectedIllustration && (
          <div 
            className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 anim-fade-in"
            onClick={() => setSelectedIllustration(null)}
          >
            <div 
              className="bg-white dark:bg-zinc-900 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl border border-zinc-700/50 flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {selectedIllustration.chapterTitle || 'Ilustrasi Adegan'}
                </span>
                <button 
                  onClick={() => setSelectedIllustration(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <div className="max-h-[50vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={selectedIllustration.imageUrl}
                    alt="Novel Scene Large"
                    className="max-h-[50vh] w-auto object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">
                    Teks Adegan Terpilih:
                  </span>
                  <p className="text-gray-800 dark:text-gray-200 italic leading-relaxed">
                    "{selectedIllustration.selectedSnippet}"
                  </p>
                </div>

                {selectedIllustration.identifiedCharacters && selectedIllustration.identifiedCharacters.length > 0 && (
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-primary dark:text-primary text-[11px]">
                      Karakter Lore Lock Teridentifikasi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIllustration.identifiedCharacters.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 theme-light-bg dark:bg-primary-light-bg text-primary dark:text-primary rounded-md border border-primary/30 dark:border-primary/30 text-[11px]">
                          {c.name}: {c.appearance}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => handleCopyPrompt(selectedIllustration, e)}
                  className="px-3 py-2 text-xs font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl flex items-center gap-1.5 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Copy size={13} /> {copiedPromptId === selectedIllustration.id ? 'Prompt Tersalin!' : 'Salin Prompt'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleSetCover(selectedIllustration.imageUrl, e)}
                    className="px-3.5 py-2 text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Crown size={13} /> Pasang sbg Cover
                  </button>
                  <button
                    onClick={(e) => handleDownload(selectedIllustration, e)}
                    className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all"
                  >
                    <Download size={13} /> Unduh HD
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTargetId && (
          <div 
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs anim-fade-in"
            onClick={() => setDeleteTargetId(null)}
          >
            <div 
              className="bg-white dark:bg-[#18181b] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 anim-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 mx-auto">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                Hapus Ilustrasi Ini?
              </h3>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                Artwork ini akan dihapus permanen dari galeri novel dan bab terkait.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cover Success Toast */}
        {coverSuccessMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 anim-slide-up">
            <Crown size={15} /> Cover novel berhasil diperbarui!
          </div>
        )}
      </div>
    </div>
  );
};
