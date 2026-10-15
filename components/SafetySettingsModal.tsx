import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { SafetySettingsConfig, SafetyThreshold, DEFAULT_SAFETY_SETTINGS } from '../types';

interface SafetySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  safetySettings?: SafetySettingsConfig;
  onUpdate: (newSettings: SafetySettingsConfig) => void;
}

const THRESHOLD_STEPS: { value: SafetyThreshold; label: string }[] = [
  { value: 'OFF', label: 'Off' },
  { value: 'BLOCK_ONLY_HIGH', label: 'Block few' },
  { value: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Block some' },
  { value: 'BLOCK_LOW_AND_ABOVE', label: 'Block most' },
];

export const SafetySettingsModal: React.FC<SafetySettingsModalProps> = ({
  isOpen,
  onClose,
  safetySettings = DEFAULT_SAFETY_SETTINGS,
  onUpdate,
}) => {
  if (!isOpen) return null;

  const currentSettings: SafetySettingsConfig = {
    harassment: safetySettings.harassment || 'OFF',
    hate: safetySettings.hate || 'OFF',
    sexuallyExplicit: safetySettings.sexuallyExplicit || 'OFF',
    dangerousContent: safetySettings.dangerousContent || 'OFF',
  };

  const getStepIndex = (val: SafetyThreshold) => {
    const idx = THRESHOLD_STEPS.findIndex((s) => s.value === val);
    return idx >= 0 ? idx : 0;
  };

  const handleSliderChange = (key: keyof SafetySettingsConfig, stepIndex: number) => {
    const step = THRESHOLD_STEPS[stepIndex] || THRESHOLD_STEPS[0];
    onUpdate({
      ...currentSettings,
      [key]: step.value,
    });
  };

  const handleResetDefaults = () => {
    onUpdate({ ...DEFAULT_SAFETY_SETTINGS });
  };

  const categories: { key: keyof SafetySettingsConfig; label: string }[] = [
    { key: 'harassment', label: 'Harassment' },
    { key: 'hate', label: 'Hate' },
    { key: 'sexuallyExplicit', label: 'Sexually Explicit' },
    { key: 'dangerousContent', label: 'Dangerous Content' },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm anim-fade">
      <div 
        className="w-full max-w-md bg-[#1E1E20] dark:bg-[#1E1E20] text-gray-200 rounded-3xl border border-white/10 shadow-2xl p-6 flex flex-col gap-5 anim-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Run safety settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <div className="text-xs leading-relaxed text-gray-300">
          <p>
            Atur ambang probabilitas pemblokiran konten output teks.
          </p>
        </div>

        <div className="flex items-center gap-1 text-gray-500 pt-1 border-t border-white/5">
          <ChevronRight size={14} />
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          {categories.map(({ key, label }) => {
            const currentStep = getStepIndex(currentSettings[key]);
            const stepLabel = THRESHOLD_STEPS[currentStep].label;

            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-gray-200">{label}</span>
                  <span className="text-gray-300 font-semibold">{stepLabel}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={currentStep}
                    onChange={(e) => handleSliderChange(key, parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-zinc-700/80 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-100 transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 text-xs font-semibold text-gray-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl transition-colors cursor-pointer border border-white/5"
          >
            Reset defaults
          </button>
        </div>
      </div>
    </div>
  );
};
