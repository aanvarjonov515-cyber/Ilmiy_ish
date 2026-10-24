/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sun, 
  Moon, 
  FileText,
  Activity,
  Cpu,
  Radio
} from 'lucide-react';
import { CircuitStage } from '../types/circuit';

interface TopToolbarProps {
  stage: CircuitStage;
  onStageChange: (stage: CircuitStage) => void;
  isRunning: boolean;
  isPaused: boolean;
  onRun: () => void;
  onPause: () => void;
  onRestart: () => void;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenReport: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  stage,
  onStageChange,
  isRunning,
  isPaused,
  onRun,
  onPause,
  onRestart,
  simulationSpeed,
  onSpeedChange,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  isDarkMode,
  onToggleTheme,
  onOpenReport,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1720px] mx-auto">
        
        {/* Brand & Laboratory Title Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-lg bg-cyan-600/10 text-cyan-500 border border-cyan-500/20">
            <Radio className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
                OPTO-LAB: Yoqilg'i Namligi Tahlili
              </span>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 font-medium">
                1.94 / 2.15 µm Dual-Wave
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Harbiylashtirilgan yoqilg'ilar optoelektronik o'lchov ilmiy simulyatsiyasi
            </p>
          </div>
        </div>

        {/* Stage Navigation & Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap gap-1">
          <button
            onClick={() => onStageChange('integrated')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              stage === 'integrated'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Birlashtirilgan Sxema (To'liq Tizim)</span>
          </button>
          <button
            onClick={() => onStageChange('analog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              stage === 'analog'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Analog & Optika</span>
          </button>
          <button
            onClick={() => onStageChange('digital')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              stage === 'digital'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Raqamli & Drayverlar</span>
          </button>
        </div>

        {/* Working Simulation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* RUN Button */}
          <button
            onClick={onRun}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all shadow-sm ${
              isRunning && !isPaused
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/40'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
            }`}
            title="Simulyatsiyani ishga tushirish (tok harakati va spektr grafigi)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RUN (Ishga tushirish)</span>
          </button>

          {/* PAUSE / RESULT Button */}
          <button
            onClick={onPause}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              isPaused
                ? 'bg-amber-600 text-white ring-2 ring-amber-500/40'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
            }`}
            title="Simulyatsiyani to'xtatish va yakuniy natija grafigini fiksatsiya qilish"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>PAUSE / RESULT</span>
          </button>

          {/* RESTART Button */}
          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all"
            title="Vaqt va grafiklarni boshlang'ich holatga qaytarish"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center text-xs bg-slate-100 dark:bg-slate-800/80 rounded-md border border-slate-200 dark:border-slate-700 p-0.5">
            <span className="px-2 text-slate-400 font-mono text-[10px]">TEZLIK:</span>
            {[0.5, 1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  simulationSpeed === spd
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Zoom and Fit Controls */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
            <button
              onClick={onZoomIn}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title="Kattalashtirish (Zoom In)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomOut}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title="Kichiklashtirish (Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFitScreen}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title="Ekranga moslashtirish (Fit Screen)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title={isDarkMode ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>

          {/* Lab Report Button */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-700 hover:bg-cyan-800 text-white transition-all shadow-sm"
            title="Universitet ilmiy bayonnomasini ko'rish / Eksport qilish"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ilmiy Bayonnoma</span>
          </button>
        </div>

      </div>
    </header>
  );
};
