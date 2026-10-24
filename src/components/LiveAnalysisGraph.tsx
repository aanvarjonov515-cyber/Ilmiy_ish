/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ElectricalOperatingPoint } from '../physics/fuelOptoModel';
import { SimulationParameters } from '../types/circuit';
import { Play, RotateCcw, Activity } from 'lucide-react';

interface LiveAnalysisGraphProps {
  isRunning: boolean;
  isPaused: boolean;
  simulationTime: number;
  simulationSpeed: number;
  operatingPoint: ElectricalOperatingPoint;
  params: SimulationParameters;
  isDarkMode: boolean;
  onResumeAcquisition?: () => void;
  onRestartAcquisition?: () => void;
  isStale?: boolean;
}

export type WavelengthMode = 'screenshot_ref' | 'research_band';

export const LiveAnalysisGraph: React.FC<LiveAnalysisGraphProps> = ({
  isRunning,
  isPaused,
  simulationTime,
  simulationSpeed,
  operatingPoint,
  params,
  isDarkMode,
  onResumeAcquisition,
  onRestartAcquisition,
  isStale = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Wavelength Mode Selection
  const [wavelengthMode, setWavelengthMode] = useState<WavelengthMode>('screenshot_ref');

  // Trace Visibility Toggles
  const [visibleTraces, setVisibleTraces] = useState({
    channelA: true,  // Orange (Water absorption)
    channelB: true,  // Vivid Green (Reference)
    filtered: true,  // Cyan/Blue (DSP Filtered / Ratio)
    baseline: true,  // Charcoal Gray (Pure fuel baseline)
  });

  // Internal animation state refs for rock-solid 60 FPS rendering
  const scanProgressRef = useRef<number>(0.15);
  const sampleCountRef = useRef<number>(142);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const localSimTimeRef = useRef<number>(simulationTime);

  // React state for UI updates that need to sync with the scan cursor
  const [cursorWlDisplay, setCursorWlDisplay] = useState<number>(750);
  const [sampleCountDisplay, setSampleCountDisplay] = useState<number>(142);
  const [liveReadings, setLiveReadings] = useState({
    valOrange: 92.4,
    valGreen: 124.8,
    valCyan: 104.2,
    valGray: 148.5,
  });

  // Interactive Hover Tooltip State
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    wavelength: number;
    valOrange: number;
    valGreen: number;
    valCyan: number;
    valGray: number;
  } | null>(null);

  // Keep localSimTimeRef updated
  useEffect(() => {
    localSimTimeRef.current = simulationTime;
  }, [simulationTime]);

  // Wavelength domains
  const domain = useMemo(() => {
    if (wavelengthMode === 'screenshot_ref') {
      return {
        minWl: 600,
        maxWl: 1250,
        minY: 60,
        maxY: 175,
        xLabel: 'Wavelength (nm)',
        yLabel: 'Transmission (%) / Normalized response',
        title: 'O‘tkazish spektri',
      };
    } else {
      return {
        minWl: 1800,
        maxWl: 2400,
        minY: 50,
        maxY: 165,
        xLabel: 'Wavelength (nm) / Spektral diapazon',
        yLabel: 'Transmission (%) / Normalized response',
        title: 'O‘tkazish spektri (1800–2400 nm Ilmiy tadqiqot diapazoni)',
      };
    }
  }, [wavelengthMode]);

  // Handle external restart
  const handleRestart = useCallback(() => {
    scanProgressRef.current = 0;
    sampleCountRef.current = 0;
    setSampleCountDisplay(0);
    if (onRestartAcquisition) {
      onRestartAcquisition();
    }
  }, [onRestartAcquisition]);

  // Physics evaluation function: produces realistic, smooth, model-driven animated spectral curves
  // Every trace responds to:
  // - Water concentration (ppm): deepens 1940nm & 970/1190nm dips
  // - Optical intensity (%): scales transmission
  // - Temperature (°C): thermal shift & slight baseline expansion
  // - Turbidity/Contamination: attenuation across spectrum
  // - Optical path length: Beer-Lambert exponential scaling
  // - Time evolution: continuous, smooth source pulsing and active scanning modulation (~2.5-4.5% amplitude)
  const evaluateSpectra = useCallback(
    (wl: number, timeVal: number, scanWl: number) => {
      const ppm = params.waterConcentrationPpm;
      const temp = params.fuelTemperature;
      const turb = params.turbidityContamination / 100;
      const pathRatio = params.opticalPathLengthMm / 15;
      
      // Factor in LED brightness from potentiometer & power supply state
      const potBrightnessFactor = operatingPoint.vSupplyActual > 0 ? (operatingPoint.led1BrightnessPercent / 100) : 0.02;
      const intensityScale = (params.opticalIntensityPercent / 100) * potBrightnessFactor;
      const resp = params.detectorResponsivity / 0.85;

      // CONTINUOUS, VISIBLY LIVING DYNAMIC OSCILLATION
      // Modeled as optical carrier ripple and active detector spatial-temporal sampling
      const dynamicWave1 = Math.sin(timeVal * 4.2 + (wl / 65)) * 3.2;
      const dynamicWave2 = Math.cos(timeVal * 3.1 - (wl / 90)) * 2.2;
      const dynamicWave3 = Math.sin(timeVal * 2.4 + (wl / 110)) * 1.8;

      // Scan-head active acquisition glow at the cursor front
      const scanProximity = Math.exp(-Math.pow((wl - scanWl) / 38, 2)) * 4.2;

      if (wavelengthMode === 'screenshot_ref') {
        // Screenshot Reference Mode: 600 - 1250 nm
        // Baseline (Charcoal Gray) - pure dry hydrocarbon reference curve
        const baseSlope = (1250 - wl) / 650;
        const valGray = (145 + baseSlope * 18 - turb * 16 + Math.sin(wl / 95) * 3 + dynamicWave3 * 0.5) * intensityScale;

        // Channel B (Vivid Green) - reference channel around 120-135%
        const greenNominal = 120 + Math.sin((wl - 600) / 180) * 12 - turb * 12 + dynamicWave1 * 0.6 + scanProximity * 0.4;
        const valGreen = Math.max(68, Math.min(170, greenNominal * intensityScale * resp));

        // Channel A (Orange) - water absorption overtones at ~970 nm and ~1190 nm
        const dip970 = Math.exp(-Math.pow((wl - 970) / 45, 2)) * (16 + ppm * 0.38) * pathRatio;
        const dip1190 = Math.exp(-Math.pow((wl - 1190) / 50, 2)) * (22 + ppm * 0.44) * pathRatio;
        const orangeNominal = 100 + Math.sin((wl - 650) / 150) * 7 - dip970 - dip1190 - (temp - 20) * 0.14 - turb * 14 + dynamicWave1 * 0.85 + scanProximity * 0.7;
        const valOrange = Math.max(60, Math.min(160, orangeNominal * intensityScale * resp));

        // Filtered Signal (Cyan) - normalized DSP ratio curve: (Channel A / Channel B) * 115
        const ratio = valOrange / Math.max(40, valGreen);
        const valCyan = ratio * 116 + dynamicWave2 * 0.6;

        return { valOrange, valGreen, valCyan, valGray };
      } else {
        // Research Band: 1800 - 2400 nm (Near-Infrared water fundamental band at 1.94 µm)
        // Baseline (Charcoal Gray)
        const baseSlope = (2400 - wl) / 600;
        const valGray = (140 + baseSlope * 12 - turb * 15 + dynamicWave3 * 0.5) * intensityScale;

        // Channel B (Vivid Green) - reference wavelength at 2150 nm (isosbestic reference)
        const greenNominal = 126 + Math.sin((wl - 1800) / 170) * 7 - turb * 10 + dynamicWave1 * 0.6 + scanProximity * 0.4;
        const valGreen = Math.max(65, Math.min(165, greenNominal * intensityScale * resp));

        // Channel A (Orange) - intense fundamental water absorption band at 1940 nm!
        const dip1940 = Math.exp(-Math.pow((wl - 1940) / 36, 2)) * (30 + ppm * 0.82) * pathRatio;
        const dip2280 = Math.exp(-Math.pow((wl - 2280) / 45, 2)) * 14;
        const orangeNominal = 112 - dip1940 - dip2280 - (temp - 20) * 0.16 - turb * 12 + dynamicWave1 * 0.9 + scanProximity * 0.8;
        const valOrange = Math.max(50, Math.min(155, orangeNominal * intensityScale * resp));

        // Filtered (Cyan) - dual-wavelength compensated normalized response
        const ratio = valOrange / Math.max(40, valGreen);
        const valCyan = ratio * 114 + dynamicWave2 * 0.6;

        return { valOrange, valGreen, valCyan, valGray };
      }
    },
    [params, wavelengthMode]
  );

  // 60 FPS MAIN RENDER AND SCAN LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let telemetryThrottle = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Update scan position if RUNNING and NOT PAUSED
      if (isRunning && !isPaused) {
        // Full sweep in ~4.2 seconds
        const sweepRate = 0.24 * simulationSpeed;
        scanProgressRef.current = (scanProgressRef.current + dt * sweepRate) % 1.0;
        sampleCountRef.current += 1;
        localSimTimeRef.current += dt * simulationSpeed;
      }

      const activeProgress = scanProgressRef.current;
      const currentScanWl = Math.round(domain.minWl + activeProgress * (domain.maxWl - domain.minWl));
      const currentSimTime = localSimTimeRef.current;

      // Periodically update React state for bottom panel (every ~100ms)
      telemetryThrottle += dt;
      if (telemetryThrottle > 0.08) {
        telemetryThrottle = 0;
        setCursorWlDisplay(currentScanWl);
        setSampleCountDisplay(sampleCountRef.current);
        const currentVals = evaluateSpectra(currentScanWl, currentSimTime, currentScanWl);
        setLiveReadings(currentVals);
      }

      // ==========================================
      // CANVAS DRAWING (CLEAN SCIENTIFIC REFERENCE LOOK)
      // ==========================================
      const width = canvas.width;
      const height = canvas.height;

      // 1. Pure White Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const marginTop = 42;
      const marginBottom = 48;
      const marginLeft = 65;
      const marginRight = 35;

      const plotWidth = width - marginLeft - marginRight;
      const plotHeight = height - marginTop - marginBottom;

      const getX = (wl: number) => {
        return marginLeft + ((wl - domain.minWl) / (domain.maxWl - domain.minWl)) * plotWidth;
      };

      const getY = (val: number) => {
        const clamped = Math.max(domain.minY, Math.min(domain.maxY, val));
        return marginTop + plotHeight - ((clamped - domain.minY) / (domain.maxY - domain.minY)) * plotHeight;
      };

      // 2. LED Band Highlight in Research Mode (1940 - 2200 nm)
      if (wavelengthMode === 'research_band') {
        const ledStartX = getX(1940);
        const ledEndX = getX(2200);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.fillRect(ledStartX, marginTop, ledEndX - ledStartX, plotHeight);

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(ledStartX, marginTop);
        ctx.lineTo(ledStartX, marginTop + plotHeight);
        ctx.moveTo(ledEndX, marginTop);
        ctx.lineTo(ledEndX, marginTop + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#0891b2';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LED Nurlanish Sohasi (1.94–2.2 µm)', (ledStartX + ledEndX) / 2, marginTop + 14);

        ctx.fillStyle = '#e11d48';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('λ1=1940nm (Suv)', ledStartX, marginTop + 28);

        const refX = getX(2150);
        ctx.fillStyle = '#059669';
        ctx.fillText('λ2=2150nm (Tayanch)', refX, marginTop + 28);
      }

      // 3. Grid Lines (Light gray dashed lines)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const yStep = 20;
      const startYTick = Math.ceil(domain.minY / yStep) * yStep;

      ctx.fillStyle = '#000000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';

      for (let yVal = startYTick; yVal <= domain.maxY; yVal += yStep) {
        const y = getY(yVal);
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(marginLeft + plotWidth, y);
        ctx.stroke();
        ctx.fillText(`${yVal}`, marginLeft - 8, y + 3.5);
      }

      const xStep = 100;
      const startXTick = Math.ceil(domain.minWl / xStep) * xStep;

      ctx.textAlign = 'center';
      for (let xWl = startXTick; xWl <= domain.maxWl; xWl += xStep) {
        const x = getX(xWl);
        ctx.beginPath();
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, marginTop + plotHeight);
        ctx.stroke();
        ctx.fillText(`${xWl}`, x, marginTop + plotHeight + 16);
      }
      ctx.setLineDash([]);

      // 4. Black Axes Box & Tick marks
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(marginLeft, marginTop, plotWidth, plotHeight);

      ctx.beginPath();
      for (let yVal = startYTick; yVal <= domain.maxY; yVal += yStep) {
        const y = getY(yVal);
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(marginLeft - 4, y);
        ctx.moveTo(marginLeft + plotWidth, y);
        ctx.lineTo(marginLeft + plotWidth + 4, y);
      }
      for (let xWl = startXTick; xWl <= domain.maxWl; xWl += xStep) {
        const x = getX(xWl);
        ctx.moveTo(x, marginTop + plotHeight);
        ctx.lineTo(x, marginTop + plotHeight + 4);
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, marginTop - 4);
      }
      ctx.stroke();

      // 5. Centered Chart Title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(domain.title, marginLeft + plotWidth / 2, marginTop - 18);

      // 6. Axis Labels
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(domain.xLabel, marginLeft + plotWidth / 2, height - 12);

      ctx.save();
      ctx.translate(18, marginTop + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(domain.yLabel, 0, 0);
      ctx.restore();

      // 7. Status Watermark
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        isPaused ? 'PAUZA — TO‘LQINLAR MUZLATILGAN' : 'JONLI HARAKATLANUVCHI SPEKTR (60 FPS)',
        width - marginRight,
        marginTop - 8
      );

      // 8. GENERATE ANIMATED DATA POINTS (280 fine points across the spectrum)
      const numPoints = 280;
      const points: Array<{ wl: number; valOrange: number; valGreen: number; valCyan: number; valGray: number }> = [];

      for (let i = 0; i <= numPoints; i++) {
        const wl = domain.minWl + (i / numPoints) * (domain.maxWl - domain.minWl);
        points.push({
          wl,
          ...evaluateSpectra(wl, currentSimTime, currentScanWl),
        });
      }

      const drawTrace = (
        color: string,
        lineWidth: number,
        dashArray: number[],
        extractVal: (p: (typeof points)[0]) => number
      ) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dashArray);
        ctx.beginPath();

        points.forEach((pt, idx) => {
          const x = getX(pt.wl);
          const y = getY(extractVal(pt));
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.setLineDash([]);
      };

      // Trace 4: Charcoal Gray (Reference / Baseline)
      if (visibleTraces.baseline) {
        drawTrace('#374151', 2.0, [], (p) => p.valGray);
      }

      // Trace 2: Vivid Green (Channel B / Reference)
      if (visibleTraces.channelB) {
        drawTrace('#16a34a', 2.2, [], (p) => p.valGreen);
      }

      // Trace 3: Cyan / Blue (Filtered Signal)
      if (visibleTraces.filtered) {
        drawTrace('#0284c7', 2.0, [5, 2], (p) => p.valCyan);
      }

      // Trace 1: Orange (Channel A / Water sensitive measurement)
      if (visibleTraces.channelA) {
        drawTrace('#ea580c', 2.4, [], (p) => p.valOrange);
      }

      // 9. Moving Vertical Scan Cursor (Left-to-right sweep)
      const cursorX = marginLeft + activeProgress * plotWidth;

      // Scan zone highlight (subtle glow column following the scan cursor)
      const grad = ctx.createLinearGradient(cursorX - 25, 0, cursorX + 8, 0);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.0)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(cursorX - 25, marginTop, 25, plotHeight);

      // Cursor line
      ctx.strokeStyle = isPaused ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(cursorX, marginTop);
      ctx.lineTo(cursorX, marginTop + plotHeight);
      ctx.stroke();

      // Top triangular pointer
      ctx.fillStyle = isPaused ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(cursorX - 5, marginTop);
      ctx.lineTo(cursorX + 5, marginTop);
      ctx.lineTo(cursorX, marginTop + 8);
      ctx.closePath();
      ctx.fill();

      // Cursor wavelength badge
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentScanWl} nm`, cursorX, marginTop - 4);

      // 10. Mouse Hover Crosshair and Markers
      if (hoverData) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(hoverData.x, marginTop);
        ctx.lineTo(hoverData.x, marginTop + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        const drawDot = (val: number, color: string) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(hoverData.x, getY(val), 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        };

        if (visibleTraces.channelA) drawDot(hoverData.valOrange, '#ea580c');
        if (visibleTraces.channelB) drawDot(hoverData.valGreen, '#16a34a');
        if (visibleTraces.filtered) drawDot(hoverData.valCyan, '#0284c7');
        if (visibleTraces.baseline) drawDot(hoverData.valGray, '#374151');
      }

      // Schedule next frame
      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    domain,
    visibleTraces,
    isRunning,
    isPaused,
    simulationSpeed,
    evaluateSpectra,
    hoverData,
    wavelengthMode,
  ]);

  // Handle canvas mouse move for interactive hover readout
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const marginLeft = 65;
    const marginRight = 35;
    const plotWidth = canvas.width - marginLeft - marginRight;

    if (x >= marginLeft && x <= canvas.width - marginRight) {
      const ratio = (x - marginLeft) / plotWidth;
      const wl = Math.round(domain.minWl + ratio * (domain.maxWl - domain.minWl));
      const activeTime = localSimTimeRef.current;
      const currentScanWl = Math.round(domain.minWl + scanProgressRef.current * (domain.maxWl - domain.minWl));
      const vals = evaluateSpectra(wl, activeTime, currentScanWl);

      setHoverData({
        x,
        y,
        wavelength: wl,
        ...vals,
      });
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="w-full flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-4 shadow-md transition-colors">
      
      {/* Top Controls Toolbar of Spectrum Graph */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        
        {/* Wavelength Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setWavelengthMode('screenshot_ref')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              wavelengthMode === 'screenshot_ref'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Screenshot ma'lumotnomasi (600–1250 nm)
          </button>
          <button
            onClick={() => setWavelengthMode('research_band')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              wavelengthMode === 'research_band'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Ilmiy tadqiqot diapazoni (1800–2400 nm)
          </button>
        </div>

        {/* Trace Visibility Checkboxes */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleTraces.channelA}
              onChange={(e) => setVisibleTraces((p) => ({ ...p, channelA: e.target.checked }))}
              className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Channel A (Suv)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleTraces.channelB}
              onChange={(e) => setVisibleTraces((p) => ({ ...p, channelB: e.target.checked }))}
              className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Channel B (Tayanch)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleTraces.filtered}
              onChange={(e) => setVisibleTraces((p) => ({ ...p, filtered: e.target.checked }))}
              className="w-3.5 h-3.5 accent-sky-600 rounded cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Filtered signal</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleTraces.baseline}
              onChange={(e) => setVisibleTraces((p) => ({ ...p, baseline: e.target.checked }))}
              className="w-3.5 h-3.5 accent-gray-700 rounded cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-700 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Reference/baseline</span>
          </label>
        </div>

        {/* Acquisition Action Controls */}
        <div className="flex items-center gap-2">
          {onResumeAcquisition && isPaused && (
            <button
              onClick={onResumeAcquisition}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-cyan-600 text-white hover:bg-cyan-700 shadow-xs"
              title="O'lchovni davom ettirish"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Davom ettirish</span>
            </button>
          )}

          <button
            onClick={handleRestart}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Skanerlash va buferni qayta tiklash"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Qayta o'rnatish</span>
          </button>
        </div>

      </div>

      {/* Primary Spectrum Chart Viewport (Clean white laboratory plot) */}
      <div className="relative w-full h-[330px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner bg-white">
        <canvas
          ref={canvasRef}
          width={920}
          height={330}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair"
        />

        {/* Interactive Hover Readout Tooltip */}
        {hoverData && (
          <div
            className="absolute z-20 pointer-events-none px-3 py-2 rounded-lg bg-slate-900/95 border border-purple-500/50 shadow-xl backdrop-blur-md text-slate-100 font-mono text-[11px]"
            style={{
              left: `${Math.min(hoverData.x + 12, 680)}px`,
              top: `${Math.min(hoverData.y + 12, 220)}px`,
            }}
          >
            <div className="font-bold text-purple-300 border-b border-slate-700 pb-1 mb-1 flex items-center justify-between gap-3">
              <span>λ = {hoverData.wavelength} nm</span>
              <span className="text-[9px] text-slate-400">JONLI TAHLIL</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-orange-400 font-medium">Channel A:</span>
                <span className="font-bold tabular-nums">{hoverData.valOrange.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-emerald-400 font-medium">Channel B:</span>
                <span className="font-bold tabular-nums">{hoverData.valGreen.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-sky-400 font-medium">Filtered:</span>
                <span className="font-bold tabular-nums">{hoverData.valCyan.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400 font-medium">Baseline:</span>
                <span className="font-bold tabular-nums">{hoverData.valGray.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REPRODUCE REFERENCE'S BROAD LOWER MEASUREMENT PANEL */}
      <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3.5 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase text-[10px] font-bold">O'lchov holati:</span>
            {isStale ? (
              <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold">
                ESKIRGAN — parametr o‘zgardi
              </span>
            ) : isPaused ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                PAUZA / NATIJA TAYYOR (Muzlatilgan)
              </span>
            ) : isRunning ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                ISHLAMOQDA (Spektr to'lqinlari faol yangilanmoqda)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                TAYYOR
              </span>
            )}
          </div>

          {/* Current Wavelength at Cursor */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Skaner Kursor:</span>
            <span className="font-bold text-red-600 dark:text-red-400 text-sm">
              λ = {cursorWlDisplay} nm
            </span>
            <span className="text-slate-400 text-[10px]">({(cursorWlDisplay / 1000).toFixed(3)} µm)</span>
          </div>

          {/* Sample count & acquisition telemetry */}
          <div className="text-slate-500 text-[11px]">
            Namunalar: <strong className="text-slate-800 dark:text-slate-200">{sampleCountDisplay}</strong> ta
            {' · '}
            Holat: <strong className="text-cyan-600 dark:text-cyan-400">Simulyatsiya (Model)</strong>
          </div>
        </div>

        {/* Channels Live Cursor Readout Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          
          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span>Channel A (O'lchov)</span>
            </div>
            <div className="text-base font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-0.5">
              {liveReadings.valOrange.toFixed(2)} %
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Suv yutilishiga sezgir kanal
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Channel B (Tayanch)</span>
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {liveReadings.valGreen.toFixed(2)} %
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Optik darcha tayanchi
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-sky-600" />
              <span>Filtered Signal</span>
            </div>
            <div className="text-base font-bold text-sky-600 dark:text-sky-400 tabular-nums mt-0.5">
              {liveReadings.valCyan.toFixed(2)} %
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              DSP filtrlangan nisbat
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span>Reference/Baseline</span>
            </div>
            <div className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
              {liveReadings.valGray.toFixed(2)} %
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Quruq yoqilg'i etaloni
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
