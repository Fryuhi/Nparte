import React from 'react';
import { Home, Book, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingNavProps {
  activeTab: 'home' | 'library' | 'settings';
  onChange: (tab: 'home' | 'library' | 'settings') => void;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'library' as const, label: 'Library', icon: Book },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-3.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] pointer-events-auto">
      <nav 
        aria-label="Bottom Navigation"
        className="floating-dock flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full border border-black/5 dark:border-white/10"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-semibold tracking-tight transition-colors duration-200 outline-none select-none ${
                isActive
                  ? 'text-white dark:text-slate-950'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeFloatingPill"
                  className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <Icon size={16} strokeWidth={isActive ? 2.4 : 1.9} />
                <span className={`transition-opacity duration-150 text-[11px] sm:text-xs ${isActive ? 'inline-block' : 'hidden sm:inline-block opacity-75'}`}>
                  {tab.label}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

