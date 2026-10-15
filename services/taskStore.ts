import { useState, useEffect } from 'react';
import { getNovels, saveNovel } from './storage';
import { generateNovelImage, extractCoverPrompt, extractIllustrationPrompt } from './aiService';
import { NovelIllustration, AVAILABLE_MODELS } from '../types';

type Listener = () => void;

export interface Task {
  id: string;
  type: 'cover' | 'illustration';
  novelId: string;
  chapterId?: string;
  status: 'generating' | 'completed' | 'failed';
  loadingText: string;
  resultImageUrl?: string;
  illustrationData?: NovelIllustration;
  error?: string;
}

class TaskStore {
  private tasks: Record<string, Task> = {};
  private listeners: Set<Listener> = new Set();

  constructor() {
    window.addEventListener('beforeunload', (e) => {
      const isRunning = Object.values(this.tasks).some(t => t.status === 'generating');
      if (isRunning) {
        e.preventDefault();
        e.returnValue = 'Tugas pembuatan (generation) sedang berjalan di latar belakang. Apakah Anda yakin ingin memuat ulang halaman?';
        return e.returnValue;
      }
    });
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getTasks() {
    return Object.values(this.tasks);
  }

  getTask(id: string) {
    return this.tasks[id];
  }

  private startTask(task: Omit<Task, 'status' | 'loadingText' | 'error'> & { loadingText?: string }) {
    this.tasks[task.id] = {
      ...task,
      status: 'generating',
      loadingText: task.loadingText || 'Generating...',
      error: undefined,
    };
    this.notify();
  }

  private updateTask(id: string, updates: Partial<Task>) {
    if (this.tasks[id]) {
      this.tasks[id] = { ...this.tasks[id], ...updates };
      this.notify();
    }
  }

  private completeTask(id: string) {
    if (this.tasks[id]) {
      this.tasks[id].status = 'completed';
      this.tasks[id].loadingText = 'Completed';
      this.notify();
    }
    
    // Auto clear completed tasks after 5 seconds
    setTimeout(() => {
        this.clearTask(id);
    }, 5000);
  }

  private failTask(id: string, error: string) {
    if (this.tasks[id]) {
      this.tasks[id].status = 'failed';
      this.tasks[id].error = error;
      this.notify();
    }
  }
  
  clearTask(id: string) {
    if (this.tasks[id]) {
      delete this.tasks[id];
      this.notify();
    }
  }

  async runCoverGeneration(
    novelId: string, 
    title: string, 
    synopsis: string, 
    loreDatabase: any,
    modelName: 'gemini-3.1-flash-lite-image' | 'gemini-3.1-flash-image' ,
    artStyle: 'real-tion' | 'nime-tion' = 'real-tion',
    geminiAnalysisModel: string = 'gemini-3.5-flash-lite'
  ) {
    const taskId = `${novelId}_cover`;
    if (this.tasks[taskId]?.status === 'generating') return; // Already running

    const modelDisplayName = AVAILABLE_MODELS.find(m => m.id === geminiAnalysisModel)?.name || geminiAnalysisModel;

    this.startTask({
      id: taskId,
      type: 'cover',
      novelId,
      loadingText: `Menganalisis Lore Lock (${modelDisplayName})...`,
    });

    try {
      const optimizedPrompt = await extractCoverPrompt(
        title, 
        synopsis || '', 
        loreDatabase,
        artStyle,
        geminiAnalysisModel
      );
      
      this.updateTask(taskId, { loadingText: 'Menggambar cover...' });
      
      const fullPrompt = `Full color, high quality anime novel cover illustration, masterpiece. ${optimizedPrompt}`;
      const base64Image = await generateNovelImage(fullPrompt, modelName, '3:4');
      
      // Fetch latest novel again to avoid race conditions
      const novelsUpdated = await getNovels();
      const targetNovelUpdated = novelsUpdated.find(n => n.id === novelId);
      if (targetNovelUpdated) {
          targetNovelUpdated.coverImage = base64Image;
          targetNovelUpdated.updatedAt = Date.now();
          await saveNovel(targetNovelUpdated);
          
          // Dispatch event so App.tsx can reload the state
          window.dispatchEvent(new CustomEvent('novelUpdated', { detail: { novelId } }));
      }
      
      this.completeTask(taskId);
    } catch (error: any) {
      console.error("Cover generation failed:", error);
      this.failTask(taskId, error.message || 'Gagal menghasilkan cover');
    }
  }

  async runIllustrationGeneration(
    novelId: string,
    chapterId: string,
    selectedSnippet: string,
    novelTitle: string,
    chapterTitle: string,
    loreDatabase: any,
    modelName: 'gemini-3.1-flash-lite-image' | 'gemini-3.1-flash-image'  = 'gemini-3.1-flash-lite-image',
    aspectRatio: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' = '3:4',
    customPromptOverride?: string,
    charactersOverride?: { name: string; appearance: string }[],
    geminiAnalysisModel: string = 'gemini-3.5-flash-lite'
  ): Promise<NovelIllustration> {
    const taskId = `${novelId}_illustration_${Date.now()}`;
    const modelDisplayName = AVAILABLE_MODELS.find(m => m.id === geminiAnalysisModel)?.name || geminiAnalysisModel;

    this.startTask({
      id: taskId,
      type: 'illustration',
      novelId,
      chapterId,
      loadingText: `Menganalisis teks & Lore Lock (${modelDisplayName})...`,
    });

    try {
      let promptToUse = customPromptOverride;
      let chars = charactersOverride || [];

      if (!promptToUse) {
        const analysis = await extractIllustrationPrompt(
          selectedSnippet,
          novelTitle,
          chapterTitle,
          loreDatabase,
          aspectRatio,
          geminiAnalysisModel
        );
        promptToUse = analysis.visualPrompt;
        chars = analysis.identifiedCharacters;
      }

      this.updateTask(taskId, { loadingText: 'Menggambar ilustrasi dengan Nano Banana 2 Lite...' });

      const finalFullPrompt = `Masterpiece Japanese light novel illustration, painterly textured anime visual art, volumetric lighting, high dynamic range. ${promptToUse}`;
      const base64Image = await generateNovelImage(finalFullPrompt, modelName, aspectRatio);

      const illustration: NovelIllustration = {
        id: `illus_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        novelId,
        chapterId,
        chapterTitle,
        selectedSnippet,
        prompt: promptToUse,
        imageUrl: base64Image,
        aspectRatio,
        modelName,
        identifiedCharacters: chars,
        createdAt: Date.now(),
      };

      // Save to novel and chapter
      const novelsUpdated = await getNovels();
      const targetNovelUpdated = novelsUpdated.find(n => n.id === novelId);
      if (targetNovelUpdated) {
        if (!targetNovelUpdated.illustrations) {
          targetNovelUpdated.illustrations = [];
        }
        targetNovelUpdated.illustrations.unshift(illustration);

        // Also associate with chapter if found
        if (chapterId) {
          const chap = targetNovelUpdated.chapters.find(c => c.id === chapterId);
          if (chap) {
            if (!chap.illustrations) chap.illustrations = [];
            chap.illustrations.unshift(illustration);
          }
        }

        targetNovelUpdated.updatedAt = Date.now();
        await saveNovel(targetNovelUpdated);

        window.dispatchEvent(new CustomEvent('novelUpdated', { detail: { novelId, illustrationId: illustration.id } }));
      }

      this.updateTask(taskId, {
        resultImageUrl: base64Image,
        illustrationData: illustration
      });
      this.completeTask(taskId);

      return illustration;
    } catch (error: any) {
      console.error("Illustration generation failed:", error);
      this.failTask(taskId, error.message || 'Gagal menghasilkan ilustrasi.');
      throw error;
    }
  }
}

export const globalTaskStore = new TaskStore();

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(globalTaskStore.getTasks());

  useEffect(() => {
    const unsubscribe = globalTaskStore.subscribe(() => {
      setTasks(globalTaskStore.getTasks());
    });
    return unsubscribe;
  }, []);

  return tasks;
}

export function useTask(id: string) {
  const [task, setTask] = useState<Task | undefined>(globalTaskStore.getTask(id));

  useEffect(() => {
    const unsubscribe = globalTaskStore.subscribe(() => {
      setTask(globalTaskStore.getTask(id));
    });
    return unsubscribe;
  }, [id]);

  return task;
}

