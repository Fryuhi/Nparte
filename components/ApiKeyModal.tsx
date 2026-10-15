import React, { useState } from 'react';
import { Key, Sparkles, AlertCircle } from 'lucide-react';

export const ApiKeyModal = ({ onSave }: { onSave: (key: string) => void }) => {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("API Key cannot be empty.");
      return;
    }
    onSave(apiKey.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full anim-pop relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 theme-accent-gradient"></div>
        
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-primary mx-auto theme-light-bg">
          <Key size={28} />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Enter Gemini API Key
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
          The application requires a Gemini API Key to generate novel chapters. The key will be stored securely in your browser and is only used to make requests directly to Google Gemini.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <input 
               type="password"
               value={apiKey}
               onChange={(e) => {
                 setApiKey(e.target.value);
                 setError("");
               }}
               placeholder="AIzaSy..."
               className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 focus:border-primary dark:focus:border-primary outline-none transition-colors text-gray-900 dark:text-gray-100 font-mono text-sm"
               autoFocus
             />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="pt-2">
             <button 
               type="submit"
               className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
             >
               <Sparkles size={18} />
               Start Writing
             </button>
          </div>
          
          <div className="text-center mt-4">
             <a 
               href="https://aistudio.google.com/app/apikey" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-xs text-primary hover:underline"
             >
               Get a Gemini API Key for free at Google AI Studio &rarr;
             </a>
          </div>
        </form>
      </div>
    </div>
  );
};
