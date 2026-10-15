import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const NPARTE_PROJECT_KEY = "AQ.Ab8RN6K4piF0fe3XpWD73Bi9sJfouwPM2V2Sv9J7DggpwJBmqw";
    const activeKey = process.env.GEMINI_API_KEY || process.env.API_KEY || env.GEMINI_API_KEY || env.API_KEY || NPARTE_PROJECT_KEY;
    const activeKey2 = process.env.GEMINI_API_KEY_2 || env.GEMINI_API_KEY_2 || '';
    const activeKey3 = process.env.GEMINI_API_KEY_3 || env.GEMINI_API_KEY_3 || '';
    const activeOpenAIKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'motion', 'lucide-react'],
              export: ['jspdf', 'docx'],
              ai: ['@google/genai']
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(activeKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(activeKey),
        'process.env.GEMINI_API_KEY_2': JSON.stringify(activeKey2),
        'process.env.GEMINI_API_KEY_3': JSON.stringify(activeKey3),
        'process.env.OPENAI_API_KEY': JSON.stringify(activeOpenAIKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
