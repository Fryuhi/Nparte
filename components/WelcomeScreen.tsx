import React from 'react';
import { Novel } from '../types';
import { NparteLogo } from './NparteLogo';

export const WelcomeScreen = ({ onLibrary }: { onCreate?: () => void, onLibrary: () => void, novels?: Novel[] }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-16 md:pt-24 px-6 text-center overflow-hidden w-full">
      
      {/* Title */}
      <h1 className="text-[2.5rem] sm:text-[4rem] md:text-[5.5rem] font-bold tracking-tight text-slate-500 dark:text-slate-400 leading-[1.1] mb-0 md:mb-1">
        Novel Anda.
      </h1>
      <h2 className="text-[3rem] sm:text-[4.5rem] md:text-[6.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8">
        Lebih hidup.
      </h2>
      
      {/* Paragraph */}
      <p className="text-base md:text-[1.35rem] text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
        Nparte adalah alternatif alat penulisan novel yang dirancang untuk membuat tulisan Anda lebih cepat, lebih konsisten, dan memukau. Semuanya tetap familiar dan simpel untuk digunakan.
      </p>
      
      {/* Action Button */}
      <button 
        onClick={onLibrary}
        className="px-8 py-4 bg-primary hover:opacity-90 text-white rounded-xl font-bold text-lg transition-all shadow-md mb-20"
      >
        Mulai Nparte
      </button>
      
      {/* Book Mockup (CSS Illustration) */}
      <div 
        className="flex justify-center w-full max-w-4xl mx-auto px-4 opacity-95 pb-0 flex-1 min-h-[400px]"
        style={{ perspective: "1200px" }}
      >
        <div 
          className="w-full max-w-3xl flex relative border-b-0 border-gray-200 dark:border-zinc-800"
          style={{ 
            WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 95%)",
            maskImage: "linear-gradient(to bottom, black 30%, transparent 95%)" 
          }}
        >
           
           {/* Left Page */}
           <div 
             className="w-1/2 h-[800px] bg-white dark:bg-zinc-900 rounded-tl-3xl rounded-r-sm border border-b-0 border-gray-200 dark:border-zinc-800 shadow-2xl origin-right flex flex-col p-6 md:p-10 relative overflow-hidden"
             style={{ transform: "rotateY(-4deg) skewY(2deg)" }}
           >
               {/* Content Placeholder */}
               <div className="w-1/3 h-3 bg-slate-100 dark:bg-zinc-800/80 rounded mb-8"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-5/6 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-4/5 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4 mt-6"></div>
               <div className="w-11/12 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-3/4 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>

               {/* Page curve shadow (Inner spine curve) */}
               <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-black/[0.04] dark:from-black/40 to-transparent pointer-events-none"></div>
           </div>

           {/* Book Spine (Center fold) */}
           <div className="absolute top-0 h-[800px] left-1/2 -translate-x-1/2 w-4 bg-gradient-to-r from-gray-200/40 via-gray-100 to-gray-200/40 dark:from-zinc-800 dark:via-zinc-700/30 dark:to-zinc-800 z-10 shadow-inner rounded-t-full"></div>

           {/* Right Page */}
           <div 
             className="w-1/2 h-[800px] bg-white dark:bg-zinc-900 rounded-tr-3xl rounded-l-sm border border-b-0 border-gray-200 dark:border-zinc-800 shadow-2xl origin-left flex flex-col p-6 md:p-10 relative overflow-hidden"
             style={{ transform: "rotateY(4deg) skewY(-2deg)" }}
           >
               {/* Center Logo */}
               <div className="absolute top-40 left-1/2 -translate-x-1/2 pointer-events-none">
                   <NparteLogo className="w-32 h-32 text-primary opacity-[0.07] dark:opacity-10" />
               </div>
               
               {/* Content Placeholder */}
               <div className="w-1/4 h-3 bg-slate-100 dark:bg-zinc-800/80 rounded mb-8"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-11/12 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-4/5 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>

               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4 mt-6"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-5/6 h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>
               <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800/60 rounded mb-4"></div>

               {/* Page curve shadow (Inner spine curve) */}
               <div className="absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-black/[0.04] dark:from-black/40 to-transparent pointer-events-none"></div>
           </div>

        </div>
      </div>
      
    </div>
  );
};
