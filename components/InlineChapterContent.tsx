import React from 'react';
import { NovelIllustration } from '../types';
import { Trash2, Eye, Download, Sparkles } from 'lucide-react';

const parseFormatting = (text: string) => {
  const parts = text.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*|_[\s\S]*?_|~~[\s\S]*?~~)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={i} className="line-through">{part.slice(2, -2)}</del>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

interface InlineChapterContentProps {
  content: string;
  chapterId?: string;
  chapterTitle?: string;
  illustrations?: NovelIllustration[];
  fontFamily: string;
  fontSize: number;
  lineSpacing?: number;
  isStreaming?: boolean;
  onDeleteIllustration: (illustrationId: string, e?: React.MouseEvent) => void;
  onImageClick: (illustration: NovelIllustration) => void;
}

export const InlineChapterContent: React.FC<InlineChapterContentProps> = ({
  content,
  chapterId,
  chapterTitle,
  illustrations = [],
  fontFamily,
  fontSize,
  lineSpacing,
  isStreaming = false,
  onDeleteIllustration,
  onImageClick,
}) => {
  const chapterIllustrations = chapterId 
    ? illustrations.filter((item) => item.chapterId === chapterId)
    : [];

  const textStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: lineSpacing ? `${lineSpacing * 0.4 + 1.2}` : '2',
  };

  if (!chapterIllustrations.length) {
    return (
      <div
        data-chapter-id={chapterId}
        data-chapter-title={chapterTitle}
        className="whitespace-pre-wrap leading-loose text-gray-800 dark:text-gray-200 selection:bg-primary/20 dark:selection:bg-primary/30"
        style={textStyle}
      >
        {parseFormatting(content)}
        {isStreaming && (
          <span 
            className="inline-block w-[3px] h-[1.1em] ml-1 bg-primary align-middle cursor-blink"
          />
        )}
      </div>
    );
  }

  // Calculate insertion positions
  interface Segment {
    illus: NovelIllustration;
    splitIndex: number;
  }

  const segments: Segment[] = [];

  chapterIllustrations.forEach((illus) => {
    let splitIndex = -1;
    const snippet = illus.selectedSnippet?.trim() || '';

    if (snippet) {
      // 1. Exact match
      const exactPos = content.indexOf(snippet);
      if (exactPos !== -1) {
        const afterSnippet = exactPos + snippet.length;
        const nextNewline = content.indexOf('\n', afterSnippet);
        splitIndex = nextNewline !== -1 ? nextNewline + 1 : afterSnippet;
      } else {
        // 2. Partial match (first 30 characters)
        const sub = snippet.slice(0, 30);
        const subPos = content.indexOf(sub);
        if (subPos !== -1) {
          const afterSnippet = subPos + sub.length;
          const nextNewline = content.indexOf('\n', afterSnippet);
          splitIndex = nextNewline !== -1 ? nextNewline + 1 : afterSnippet;
        }
      }
    }

    if (splitIndex === -1) {
      // Fallback: put at the end
      splitIndex = content.length;
    }

    segments.push({ illus, splitIndex });
  });

  // Sort segments by splitIndex ascending
  segments.sort((a, b) => a.splitIndex - b.splitIndex);

  const renderedElements: React.ReactNode[] = [];
  let currentPos = 0;

  segments.forEach(({ illus, splitIndex }, idx) => {
    // Text before this illustration
    if (splitIndex > currentPos) {
      const textChunk = content.slice(currentPos, splitIndex);
      if (textChunk) {
        renderedElements.push(
          <span key={`text-before-${illus.id}-${idx}`} className="whitespace-pre-wrap">
            {parseFormatting(textChunk)}
          </span>
        );
      }
      currentPos = splitIndex;
    }

    // Inline illustration directly under the text without prompt caption
    renderedElements.push(
      <div
        key={`inline-illus-${illus.id}`}
        className="my-8 max-w-2xl mx-auto rounded-2xl overflow-hidden bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all select-none group not-prose relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden cursor-pointer flex items-center justify-center min-h-[220px]"
          onClick={() => onImageClick(illus)}
        >
          <img
            src={illus.imageUrl}
            alt="Ilustrasi Adegan"
            className="w-full h-auto max-h-[560px] object-contain group-hover:scale-[1.01] transition-transform duration-300"
            referrerPolicy="no-referrer"
          />

          {/* Badge */}
          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/90 flex items-center gap-1.5 border border-white/10 shadow-sm pointer-events-none">
            <Sparkles size={11} className="text-purple-400" /> Ilustrasi Adegan
          </div>

          {/* Quick Floating Action Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xl transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(illus);
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Perbesar Tampilan"
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const a = document.createElement('a');
                a.href = illus.imageUrl;
                a.download = `illustration_${illus.id}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Unduh Gambar"
            >
              <Download size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteIllustration(illus.id, e);
              }}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/60 rounded-lg transition-colors"
              title="Hapus Ilustrasi"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  });

  // Remaining text
  if (currentPos < content.length) {
    const remainingText = content.slice(currentPos);
    if (remainingText) {
      renderedElements.push(
        <span key={`text-end-${currentPos}`} className="whitespace-pre-wrap">
            {parseFormatting(remainingText)}
        </span>
      );
    }
  }

  return (
    <div
      data-chapter-id={chapterId}
      data-chapter-title={chapterTitle}
      className="leading-loose text-gray-800 dark:text-gray-200 selection:bg-primary/20 dark:selection:bg-primary/30"
      style={textStyle}
    >
      {renderedElements}
      {isStreaming && (
        <span 
          className="inline-block w-[3px] h-[1.1em] ml-1 bg-primary align-middle cursor-blink"
        />
      )}
    </div>
  );
};
