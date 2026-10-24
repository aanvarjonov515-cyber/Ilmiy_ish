/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CircuitStage, CircuitComponent, SimulationParameters, MeasurementSample } from './types/circuit';
import { ANALOG_COMPONENTS, ANALOG_NODES, ANALOG_WIRES } from './data/analogCircuitData';
import { DIGITAL_COMPONENTS, DIGITAL_NODES, DIGITAL_WIRES } from './data/digitalCircuitData';
import { INTEGRATED_COMPONENTS, INTEGRATED_NODES, INTEGRATED_WIRES } from './data/integratedCircuitData';
import { calculateCircuitOperatingPoint } from './physics/fuelOptoModel';
import { TopToolbar } from './components/TopToolbar';
import { CircuitCanvas } from './components/CircuitCanvas';
import { ComponentInspector } from './components/ComponentInspector';
import { FuelMeasurementPanel } from './components/FuelMeasurementPanel';
import { LiveAnalysisGraph } from './components/LiveAnalysisGraph';
import { MeasurementResultGraph } from './components/MeasurementResultGraph';
import { LabReportModal } from './components/LabReportModal';

export default function App() {
  // Check initial stage from global or URL (Default to 'integrated' unified system)
  const initialStage: CircuitStage = (window as unknown as { __INITIAL_PAGE__?: string }).__INITIAL_PAGE__ === 'digital' || 
    window.location.pathname.includes('about') || 
    window.location.search.includes('digital') 
      ? 'digital' 
      : window.location.search.includes('analog')
      ? 'analog'
      : 'integrated';

  const [stage, setStage] = useState<CircuitStage>(initialStage);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Sync theme with <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Simulation running & timing states
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [simulationTime, setSimulationTime] = useState<number>(0);

  // Canvas Pan & Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected component
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>('POT_RP1');

  // Modified component parameters dictionary
  const [componentsState, setComponentsState] = useState<Record<string, number>>({
    R1: 100000,
    R2: 10000,
    R3: 4700,
    R4: 47000,
    R5: 10000,
    R6: 10000,
    C1: 10,
    C2: 0.1,
    C3: 22,
    C4: 0.1,
    C5: 1.0,
    C6: 1.0,
    DIG_R9: 47,
    DIG_R17: 47,
    POT_RP1: 20,
    PSU: 12,
  });

  // Physical Simulation & Fuel Parameters
  const [simParams, setSimParams] = useState<SimulationParameters>({
    isRunning: true,
    isPaused: false,
    simulationSpeed: 1,
    time: 0,
    selectedFuel: 'ts1',
    waterConcentrationPpm: 24, // TS-1 standard limit is 30 ppm
    fuelTemperature: 20, // 20 °C
    turbidityContamination: 8, // slight optical baseline turbidity
    opticalPathLengthMm: 15, // 15 mm optical cuvette
    opticalIntensityPercent: 100,
    
    // Teacher Demonstration Controls
    potentiometerResistance_kOhm: 20, // 20 kOhm nominal
    supplyVoltage: 12.0, // +12V nominal
    supplyCurrentLimit_mA: 250, // 250 mA limit
    supplyEnabled: true,
    led1Enabled: true,
    led2Enabled: true,
    opticalAlignmentPercent: 95,

    measWavelengthUm: 1.94,
    refWavelengthUm: 2.15,
    detectorResponsivity: 0.85,
    calibOffset: 0.0,
    calibSlope: 1.0,
    tempCompensationEnabled: true,
    turbidityCompensationEnabled: true,
  });

  // Stale result flag (when parameters change while paused)
  const [isStale, setIsStale] = useState<boolean>(false);

  // Collected measurement samples for Graph 2
  const [samples, setSamples] = useState<MeasurementSample[]>([]);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Active dataset depending on Stage
  const activeComponents = useMemo(() => {
    const list = stage === 'integrated' 
      ? INTEGRATED_COMPONENTS 
      : stage === 'analog' 
      ? ANALOG_COMPONENTS 
      : DIGITAL_COMPONENTS;
      
    return list.map(c => ({
      ...c,
      value: componentsState[c.id] !== undefined ? componentsState[c.id] : c.value,
    }));
  }, [stage, componentsState]);

  const activeNodes = useMemo(() => {
    return stage === 'integrated' 
      ? INTEGRATED_NODES 
      : stage === 'analog' 
      ? ANALOG_NODES 
      : DIGITAL_NODES;
  }, [stage]);

  const activeWires = useMemo(() => {
    return stage === 'integrated' 
      ? INTEGRATED_WIRES 
      : stage === 'analog' 
      ? ANALOG_WIRES 
      : DIGITAL_WIRES;
  }, [stage]);

  const selectedComponent = useMemo(() => {
    return activeComponents.find(c => c.id === selectedComponentId) || null;
  }, [activeComponents, selectedComponentId]);

  // Real-time Electrical & Optical Operating Point
  const operatingPoint = useMemo(() => {
    return calculateCircuitOperatingPoint(simParams, componentsState, simulationTime);
  }, [simParams, componentsState, simulationTime]);

  // Main simulation timer loop
  useEffect(() => {
    if (!isRunning || isPaused) return;

    let animId: number;
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const dt = (stamp - lastStamp) / 1000;
      lastStamp = stamp;

      setSimulationTime(prev => prev + dt * simulationSpeed);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, isPaused, simulationSpeed]);

  // Accumulate samples into buffer when running (for Graph 2)
  useEffect(() => {
    if (!isRunning || isPaused) return;

    const sampleInterval = setInterval(() => {
      setSamples(prev => {
        const newSample: MeasurementSample = {
          timestamp: Date.now(),
          channelAVoltage: operatingPoint.vChA_out,
          channelBVoltage: operatingPoint.vChB_out,
          transmittanceRatio: operatingPoint.transmittanceRatio,
          absorbanceDelta: -Math.log(Math.max(0.01, operatingPoint.transmittanceRatio)),
          rawPpm: operatingPoint.rawPpm,
          compensatedPpm: operatingPoint.compensatedPpm,
          temperature: simParams.fuelTemperature,
          snrDb: operatingPoint.snrDb,
        };
        const next = [...prev, newSample];
        return next.length > 150 ? next.slice(-150) : next;
      });
    }, 200);

    return () => clearInterval(sampleInterval);
  }, [isRunning, isPaused, operatingPoint, simParams.fuelTemperature]);

  // Toolbar Handlers
  const handleRun = () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsStale(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsStale(false);
  };

  const handleRestart = () => {
    setIsRunning(true);
    setIsPaused(false);
    setIsStale(false);
    setSimulationTime(0);
    setSamples([]);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(2.5, prev * 1.15));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.4, prev * 0.85));
  };

  const handleFitScreen = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleStageChange = (newStage: CircuitStage) => {
    setStage(newStage);
    setSelectedComponentId(newStage === 'integrated' ? 'POT_RP1' : newStage === 'analog' ? 'FD' : 'GEN1');
    // Keep URL in sync
    const url = newStage === 'digital' ? '/about.html' : newStage === 'analog' ? '/?analog' : '/';
    if (window.history.pushState) {
      window.history.pushState({ stage: newStage }, '', url);
    }
  };

  // Component Parameter Update Handler
  const handleUpdateComponentValue = (id: string, val: number) => {
    setComponentsState(prev => ({
      ...prev,
      [id]: val,
    }));
    // Sync with simParams if POT_RP1 or PSU changed
    if (id === 'POT_RP1') {
      setSimParams(prev => ({ ...prev, potentiometerResistance_kOhm: val }));
    } else if (id === 'PSU') {
      setSimParams(prev => ({ ...prev, supplyVoltage: val }));
    }
    if (isPaused) {
      setIsStale(true);
    }
  };

  const handleResetComponentValue = (id: string) => {
    const comp = [...INTEGRATED_COMPONENTS, ...ANALOG_COMPONENTS, ...DIGITAL_COMPONENTS].find(c => c.id === id);
    if (comp) {
      setComponentsState(prev => ({
        ...prev,
        [id]: comp.defaultValue,
      }));
      if (id === 'POT_RP1') {
        setSimParams(prev => ({ ...prev, potentiometerResistance_kOhm: comp.defaultValue }));
      } else if (id === 'PSU') {
        setSimParams(prev => ({ ...prev, supplyVoltage: comp.defaultValue }));
      }
      if (isPaused) {
        setIsStale(true);
      }
    }
  };

  const handleUpdateSimParams = (updates: Partial<SimulationParameters>) => {
    setSimParams(prev => ({
      ...prev,
      ...updates,
    }));
    if (updates.potentiometerResistance_kOhm !== undefined) {
      setComponentsState(prev => ({ ...prev, POT_RP1: updates.potentiometerResistance_kOhm! }));
    }
    if (updates.supplyVoltage !== undefined) {
      setComponentsState(prev => ({ ...prev, PSU: updates.supplyVoltage! }));
    }
    if (isPaused) {
      setIsStale(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Laboratory Ribbon */}
      <TopToolbar
        stage={stage}
        onStageChange={handleStageChange}
        isRunning={isRunning}
        isPaused={isPaused}
        onRun={handleRun}
        onPause={handlePause}
        onRestart={handleRestart}
        simulationSpeed={simulationSpeed}
        onSpeedChange={setSimulationSpeed}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitScreen={handleFitScreen}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* Main Laboratory Workspace */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-5 space-y-5">
        
        {/* Upper Stage: Circuit Schematic & Collapsible Inspector */}
        <section className="flex flex-col lg:flex-row gap-4 items-stretch">
          
          {/* Main Circuit Viewport */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {stage === 'integrated'
                    ? 'BIRLASHTIRILGAN TIZIM: POTENTSIOMETR (RP1) + G1 + DRAYVERLAR + DUAL IR LED (ИД1/ИД2) + OPTIKA + ANALOG KUCHAYTIRGICH'
                    : stage === 'analog'
                    ? 'A-SXEMA: ANALOG KUCHAYTIRISH VA OPTIK QABUL QILUVCHI ZANJIR'
                    : 'B-SXEMA: RAQAMLI SINXRONIZATSIYA, DRAYVERLAR VA DSP MODULI'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Sichqoncha bilan siljiting (Drag) · G'ildirak bilan masshtablang (Scroll) · Sim ustiga keltiring
              </div>
            </div>

            <CircuitCanvas
              stage={stage}
              components={activeComponents}
              nodes={activeNodes}
              wires={activeWires}
              selectedComponentId={selectedComponentId}
              onSelectComponent={(comp) => setSelectedComponentId(comp.id)}
              operatingPoint={operatingPoint}
              isRunning={isRunning}
              isPaused={isPaused}
              simulationTime={simulationTime}
              simulationSpeed={simulationSpeed}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              panOffset={panOffset}
              setPanOffset={setPanOffset}
            />
          </div>

          {/* Component Information & Parameter Inspector Panel */}
          <ComponentInspector
            component={selectedComponent}
            onClose={() => setSelectedComponentId(null)}
            onUpdateValue={handleUpdateComponentValue}
            onResetValue={handleResetComponentValue}
            operatingPoint={operatingPoint}
          />

        </section>

        {/* Middle Stage: Dual-Wavelength Measurement & Compensation Engine */}
        <section>
          <FuelMeasurementPanel
            params={simParams}
            onUpdateParams={handleUpdateSimParams}
            operatingPoint={operatingPoint}
          />
        </section>

        {/* Lower Stage: Two Live Engineering Graphs (Graph 1 & Graph 2) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Graph 1: Live Spectral / Waveform Analysis (O'tkazish spektri) */}
          <LiveAnalysisGraph
            isRunning={isRunning}
            isPaused={isPaused}
            simulationTime={simulationTime}
            simulationSpeed={simulationSpeed}
            operatingPoint={operatingPoint}
            params={simParams}
            isDarkMode={isDarkMode}
            onResumeAcquisition={handleResume}
            onRestartAcquisition={handleRestart}
            isStale={isStale}
          />

          {/* Graph 2: Measurement Result & Statistical Calibration Curve */}
          <MeasurementResultGraph
            samples={samples}
            isPaused={isPaused}
            isRunning={isRunning}
            simulationTime={simulationTime}
            simulationSpeed={simulationSpeed}
            operatingPoint={operatingPoint}
            selectedFuelId={simParams.selectedFuel}
            isDarkMode={isDarkMode}
            isStale={isStale}
          />
        </section>

      </main>

      {/* University Laboratory Protocol Defense Modal */}
      <LabReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        params={simParams}
        operatingPoint={operatingPoint}
        sampleCount={samples.length}
      />

    </div>
  );
}
