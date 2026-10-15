import { GenerationDebugInfo } from '../types';

// Simple event emitter for streaming content to avoid global re-renders
type Subscriber = () => void;

interface GenerationState {
  isGenerating: boolean;
  novelId: string | null;
  chapterId: string | null;
  prompt: string;
  content: string;
  status: string;
  abortController: AbortController | null;
  isGeneratingLore?: boolean;
  debugInfo?: GenerationDebugInfo | null;
}

class GenerationStore {
  private state: GenerationState = {
    isGenerating: false,
    novelId: null,
    chapterId: null,
    prompt: '',
    content: '',
    status: '',
    abortController: null,
    isGeneratingLore: false,
    debugInfo: null,
  };
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    window.addEventListener('beforeunload', (e) => {
      if (this.state.isGenerating || this.state.isGeneratingLore) {
        e.preventDefault();
        e.returnValue = 'Proses pembuatan (generation) sedang berjalan. Apakah Anda yakin ingin memuat ulang halaman?';
        return e.returnValue;
      }
    });
  }

  getState() {
    return this.state;
  }

  setState(updates: Partial<GenerationState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }
}

export const generationStore = new GenerationStore();
