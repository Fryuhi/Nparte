import React, { useState } from "react";
import { Novel, GlobalConfig, Folder as FolderType } from "../types";
import {
  CheckSquare,
  X,
  Check,
  CheckCircle,
  BookOpen,
  Download,
  Folder,
  Search,
  Grid,
  List as ListIcon,
  FolderPlus,
  FolderOpen,
  ArrowLeft,
  MoveRight, Plus,
  Loader2,
  Book,
  Edit3,
  LayoutGrid,
} from "lucide-react";

export const LibraryScreen = ({
  novels,
  onCreate,
  onSelect,
  onDeleteMode,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  activeGeneration,
  onExport,
  config,
  onUpdateConfig,
  onUpdateNovel,
  setSelectedNovelIds,
  setIsSelectionMode,
}: {
  novels: Novel[];
  onCreate?: () => void;
  onSelect: (id: string) => void;
  onDeleteMode: () => void;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e: any) => void;
  activeGeneration?: { isGenerating: boolean; novelId: string | null };
  onExport: (novel: Novel) => void;
  config: GlobalConfig;
  onUpdateConfig: (c: GlobalConfig) => void;
  onUpdateNovel: (n: Novel) => void;
  setSelectedNovelIds: (ids: Set<string>) => void;
  setIsSelectionMode: (v: boolean) => void;
}) => {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const viewMode = config.libraryViewMode || "grid";

  const setViewMode = (mode: "grid" | "list" | "grid-2x2") => {
    onUpdateConfig({ ...config, libraryViewMode: mode });
  };

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [showMoveModal, setShowMoveModal] = useState(false);

  const [editingNovelId, setEditingNovelId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const folders = config.folders || [];

  const displayedNovels = novels.filter((n) => {
    if (activeFolderId && n.folderId !== activeFolderId) return false;
    if (!activeFolderId && n.folderId) return false;
    if (
      searchQuery &&
      !n.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const displayedFolders = !activeFolderId && !searchQuery ? folders : [];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: FolderType = {
      id: crypto.randomUUID(),
      name: newFolderName,
      createdAt: Date.now(),
    };
    onUpdateConfig({ ...config, folders: [...folders, newFolder] });
    setNewFolderName("");
    setShowNewFolderModal(false);
  };

  const handleMoveToFolder = (targetFolderId: string | null) => {
    const selected = Array.from(selectedIds);
    selected.forEach((id) => {
      const novel = novels.find((n) => n.id === id);
      if (novel) {
        onUpdateNovel({ ...novel, folderId: targetFolderId || undefined });
      }
    });
    setSelectedNovelIds(new Set());
    setIsSelectionMode(false);
    setShowMoveModal(false);
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto anim-slide-up pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                {activeFolderId && (
                  <button
                    onClick={() => setActiveFolderId(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg mr-1 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                {activeFolderId
                  ? folders.find((f) => f.id === activeFolderId)?.name
                  : "Library"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {activeFolderId
                  ? `${displayedNovels.length} novels`
                  : `Collection of ${novels.length} works`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onCreate && (
                <button
                  onClick={onCreate}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md flex items-center gap-2 theme-glow-light mr-1"
                  title="Create New Novel"
                >
                  <Plus size={18} /> <span className="hidden sm:inline">New Novel</span>
                </button>
              )}
              <button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "grid-2x2" : viewMode === "grid-2x2" ? "list" : "grid")
                }
                className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 rounded-xl transition-all"
                title="Change View Mode"
              >
                {viewMode === "grid" ? (
                  <LayoutGrid size={18} />
                ) : viewMode === "grid-2x2" ? (
                  <ListIcon size={18} />
                ) : (
                  <Grid size={18} />
                )}
              </button>
              <button
                onClick={onDeleteMode}
                className={`p-2.5 rounded-xl transition-all duration-300 ${isSelectionMode ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-500/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"}`}
                title="Select Multiple"
              >
                {isSelectionMode ? <X size={18} /> : <CheckSquare size={18} />}
              </button>
              {!activeFolderId && (
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 rounded-xl transition-all"
                  title="New Folder"
                >
                  <FolderPlus size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search novel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>

        {isSelectionMode &&
          selectedIds.size > 0 &&
          !folders.some((f) => selectedIds.has(f.id)) && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowMoveModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 hover:scale-[1.01] transition-all theme-glow-light"
              >
                <MoveRight size={16} /> Move to Folder
              </button>
            </div>
          )}

        {displayedNovels.length === 0 && displayedFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-gray-50/50 dark:bg-zinc-900/50">
            <Book size={48} className="mb-4 opacity-20" />
            <p className="mb-6">
              {searchQuery
                ? "No results found for search."
                : "No novels here yet."}
            </p>
            {!searchQuery && onCreate && (
              <button
                onClick={onCreate}
                className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2 theme-glow-light"
              >
                <Plus size={20} /> Buat Novel Pertama Anda
              </button>
            )}
          </div>
        ) : (
          <div
            className={`${viewMode === "grid" ? "grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : viewMode === "grid-2x2" ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : "flex flex-col"} gap-3 md:gap-5`}
          >
            {/* Tambahkan Novel Button */}
            {!activeFolderId && !searchQuery && onCreate && (
              <div
                onClick={() => !isSelectionMode && onCreate()}
                className={`group cursor-pointer transition-all border border-dashed flex items-center relative ${viewMode === "list" ? "bg-white dark:bg-zinc-900 rounded-3xl p-5 gap-4 w-full" : "bg-white dark:bg-zinc-900 rounded-2xl flex-col justify-center text-center h-full min-h-[240px] p-4"} shadow-sm shadow-black/5 dark:shadow-black/10 hover:shadow-lg border-gray-300 dark:border-zinc-700 hover:border-primary dark:hover:border-primary`}
              >
                <div
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary flex items-center justify-center transition-transform text-white shadow-md ${viewMode !== "list" ? "mb-3" : ""} group-hover:scale-110`}
                >
                  <Plus size={viewMode === "list" ? 24 : 32} />
                </div>
                <div className={`${viewMode === "list" ? "flex-1 text-left" : "w-full"}`}>
                  <h3 className="font-bold text-[14px] md:text-base text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                    Tambahkan Novel
                  </h3>
                  <p className="text-[11px] md:text-xs text-gray-500 mt-1">
                    Buat novel atau proyek baru
                  </p>
                </div>
              </div>
            )}

            {displayedFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={(e) => {
                  if (isSelectionMode) onToggleSelect(folder.id, e);
                  else setActiveFolderId(folder.id);
                }}
                className={`group cursor-pointer transition-all border flex items-center relative ${viewMode === "list" ? "bg-gray-50 dark:bg-zinc-800/80 rounded-3xl p-5 gap-4 w-full" : "bg-gray-50 dark:bg-zinc-800/80 rounded-2xl flex-col justify-center text-center h-full min-h-[240px] p-4"} ${selectedIds.has(folder.id) ? "ring-2 ring-primary border-primary theme-light-bg scale-[0.98]" : "shadow-sm shadow-black/5 dark:shadow-black/10 hover:shadow-lg border-gray-200 dark:border-zinc-700"}`}
              >
                <div
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl theme-light-bg text-primary flex items-center justify-center transition-transform ${viewMode !== "list" ? "mb-3" : ""} ${!isSelectionMode ? "group-hover:scale-110" : ""}`}
                >
                  <FolderOpen size={viewMode !== "list" ? 28 : 24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-2">
                    {folder.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                    {novels.filter((n) => n.folderId === folder.id).length}{" "}
                    Novels
                  </p>
                </div>

                {isSelectionMode ? (
                  <div
                    className={`absolute ${viewMode === "list" ? "right-4 top-1/2 -translate-y-1/2" : "top-3 right-3"} w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIds.has(folder.id) ? "bg-primary border-primary" : "border-gray-300 dark:border-zinc-600"}`}
                  >
                    {selectedIds.has(folder.id) && (
                      <Check size={14} strokeWidth={3} className="text-white" />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMode();
                      onToggleSelect(folder.id, e);
                    }}
                    className={`absolute opacity-0 group-hover:opacity-100 ${viewMode === "list" ? "right-4 top-1/2 -translate-y-1/2" : "top-3 right-3"} p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg hover:text-primary transition-all shadow-sm`}
                  >
                    <CheckSquare size={16} />
                  </button>
                )}
              </div>
            ))}

            {displayedNovels.map((novel) => {
              const wordCount = novel.chapters.reduce(
                (sum, c) => sum + (c.content.match(/\S+/g)?.length || 0),
                0,
              );
              const synopsis =
                novel.description || novel.loreDatabase?.fullLoreSummary || "";
              return (
                <div
                  key={novel.id}
                  onClick={(e) => {
                    if (isSelectionMode) onToggleSelect(novel.id, e);
                    else onSelect(novel.id);
                  }}
                  className={`
                  group relative cursor-pointer transition-all duration-300 overflow-hidden
                  ${
                    viewMode === "list"
                      ? `bg-white dark:bg-zinc-900 p-5 rounded-3xl flex items-center gap-5 justify-between w-full
                       ${selectedIds.has(novel.id) ? "ring-2 ring-primary theme-light-bg" : "hover:shadow-xl hover:-translate-y-0.5 hover:shadow-gray-200/50 dark:hover:shadow-black/30 shadow-md shadow-black/5 dark:shadow-black/10 border border-gray-100 dark:border-zinc-800"}`
                      : `bg-white dark:bg-zinc-900 rounded-2xl flex flex-col h-full
                       ${selectedIds.has(novel.id) ? "ring-2 ring-primary theme-light-bg scale-[0.98]" : "hover:shadow-xl hover:shadow-gray-300/50 dark:hover:shadow-black/50 hover:-translate-y-1 shadow-md shadow-black/5 dark:shadow-black/10 border border-gray-100 dark:border-zinc-800"}`
                  }
                `}
                >
                  {viewMode === "list" ? (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center flex-1 gap-4 min-w-0 z-10 relative">
                        {novel.coverImage ? (
                          <div className="w-14 h-14 rounded-2xl shrink-0 group-hover:scale-105 transition-transform overflow-hidden shadow-sm">
                            <img src={novel.coverImage} className="w-full h-full object-cover opacity-100" referrerPolicy="no-referrer" alt={novel.title} />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl text-white flex shrink-0 items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform theme-accent-gradient shadow-lg">
                            {novel.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5 animate-fadeIn">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors leading-tight">
                              {novel.title}
                            </h3>
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                                {novel.chapters.length} Chapters
                              </span>
                              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full">
                                {wordCount > 999
                                  ? (wordCount / 1000).toFixed(1) + "k"
                                  : wordCount}{" "}
                                Words
                              </span>
                            </div>
                          </div>

                          {synopsis ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic pr-4 leading-relaxed">
                              "
                              {synopsis.length > 220
                                ? `${synopsis.slice(0, 220).trim()}...`
                                : synopsis}
                              "
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                              {novel.chapters.length > 0
                                ? `Next: ${novel.chapters[novel.chapters.length - 1].title}`
                                : "No description or lore documentation yet."}
                            </p>
                          )}

                          <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-2">
                            <span>
                              Updated{" "}
                              {new Date(novel.updatedAt).toLocaleDateString(
                                undefined,
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                            {activeGeneration?.isGenerating &&
                              activeGeneration.novelId === novel.id && (
                                <span className="text-primary font-bold flex items-center gap-1 animate-pulse">
                                  <Loader2 size={10} className="animate-spin" />{" "}
                                  Writing...
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                      {isSelectionMode ? (
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex shrink-0 items-center justify-center transition-colors z-10 relative ${selectedIds.has(novel.id) ? "bg-primary border-primary" : "border-gray-300 dark:border-zinc-600"}`}
                        >
                          {selectedIds.has(novel.id) && (
                            <CheckCircle size={14} className="text-white" />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0 z-10 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNovelId(novel.id);
                              setEditTitle(novel.title);
                            }}
                            className="p-2.5 bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700/80 rounded-xl text-gray-400 hover:text-primary transition-all border border-gray-100 dark:border-zinc-800/50 shadow-sm"
                            title="Edit Details"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExport(novel);
                            }}
                            className="p-2.5 bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 dark:hover:bg-zinc-700/80 rounded-xl text-gray-400 hover:text-primary transition-all border border-gray-100 dark:border-zinc-800/50 shadow-sm"
                            title="Export Novel"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col h-full w-full relative">
                      {novel.coverImage ? (
                        <div className="w-full aspect-[2/3] relative overflow-hidden shrink-0">
                          <img 
                            src={novel.coverImage} 
                            className="w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-500" 
                            referrerPolicy="no-referrer" 
                            alt={novel.title} 
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-[2/3] flex items-center justify-center shrink-0 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-800/50">
                          <div className="w-16 h-16 rounded-[1.25rem] text-white flex shrink-0 items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform theme-accent-gradient shadow-md">
                            {novel.title.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}

                      {/* Text content under the cover illustration */}
                      <div className="flex-1 p-3 flex flex-col justify-between min-h-0 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800/60">
                        <div className="space-y-1">
                          <h3 className="font-bold text-[12px] md:text-[13px] line-clamp-2 leading-tight text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                            {novel.title}
                          </h3>
                          {activeGeneration?.isGenerating &&
                            activeGeneration.novelId === novel.id && (
                              <div className="text-[9px] font-bold text-primary flex items-center gap-1 animate-pulse">
                                <Loader2 size={8} className="animate-spin" /> Writing...
                              </div>
                            )}
                        </div>
                        <div className="w-full flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-zinc-800/80">
                            <BookOpen size={10} />
                            {novel.chapters.length} Chapters
                          </span>
                        </div>
                      </div>

                      {/* Floating action buttons */}
                      <div className="absolute top-2 right-2 z-20">
                        {isSelectionMode ? (
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${selectedIds.has(novel.id) ? "bg-primary border-primary" : "border-gray-300 dark:border-zinc-600 bg-white/50 dark:bg-black/50 backdrop-blur-sm"}`}
                          >
                            {selectedIds.has(novel.id) && (
                              <CheckCircle size={14} className="text-white" />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNovelId(novel.id);
                                setEditTitle(novel.title);
                              }}
                              className="p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full text-gray-500 hover:text-primary transition-colors shadow-sm"
                              title="Edit Details"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExport(novel);
                              }}
                              className="p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full text-gray-500 hover:text-primary transition-colors shadow-sm"
                              title="Export Novel"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-fade">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-zinc-800 anim-pop">
            <h3 className="font-bold text-lg mb-2 text-primary flex items-center gap-2">
              <FolderPlus size={20} /> New Folder
            </h3>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent my-6 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              placeholder="Folder name..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg theme-glow-light"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm anim-fade">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-zinc-800 anim-pop">
            <h3 className="font-bold text-lg mb-4 text-primary flex items-center gap-2">
              <MoveRight size={20} /> Move to Folder
            </h3>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => handleMoveToFolder(null)}
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors text-sm font-bold"
              >
                [Main Library]
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleMoveToFolder(f.id)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-slate-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium flex items-center gap-3"
                >
                  <Folder size={16} className="text-gray-400" /> {f.name}
                </button>
              ))}
              {folders.length === 0 && (
                <p className="text-xs text-center text-gray-400 py-2">
                  No folders created yet.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-5 py-2.5 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Novel Modal */}
      {editingNovelId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1a1a1c] w-full max-w-md rounded-[2rem] p-8 shadow-2xl anim-scale-in">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
              Edit Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Novel Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#252528] border border-gray-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Enter novel title..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditingNovelId(null)}
                className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const n = novels.find((n) => n.id === editingNovelId);
                  if (n && editTitle.trim()) {
                    onUpdateNovel({
                      ...n,
                      title: editTitle.trim(),
                    });
                  }
                  setEditingNovelId(null);
                }}
                disabled={!editTitle.trim()}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
