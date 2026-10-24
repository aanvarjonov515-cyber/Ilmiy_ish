/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { MeasurementSample } from '../types/circuit';
import { ElectricalOperatingPoint, FUEL_TYPES } from '../physics/fuelOptoModel';
import { Activity, BarChart2, CheckCircle2, RotateCcw } from 'lucide-react';

interface MeasurementResultGraphProps {
  samples: MeasurementSample[];
  isPaused: boolean;
  isRunning: boolean;
  simulationTime: number;
  simulationSpeed: number;
  operatingPoint: ElectricalOperatingPoint;
  selectedFuelId: string;
  isDarkMode: boolean;
  isStale?: boolean;
}

interface WavePoint {
  timeMs: number;
  vIn: number;       // Detector / Input stage (Orange)
  vA1: number;       // Preamplifier A1 (Purple)
  vA2: number;       // Gain stage A2 with clipping (Cyan)
  vDemod: number;    // Demodulated output (Green)
}

export const MeasurementResultGraph: React.FC<MeasurementResultGraphProps> = ({
  samples,
  isPaused,
  isRunning,
  simulationTime,
  simulationSpeed,
  operatingPoint,
  selectedFuelId,
  isDarkMode,
  isStale = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFuel = FUEL_TYPES.find(f => f.id === selectedFuelId) || FUEL_TYPES[0];

  // Mode: 'oscilloscope' (Continuously scrolling waves) or 'calibration' (Result curve)
  const [activeTab, setActiveTab] = useState<'oscilloscope' | 'calibration'>('oscilloscope');

  // Trace toggles for oscilloscope
  const [visibleWaves, setVisibleWaves] = useState({
    vIn: true,       // Orange - Input stage
    vA1: true,       // Purple - Preamp A1
    vA2: true,       // Cyan - Main Gain A2
    vDemod: true,    // Green - Demodulator DC
  });

  // Rolling history buffer for oscilloscope (stores smooth continuous wave points)
  const waveBufferRef = useRef<WavePoint[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const localTimeRef = useRef<number>(simulationTime || 0);

  // Live wave metrics state for bottom panel
  const [liveMetrics, setLiveMetrics] = useState({
    vInst: 4.85,
    vPeak: 6.20,
    vPp: 12.40,
    vRms: 4.38,
    freq: 1000,
  });

  // Update local time reference when simulationTime prop changes
  useEffect(() => {
    if (simulationTime !== undefined) {
      localTimeRef.current = simulationTime;
    }
  }, [simulationTime]);

  // Pre-populate buffer on mount if empty
  const populateInitialBuffer = useCallback(() => {
    const pts: WavePoint[] = [];
    const count = 260;
    const baseT = localTimeRef.current;
    for (let i = 0; i < count; i++) {
      const t = baseT - (count - i) * 0.0006;
      // 1 kHz modulation downscaled for visually clear traveling oscilloscope waves
      const carrier = Math.sin(t * 70);
      const carrierSq = carrier >= 0 ? 1.0 : -0.2;
      const iPh = operatingPoint.instantPhotocurrent_uA;
      const vIn = (iPh / 25) * 1.2 * (0.5 + 0.5 * carrierSq);
      const vA1 = Math.max(-10.5, Math.min(10.5, operatingPoint.vA1_out * (0.8 + 0.2 * carrier)));
      const vA2 = Math.max(-10.5, Math.min(10.5, operatingPoint.vA2_out * (0.85 + 0.15 * carrierSq)));
      const vDemod = operatingPoint.vChA_out;

      pts.push({
        timeMs: Math.round(t * 1000),
        vIn,
        vA1,
        vA2,
        vDemod,
      });
    }
    waveBufferRef.current = pts;
  }, [operatingPoint]);

  useEffect(() => {
    if (waveBufferRef.current.length === 0) {
      populateInitialBuffer();
    }
  }, [populateInitialBuffer]);

  // Calibration curve statistical summary
  const statistics = useMemo(() => {
    if (samples.length === 0) {
      return { count: 0, mean: operatingPoint.compensatedPpm, stdDev: 0.0, snr: operatingPoint.snrDb, confInterval: 0.0 };
    }
    const values = samples.map(s => s.compensatedPpm);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(1, values.length);
    const stdDev = Math.sqrt(variance);
    const confInterval = Math.max(0.1, 1.96 * (stdDev / Math.sqrt(values.length)));
    return {
      count: samples.length,
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 100) / 100,
      snr: operatingPoint.snrDb,
      confInterval: Math.round(confInterval * 100) / 100,
    };
  }, [samples, operatingPoint]);

  // Dedicated 60 FPS Canvas Oscilloscope & Calibration Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let metricsThrottle = 0;

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // 1. Advance simulation wave points if RUNNING & NOT PAUSED
      if (isRunning && !isPaused) {
        localTimeRef.current += dt * simulationSpeed;
        const t = localTimeRef.current;

        // Realistic carrier wave frequency: ~65 rad/s visually smooth scrolling wave
        const carrier = Math.sin(t * 68);
        const carrierSq = carrier >= 0 ? 1.0 : -0.25;
        const noise = (Math.random() - 0.5) * 0.04;

        // Stage 1: Detector input (Orange)
        const iPh = operatingPoint.instantPhotocurrent_uA;
        const vIn = (iPh / 24) * 1.25 * (0.5 + 0.5 * carrierSq) + noise;

        // Stage 2: Transimpedance preamplifier A1 (Purple)
        const vA1 = Math.max(-10.5, Math.min(10.5, operatingPoint.vA1_out * (0.8 + 0.2 * carrier) + noise * 1.5));

        // Stage 3: Main gain amplifier A2 (Cyan - prominent wave, clipped at ±10.5V)
        const vA2 = Math.max(-10.5, Math.min(10.5, operatingPoint.vA2_out * (0.85 + 0.15 * carrierSq) + noise * 2));

        // Stage 4: Demodulated DC output (Green)
        const vDemod = operatingPoint.vChA_out + noise * 0.2;

        waveBufferRef.current.push({
          timeMs: Math.round(t * 1000),
          vIn,
          vA1,
          vA2,
          vDemod,
        });

        // Maintain bounded rolling window (260 points across the screen)
        if (waveBufferRef.current.length > 260) {
          waveBufferRef.current.shift();
        }
      }

      // Update metrics throttled (~100ms)
      metricsThrottle += dt;
      if (metricsThrottle > 0.09) {
        metricsThrottle = 0;
        const buf = waveBufferRef.current;
        if (buf.length > 0) {
          const a2Vals = buf.map(p => p.vA2);
          const minV = Math.min(...a2Vals);
          const maxV = Math.max(...a2Vals);
          const vPp = Math.abs(maxV - minV);
          const vPeak = Math.max(Math.abs(minV), Math.abs(maxV));
          const sumSq = a2Vals.reduce((acc, v) => acc + v * v, 0);
          const vRms = Math.sqrt(sumSq / a2Vals.length);
          const latest = buf[buf.length - 1];

          setLiveMetrics({
            vInst: Math.round(latest.vA2 * 100) / 100,
            vPeak: Math.round(vPeak * 100) / 100,
            vPp: Math.round(vPp * 100) / 100,
            vRms: Math.round(vRms * 100) / 100,
            freq: 1000,
          });
        }
      }

      // ==========================================
      // CANVAS DRAWING
      // ==========================================
      const width = canvas.width;
      const height = canvas.height;

      // 1. Pure White Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const padLeft = 65;
      const padBottom = 48;
      const padTop = 42;
      const padRight = 35;

      const plotWidth = width - padLeft - padRight;
      const plotHeight = height - padTop - padBottom;

      if (activeTab === 'oscilloscope') {
        // ==========================================
        // OSCILLOSCOPE TIME-DOMAIN VIEW
        // ==========================================
        const minV = -12.0;
        const maxV = 12.0;

        const getY = (v: number) => {
          const clamped = Math.max(minV, Math.min(maxV, v));
          return padTop + plotHeight - ((clamped - minV) / (maxV - minV)) * plotHeight;
        };

        // Grid lines (light gray dashed)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Y-axis grid (-10V, -5V, 0V, +5V, +10V)
        const vTicks = [-10, -5, 0, 5, 10];
        ctx.fillStyle = '#000000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';

        vTicks.forEach(v => {
          const y = getY(v);
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(padLeft + plotWidth, y);
          ctx.stroke();

          ctx.fillText(`${v > 0 ? '+' : ''}${v}V`, padLeft - 8, y + 3.5);
        });

        // 0V Center ground line (darker dashed line)
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(padLeft, getY(0));
        ctx.lineTo(padLeft + plotWidth, getY(0));
        ctx.stroke();

        // Time X-axis grid (0 to 160 ms window)
        const numXDivisions = 8;
        ctx.textAlign = 'center';
        for (let j = 0; j <= numXDivisions; j++) {
          const x = padLeft + (plotWidth / numXDivisions) * j;
          ctx.beginPath();
          ctx.moveTo(x, padTop);
          ctx.lineTo(x, padTop + plotHeight);
          ctx.stroke();

          const tVal = j * 20;
          ctx.fillText(`${tVal}ms`, x, padTop + plotHeight + 16);
        }
        ctx.setLineDash([]);

        // Black axes box
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(padLeft, padTop, plotWidth, plotHeight);

        // Centered Title
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Elektr Signallari Vaqt Diagrammasi (Ossillograf)', padLeft + plotWidth / 2, padTop - 18);

        // Axis labels
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Skanerlash vaqti t (ms)', padLeft + plotWidth / 2, height - 12);

        ctx.save();
        ctx.translate(18, padTop + plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Chiqish kuchlanishi V (Volts)', 0, 0);
        ctx.restore();

        // Watermark
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(
          isPaused ? 'PAUZA — TO‘LQINLAR MUZLATILGAN' : 'JONLI HARAKATLANUVCHI TO‘LQINLAR (60 FPS)',
          width - padRight,
          padTop - 8
        );

        // RENDER CONTINUOUSLY TRAVELING WAVES
        const data = waveBufferRef.current;
        if (data.length > 2) {
          const drawWave = (color: string, lineWidth: number, dash: number[], extract: (p: WavePoint) => number) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash(dash);
            ctx.beginPath();

            data.forEach((pt, i) => {
              const x = padLeft + (i / (data.length - 1)) * plotWidth;
              const y = getY(extract(pt));
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });

            ctx.stroke();
            ctx.setLineDash([]);
          };

          // Trace 1: Input signal (Amber/Orange)
          if (visibleWaves.vIn) {
            drawWave('#ea580c', 1.8, [], (p) => p.vIn);
          }

          // Trace 2: Preamp A1 (Purple)
          if (visibleWaves.vA1) {
            drawWave('#9333ea', 2.0, [4, 2], (p) => p.vA1);
          }

          // Trace 3: Main gain A2 (Cyan - prominent wave)
          if (visibleWaves.vA2) {
            drawWave('#0284c7', 2.5, [], (p) => p.vA2);
          }

          // Trace 4: Filtered demodulated DC (Green)
          if (visibleWaves.vDemod) {
            drawWave('#16a34a', 2.2, [], (p) => p.vDemod);
          }
        }

        // Live scanning leading dot at the right end of the oscilloscope
        const latestPt = data[data.length - 1];
        if (latestPt) {
          const cursorX = padLeft + plotWidth;
          ctx.fillStyle = isPaused ? '#f59e0b' : '#ef4444';
          ctx.beginPath();
          ctx.arc(cursorX, getY(latestPt.vA2), 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

      } else {
        // ==========================================
        // CALIBRATION RESULT CURVE VIEW
        // ==========================================
        const maxA = 1.2;
        const maxPpm = 120;

        // Grid
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        for (let i = 0; i <= 6; i++) {
          const yVal = (maxA - (i * maxA / 6)).toFixed(1);
          const y = padTop + (plotHeight / 6) * i;
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(padLeft + plotWidth, y);
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = '10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(yVal, padLeft - 8, y + 3.5);
        }

        ctx.textAlign = 'center';
        for (let j = 0; j <= 6; j++) {
          const xPpm = Math.round((j * maxPpm) / 6);
          const x = padLeft + (plotWidth / 6) * j;
          ctx.beginPath();
          ctx.moveTo(x, padTop);
          ctx.lineTo(x, padTop + plotHeight);
          ctx.stroke();
          ctx.fillText(`${xPpm}`, x, padTop + plotHeight + 16);
        }
        ctx.setLineDash([]);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(padLeft, padTop, plotWidth, plotHeight);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('Optik Yutilish Kalibratsiyasi va Fiksatsiya Qilingan Natija', padLeft + plotWidth / 2, padTop - 18);

        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Namlik miqdori Cw (ppm / mg·kg⁻¹)', padLeft + plotWidth / 2, height - 12);

        ctx.save();
        ctx.translate(18, padTop + plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Differentsial Yutilish ΔA = -ln(R)', 0, 0);
        ctx.restore();

        // GOST Threshold Line
        const limitX = padLeft + (currentFuel.maxAllowedMoisturePpm / maxPpm) * plotWidth;
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(limitX, padTop);
        ctx.lineTo(limitX, padTop + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#e11d48';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`GOST Chegara: ${currentFuel.maxAllowedMoisturePpm} ppm`, limitX + 4, padTop + 14);

        // Theoretical Buger-Lambert Curve
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop + plotHeight);
        ctx.lineTo(padLeft + plotWidth, padTop + 10);
        ctx.stroke();

        // Sample points history
        if (samples.length > 0) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
          samples.forEach((s) => {
            const x = padLeft + Math.min(plotWidth, (s.compensatedPpm / maxPpm) * plotWidth);
            const y = padTop + plotHeight - Math.min(plotHeight, ((s.absorbanceDelta || 0.2) / maxA) * plotHeight);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Highlight current point
        const currentX = padLeft + Math.min(plotWidth, (statistics.mean / maxPpm) * plotWidth);
        const currentAbsorbance = -Math.log(Math.max(0.01, operatingPoint.transmittanceRatio));
        const currentY = padTop + plotHeight - Math.min(plotHeight, (Math.max(0, currentAbsorbance) / maxA) * plotHeight);

        ctx.fillStyle = isPaused ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isPaused ? '#f59e0b' : '#10b981';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    activeTab,
    visibleWaves,
    isRunning,
    isPaused,
    simulationSpeed,
    operatingPoint,
    samples,
    statistics,
    currentFuel,
  ]);

  // Restart handler
  const handleResetWaveBuffer = () => {
    waveBufferRef.current = [];
    populateInitialBuffer();
  };

  return (
    <div className="w-full flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-4 shadow-md transition-colors">
      
      {/* Top Header with Tab Switcher & Wave Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        
        {/* Tab Switcher (Oscilloscope vs Calibration) */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('oscilloscope')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === 'oscilloscope'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Jonli Elektr To'lqinlari (Harakatlanuvchi Ossillograf)</span>
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === 'calibration'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Kalibratsiya & Natija Tahlili</span>
          </button>
        </div>

        {/* Oscilloscope Wave Visibility Toggles */}
        {activeTab === 'oscilloscope' ? (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleWaves.vIn}
                onChange={(e) => setVisibleWaves(p => ({ ...p, vIn: e.target.checked }))}
                className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Vin (Fototok)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleWaves.vA1}
                onChange={(e) => setVisibleWaves(p => ({ ...p, vA1: e.target.checked }))}
                className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">VA1 (Preamp)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleWaves.vA2}
                onChange={(e) => setVisibleWaves(p => ({ ...p, vA2: e.target.checked }))}
                className="w-3.5 h-3.5 accent-sky-600 rounded cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">VA2 (Asosiy chiqish)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleWaves.vDemod}
                onChange={(e) => setVisibleWaves(p => ({ ...p, vDemod: e.target.checked }))}
                className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Vdemod (DC)</span>
            </label>

            <button
              onClick={handleResetWaveBuffer}
              className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="To'lqin buferini qayta to'ldirish"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        ) : (
          /* Calibration Status Badge */
          <div className="flex items-center gap-2 text-xs font-mono">
            {isPaused ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PAUZA / NATIJA TAYYOR
              </span>
            ) : isRunning ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                YIG'ILMOQDA ({samples.length} namuna)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                TAYYOR
              </span>
            )}
          </div>
        )}

      </div>

      {/* Main Plot Viewport */}
      <div className="relative w-full h-[330px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner bg-white">
        <canvas
          ref={canvasRef}
          width={920}
          height={330}
          className="w-full h-full"
        />
      </div>

      {/* Structured Telemetry Panel (Oscilloscope Live Metrics) */}
      {activeTab === 'oscilloscope' ? (
        <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3.5 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-[10px] font-bold">Ossillograf holati:</span>
              <span className={`px-2 py-0.5 rounded font-bold flex items-center gap-1.5 ${
                isPaused 
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400' 
                  : isRunning 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
              }`}>
                {isRunning && !isPaused && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                {isPaused ? 'PAUSED — TO‘LQIN MUZLATILDI' : isRunning ? 'RUNNING — TO‘LQINLAR OQIMOQDA' : 'READY'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-500">
              <span>Chastota: <strong className="text-cyan-500">{liveMetrics.freq} Hz</strong></span>
              <span>·</span>
              <span>Kvantlash: <strong className="text-slate-700 dark:text-slate-300">{Math.round(200 * simulationSpeed)} SPS</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Oniy Kuchlanish (Vinst)</span>
              <span className="text-base font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {liveMetrics.vInst.toFixed(2)} V
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Pik-to-Pik Amplituda (Vp-p)</span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                {liveMetrics.vPp.toFixed(2)} V
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Effektiv Kuchlanish (Vrms)</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {liveMetrics.vRms.toFixed(2)} V
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">To'yinish (Clipping chegarasi)</span>
              <span className="text-base font-bold text-amber-500 tabular-nums">
                ±10.5 V
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Calibration Statistical Summary */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px] font-mono">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">O‘rtacha Namlik (µ)</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {samples.length >= 5 ? `${statistics.mean} ppm` : 'Namuna to‘planmoqda...'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Standart Og‘ish (σ)</span>
            <span className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              {samples.length >= 5 ? `±${statistics.stdDev} ppm` : '--'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">95% Ishonchlilik Oralig‘i</span>
            <span className="text-base font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
              {samples.length >= 5 ? `±${statistics.confInterval} ppm` : '--'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px]">Signal/Shovqin (SNR)</span>
            <span className="text-base font-bold text-amber-500 tabular-nums">
              {statistics.snr} dB
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
