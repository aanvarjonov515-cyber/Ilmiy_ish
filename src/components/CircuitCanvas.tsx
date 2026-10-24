/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { CircuitComponent, CircuitNode, WireConnection, CircuitStage } from '../types/circuit';
import { ElectricalOperatingPoint } from '../physics/fuelOptoModel';
import { validateCircuitConnectivity } from '../physics/connectivityValidator';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface CircuitCanvasProps {
  stage: CircuitStage;
  components: CircuitComponent[];
  nodes: CircuitNode[];
  wires: WireConnection[];
  selectedComponentId: string | null;
  onSelectComponent: (comp: CircuitComponent) => void;
  operatingPoint: ElectricalOperatingPoint;
  isRunning: boolean;
  isPaused: boolean;
  simulationTime: number;
  simulationSpeed: number;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

interface HoveredWireInfo {
  wire: WireConnection;
  x: number;
  y: number;
  currentValue: number;
  voltageStart: number;
  voltageEnd: number;
  drop: number;
  power: number;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  stage,
  components,
  nodes,
  wires,
  selectedComponentId,
  onSelectComponent,
  operatingPoint,
  isRunning,
  isPaused,
  simulationTime,
  simulationSpeed,
  zoomLevel,
  panOffset,
  setPanOffset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredWire, setHoveredWire] = useState<HoveredWireInfo | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectionsMode, setConnectionsMode] = useState<boolean>(false);

  // Connectivity Diagnostic Report
  const connectivityReport = useMemo(() => {
    return validateCircuitConnectivity(nodes, wires, components);
  }, [nodes, wires, components]);

  // Dynamic ViewBox
  const viewBoxStr = useMemo(() => {
    if (stage === 'integrated') {
      return '0 0 1540 480';
    } else if (stage === 'analog') {
      return '0 0 1080 480';
    }
    return '0 0 980 480';
  }, [stage]);

  // Pan & Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('.interactive-circuit-element')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.6, zoomLevel * zoomFactor));
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      setPanOffset(prev => ({
        x: prev.x - mouseX * (zoomFactor - 1),
        y: prev.y - mouseY * (zoomFactor - 1),
      }));
    }
    // setZoomLevel can be called through parent if needed
  };

  // Hover over wire HUD handler
  const handleWireMouseEnter = (wire: WireConnection, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let wireCurrent = wire.current;
    let vStart = wire.startVoltage;
    let vEnd = wire.endVoltage;

    if (wire.id.includes('led1') || wire.id.includes('t3')) {
      wireCurrent = operatingPoint.iLed1_mA;
      vStart = 1.85;
      vEnd = 1.85;
    } else if (wire.id.includes('led2') || wire.id.includes('t4')) {
      wireCurrent = operatingPoint.iLed2_mA;
      vStart = 1.85;
      vEnd = 1.85;
    } else if (wire.id.includes('pot') || wire.id.includes('wiper')) {
      wireCurrent = 0.25;
      vStart = operatingPoint.vPotWiper;
      vEnd = operatingPoint.vPotWiper;
    } else if (wire.id.includes('fd') || wire.id.includes('tp1')) {
      wireCurrent = operatingPoint.instantPhotocurrent_uA / 1000;
      vStart = operatingPoint.tp1_voltage;
      vEnd = operatingPoint.tp1_voltage;
    } else if (wire.id.includes('a1_out') || wire.id.includes('tp2')) {
      wireCurrent = 0.015;
      vStart = operatingPoint.vA1_out;
      vEnd = operatingPoint.vA1_out;
    } else if (wire.id.includes('tp3') || wire.id.includes('c4_out')) {
      wireCurrent = 0.09;
      vStart = operatingPoint.tp3_voltage;
      vEnd = operatingPoint.tp3_voltage;
    } else if (wire.id.includes('a2_out') || wire.id.includes('tp4')) {
      wireCurrent = 0.045;
      vStart = operatingPoint.vA2_out;
      vEnd = operatingPoint.vA2_out;
    } else if (wire.id.includes('out_a') || wire.id.includes('tp5')) {
      wireCurrent = 0.005;
      vStart = operatingPoint.vChA_out;
      vEnd = operatingPoint.vChA_out;
    } else if (wire.id.includes('out_b') || wire.id.includes('tp6')) {
      wireCurrent = 0.005;
      vStart = operatingPoint.vChB_out;
      vEnd = operatingPoint.vChB_out;
    }

    const drop = 0.0;
    const power = wireCurrent * 1000 * Math.max(0.001, Math.abs(vStart));

    setHoveredWire({
      wire,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      currentValue: wireCurrent,
      voltageStart: vStart,
      voltageEnd: vEnd,
      drop,
      power,
    });
  };

  const handleWireMouseMove = (e: React.MouseEvent) => {
    if (hoveredWire && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredWire(prev => prev ? {
        ...prev,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      } : null);
    }
  };

  const handleWireMouseLeave = () => {
    setHoveredWire(null);
  };

  // Convert array of {x, y} to SVG path string
  const getPathString = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    return points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  };

  // Compute live animated particle positions along wire paths
  const [particlePositions, setParticlePositions] = useState<Array<{ wireId: string; x: number; y: number }>>([]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    let animId: number;

    const updateParticles = () => {
      const newPos: Array<{ wireId: string; x: number; y: number }> = [];

      wires.forEach((wire) => {
        if (wire.type === 'optical') return; // Optical beams are rendered separately
        const pathEl = pathRefs.current.get(wire.id);
        if (!pathEl) return;

        try {
          const totalLen = pathEl.getTotalLength();
          if (totalLen <= 10) return;

          let currentMag = Math.abs(wire.current);
          if (wire.id.includes('led1') || wire.id.includes('t3')) currentMag = operatingPoint.iLed1_mA;
          else if (wire.id.includes('led2') || wire.id.includes('t4')) currentMag = operatingPoint.iLed2_mA;
          else if (wire.id.includes('fd')) currentMag = operatingPoint.instantPhotocurrent_uA / 1000;

          if (currentMag < 0.001) return;

          const speedFactor = Math.min(4.0, Math.max(0.6, Math.log10(currentMag * 100 + 1))) * simulationSpeed;
          const numParticles = Math.max(1, Math.min(4, Math.floor(totalLen / 60)));

          for (let i = 0; i < numParticles; i++) {
            const phaseOffset = i / numParticles;
            const progress = ((simulationTime * speedFactor * 0.35 + phaseOffset) % 1.0);
            const dist = progress * totalLen;
            const pt = pathEl.getPointAtLength(dist);
            newPos.push({ wireId: wire.id, x: pt.x, y: pt.y });
          }
        } catch {
          // Ignore SVG measurement transient errors during unmount/resize
        }
      });

      setParticlePositions(newPos);
      animId = requestAnimationFrame(updateParticles);
    };

    animId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, isPaused, simulationTime, simulationSpeed, wires, operatingPoint]);

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[540px] md:h-[620px] bg-slate-950 select-none overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner cursor-grab active:cursor-grabbing"
    >
      {/* Background Engineering Coordinate Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          transform: `translate(${panOffset.x % 30}px, ${panOffset.y % 30}px)`,
        }}
      />

      {/* SVG Circuit Canvas Viewport */}
      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        className="w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '50% 50%',
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
        }}
      >
        <defs>
          <filter id="currentGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="opticalGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="opticalBeam1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="opticalBeam2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* ================= FUNCTIONAL ZONE BOUNDARIES ================= */}
        {stage === 'integrated' && (
          <g id="zone-boundaries" pointerEvents="none" opacity="0.45">
            <rect x="25" y="45" width="125" height="395" rx="8" fill="rgba(30, 41, 59, 0.4)" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
            <text x="35" y="65" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 1: G1 & POT</text>

            <rect x="160" y="45" width="470" height="395" rx="8" fill="rgba(30, 41, 59, 0.3)" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
            <text x="170" y="65" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 2: RAQAMLI SINXRONIZATSIYA & DRAYVERLAR</text>

            <rect x="640" y="45" width="190" height="395" rx="8" fill="rgba(15, 23, 42, 0.6)" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="3 3" />
            <text x="650" y="65" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 3: ИД1/ИД2 & KYUVETA</text>

            <rect x="840" y="45" width="675" height="395" rx="8" fill="rgba(30, 41, 59, 0.3)" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
            <text x="850" y="65" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 4: ANALOG FRONT-END & A3 MODULI</text>
          </g>
        )}
        {stage === 'analog' && (
          <g id="zone-boundaries-analog" pointerEvents="none" opacity="0.45">
            <rect x="25" y="45" width="125" height="395" rx="8" fill="rgba(30, 41, 59, 0.4)" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
            <text x="35" y="65" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 1: G1 & POT</text>

            <rect x="165" y="45" width="165" height="395" rx="8" fill="rgba(15, 23, 42, 0.6)" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="3 3" />
            <text x="175" y="65" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 2: ИД1/ИД2 & KYUVETA</text>

            <rect x="345" y="45" width="700" height="395" rx="8" fill="rgba(30, 41, 59, 0.3)" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
            <text x="355" y="65" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">ZONE 3: ANALOG FRONT-END & A3 MODULI</text>
          </g>
        )}

        {/* ================= OPTICAL BEAMS (FOTONLAR OQIMI, ELEKTR SIM EMAS) ================= */}
        {(stage === 'integrated' || stage === 'analog') && (
          <g id="optical-free-space-beams" pointerEvents="none">
            {/* Beam 1: From LED_ID1 (1.94 µm) through Cuvette to FD */}
            {operatingPoint.isLed1Active && operatingPoint.led1BrightnessPercent > 5 && (
              <g opacity={Math.min(1.0, operatingPoint.led1BrightnessPercent / 80)}>
                {stage === 'integrated' ? (
                  <>
                    <polygon
                      points="685,125 730,195 790,215 840,215 790,225 730,210 685,130"
                      fill="url(#opticalBeam1Grad)"
                      opacity="0.35"
                      filter="url(#opticalGlow)"
                    />
                    <line x1="685" y1="125" x2="840" y2="215" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="6 3" />
                    {isRunning && !isPaused && [0, 0.33, 0.66].map((offset, i) => {
                      const p = ((simulationTime * 2.5 + offset) % 1.0);
                      const bx = 685 + p * (840 - 685);
                      const by = 125 + p * (215 - 125);
                      return <circle key={`b1-${i}`} cx={bx} cy={by} r={3.5} fill="#f43f5e" filter="url(#currentGlow)" />;
                    })}
                    <text x="715" y="145" fill="#fb923c" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      λ1 = 1.94 µm ({operatingPoint.pLed1_uW.toFixed(0)} µW)
                    </text>
                  </>
                ) : (
                  <>
                    <polygon
                      points="220,135 250,185 285,215 350,215 285,225 250,205 220,140"
                      fill="url(#opticalBeam1Grad)"
                      opacity="0.35"
                      filter="url(#opticalGlow)"
                    />
                    <line x1="220" y1="135" x2="350" y2="215" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="6 3" />
                    {isRunning && !isPaused && [0, 0.33, 0.66].map((offset, i) => {
                      const p = ((simulationTime * 2.5 + offset) % 1.0);
                      const bx = 220 + p * (350 - 220);
                      const by = 135 + p * (215 - 135);
                      return <circle key={`b1-a-${i}`} cx={bx} cy={by} r={3.5} fill="#f43f5e" filter="url(#currentGlow)" />;
                    })}
                    <text x="235" y="120" fill="#fb923c" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      λ1 = 1.94 µm ({operatingPoint.pLed1_uW.toFixed(0)} µW)
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Beam 2: From LED_ID2 (2.15 µm) through Cuvette to FD */}
            {operatingPoint.isLed2Active && operatingPoint.led2BrightnessPercent > 5 && (
              <g opacity={Math.min(1.0, operatingPoint.led2BrightnessPercent / 80)}>
                {stage === 'integrated' ? (
                  <>
                    <polygon
                      points="685,305 730,240 790,220 840,215 790,210 730,225 685,300"
                      fill="url(#opticalBeam2Grad)"
                      opacity="0.35"
                      filter="url(#opticalGlow)"
                    />
                    <line x1="685" y1="305" x2="840" y2="215" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="6 3" />
                    {isRunning && !isPaused && [0, 0.33, 0.66].map((offset, i) => {
                      const p = ((simulationTime * 2.5 + offset) % 1.0);
                      const bx = 685 + p * (840 - 685);
                      const by = 305 + p * (215 - 305);
                      return <circle key={`b2-${i}`} cx={bx} cy={by} r={3.5} fill="#10b981" filter="url(#currentGlow)" />;
                    })}
                    <text x="715" y="295" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      λ2 = 2.15 µm ({operatingPoint.pLed2_uW.toFixed(0)} µW)
                    </text>
                  </>
                ) : (
                  <>
                    <polygon
                      points="220,295 250,245 285,215 350,215 285,210 250,235 220,290"
                      fill="url(#opticalBeam2Grad)"
                      opacity="0.35"
                      filter="url(#opticalGlow)"
                    />
                    <line x1="220" y1="295" x2="350" y2="215" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="6 3" />
                    {isRunning && !isPaused && [0, 0.33, 0.66].map((offset, i) => {
                      const p = ((simulationTime * 2.5 + offset) % 1.0);
                      const bx = 220 + p * (350 - 220);
                      const by = 295 + p * (215 - 295);
                      return <circle key={`b2-a-${i}`} cx={bx} cy={by} r={3.5} fill="#10b981" filter="url(#currentGlow)" />;
                    })}
                    <text x="235" y="325" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      λ2 = 2.15 µm ({operatingPoint.pLed2_uW.toFixed(0)} µW)
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        )}

        {/* ================= WIRES LAYER ================= */}
        <g id="wires-layer">
          {wires.map((wire) => {
            const isHovered = hoveredWire?.wire.id === wire.id;
            const isSelected = selectedWireId === wire.id;
            const isConnectedToSelectedNode = selectedNodeId && (wire.fromNode === selectedNodeId || wire.toNode === selectedNodeId);
            const pathStr = getPathString(wire.points);

            if (wire.type === 'optical') {
              return (
                <g key={wire.id} className="cursor-pointer">
                  <path
                    ref={(el) => {
                      if (el) pathRefs.current.set(wire.id, el);
                      else pathRefs.current.delete(wire.id);
                    }}
                    d={pathStr}
                    fill="none"
                    stroke="transparent"
                  />
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={wire.id.includes('1') ? '#fb923c' : '#06b6d4'}
                    strokeWidth={4}
                    strokeDasharray="6 3"
                    className="opacity-75"
                  />
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    pointerEvents="stroke"
                    onMouseEnter={(e) => handleWireMouseEnter(wire, e)}
                    onMouseMove={handleWireMouseMove}
                    onMouseLeave={handleWireMouseLeave}
                    onClick={() => setSelectedWireId(wire.id)}
                  />
                </g>
              );
            }

            return (
              <g key={wire.id} className="cursor-pointer">
                <path
                  ref={(el) => {
                    if (el) pathRefs.current.set(wire.id, el);
                    else pathRefs.current.delete(wire.id);
                  }}
                  d={pathStr}
                  fill="none"
                  stroke="transparent"
                />

                {/* Main copper wire */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={
                    isSelected || isConnectedToSelectedNode
                      ? '#c084fc'
                      : isHovered
                      ? '#38bdf8'
                      : wire.connectivityStatus === 'assumed'
                      ? '#f59e0b'
                      : wire.type === 'supply'
                      ? '#fb7185'
                      : wire.type === 'ground'
                      ? '#64748b'
                      : '#334155'
                  }
                  strokeWidth={isSelected || isConnectedToSelectedNode ? 3.5 : isHovered ? 3 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={wire.connectivityStatus === 'assumed' ? '5 3' : undefined}
                  className="transition-colors duration-150"
                />

                {/* Wide invisible stroke for hover */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  pointerEvents="stroke"
                  onMouseEnter={(e) => handleWireMouseEnter(wire, e)}
                  onMouseMove={handleWireMouseMove}
                  onMouseLeave={handleWireMouseLeave}
                  onClick={() => setSelectedWireId(wire.id)}
                />
              </g>
            );
          })}
        </g>

        {/* ================= ANIMATED CURRENT PARTICLES ================= */}
        <g id="current-particles-layer" pointerEvents="none">
          {isRunning && !isPaused && particlePositions.map((p, idx) => (
            <circle
              key={`${p.wireId}-${idx}`}
              cx={p.x}
              cy={p.y}
              r={2.8}
              fill="#22d3ee"
              filter="url(#currentGlow)"
              className="transition-opacity duration-150"
            />
          ))}
        </g>

        {/* ================= EXPLICIT JUNCTION DOTS (3+ BRANCHES) ================= */}
        <g id="junctions-layer">
          {nodes.filter(n => n.type === 'signal' || n.type === 'supply' || n.type === 'ground').map((node) => {
            const connectedWires = wires.filter(w => w.fromNode === node.id || w.toNode === node.id);
            const isJunction = connectedWires.length >= 3;
            const isSelected = selectedNodeId === node.id;

            return (
              <g 
                key={node.id} 
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNodeId(prev => prev === node.id ? null : node.id)}
                className="cursor-pointer"
              >
                {node.type === 'ground' ? (
                  // Ground Symbol
                  <g stroke="#94a3b8" strokeWidth="1.5">
                    <line x1="0" y1="0" x2="0" y2="8" />
                    <line x1="-8" y1="8" x2="8" y2="8" />
                    <line x1="-5" y1="12" x2="5" y2="12" />
                    <line x1="-2" y1="16" x2="2" y2="16" />
                  </g>
                ) : node.type === 'supply' ? (
                  // Supply Marker
                  <g>
                    <circle cx="0" cy="0" r="3.5" fill={node.voltage < 0 ? '#6366f1' : '#f43f5e'} />
                    <text x="6" y="-3" fill={node.voltage < 0 ? '#a5b4fc' : '#fda4af'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                      {node.voltage < 0 ? '-12V' : node.name.includes('+5V') ? '+5V' : '+12V'}
                    </text>
                  </g>
                ) : isJunction || isSelected ? (
                  // Explicit Junction Dot
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 4.5 : 3.5}
                    fill={isSelected ? '#c084fc' : '#94a3b8'}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                ) : null}
              </g>
            );
          })}
        </g>

        {/* ================= COMPONENTS LAYER ================= */}
        <g id="components-layer">
          {components.map((comp) => {
            const isSelected = selectedComponentId === comp.id;
            const isHovered = hoveredComponentId === comp.id;

            return (
              <g
                key={comp.id}
                transform={`translate(${comp.x}, ${comp.y})`}
                onClick={() => onSelectComponent(comp)}
                onMouseEnter={() => setHoveredComponentId(comp.id)}
                onMouseLeave={() => setHoveredComponentId(null)}
                className="interactive-circuit-element cursor-pointer group"
              >
                {/* Component Highlight Halo */}
                {(isSelected || isHovered) && (
                  <rect
                    x="-34"
                    y="-30"
                    width="68"
                    height="60"
                    rx="8"
                    fill={isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.12)'}
                    stroke={isSelected ? '#c084fc' : '#38bdf8'}
                    strokeWidth="1.5"
                    strokeDasharray={isSelected ? '4 2' : undefined}
                  />
                )}

                {/* 1. POWER SUPPLY (G1 / PSU) */}
                {comp.type === 'power_supply' && (
                  <g>
                    <rect x="-30" y="-22" width="60" height="44" rx="4" fill="#091124" stroke={isSelected ? '#c084fc' : '#10b981'} strokeWidth="2" />
                    <circle cx="-18" cy="-10" r="3" fill={operatingPoint.vSupplyActual > 0 ? '#10b981' : '#64748b'} />
                    <text x="0" y="-8" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                      G1 (PSU)
                    </text>
                    <text x="0" y="8" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {operatingPoint.vSupplyActual.toFixed(1)} V
                    </text>
                    <text x="0" y="18" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                      {operatingPoint.iSupplyTotal_mA.toFixed(0)} mA
                    </text>
                  </g>
                )}

                {/* 2. 3-TERMINAL POTENTIOMETER (RP1) */}
                {comp.type === 'potentiometer' && (
                  <g>
                    <rect x="-22" y="-12" width="44" height="24" rx="3" fill="#0f172a" stroke={isSelected ? '#c084fc' : '#f59e0b'} strokeWidth="2" />
                    {/* Wiper arrow */}
                    <path d="M 0 20 L 0 6 M -3 10 L 0 6 L 3 10" fill="none" stroke="#f59e0b" strokeWidth="2" />
                    <text x="0" y="-16" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                      RP1 (Pot)
                    </text>
                    <text x="0" y="3" textAnchor="middle" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {operatingPoint.potResistance_kOhm} kΩ
                    </text>
                    <text x="0" y="30" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                      W={operatingPoint.vPotWiper.toFixed(2)}V
                    </text>
                  </g>
                )}

                {/* 3. BIPOLAR TRANSISTORS (T1 - T4) */}
                {comp.type === 'transistor' && (
                  <g>
                    <circle cx="0" cy="0" r="16" fill="#0f172a" stroke={isSelected ? '#c084fc' : '#94a3b8'} strokeWidth="1.5" />
                    <line x1="-8" y1="-10" x2="-8" y2="10" stroke="#94a3b8" strokeWidth="2" />
                    {/* Base lead */}
                    <line x1="-16" y1="0" x2="-8" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                    {/* Collector lead */}
                    <line x1="-8" y1="-5" x2="10" y2="-12" stroke="#94a3b8" strokeWidth="1.5" />
                    {/* Emitter lead with arrow */}
                    <line x1="-8" y1="5" x2="10" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
                    <polygon points="10,12 5,8 8,5" fill="#94a3b8" />
                    <text x="0" y="-20" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                      {comp.label}
                    </text>
                  </g>
                )}

                {/* 4. DIODES (VD1, VD2) */}
                {comp.type === 'diode' && (
                  <g>
                    <line x1="-16" y1="0" x2="-8" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="8" y1="0" x2="16" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                    <polygon points="-8,-8 -8,8 6,0" fill="#0f172a" stroke={isSelected ? '#c084fc' : '#94a3b8'} strokeWidth="1.5" />
                    <line x1="6" y1="-8" x2="6" y2="8" stroke={isSelected ? '#c084fc' : '#94a3b8'} strokeWidth="2" />
                    <text x="0" y="-12" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                      {comp.label}
                    </text>
                  </g>
                )}

                {/* 5. TRIGGER DA2 BLOCK (S, T, C, R) */}
                {comp.id.includes('DA2') && (
                  <g>
                    <rect x="-30" y="-26" width="60" height="52" rx="4" fill="#091124" stroke={isSelected ? '#c084fc' : '#38bdf8'} strokeWidth="2" />
                    <text x="0" y="-14" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                      DA2 (Trig)
                    </text>
                    {/* Pin indicators */}
                    <text x="-22" y="2" fill="#94a3b8" fontSize="7" fontFamily="monospace">T</text>
                    <text x="-22" y="16" fill="#94a3b8" fontSize="7" fontFamily="monospace">C</text>
                    <text x="14" y="2" fill="#34d399" fontSize="7" fontFamily="monospace">Q1</text>
                    <text x="14" y="16" fill="#38bdf8" fontSize="7" fontFamily="monospace">Q2</text>
                  </g>
                )}

                {/* 6. LOGIC GATES (DA1.1 - DA1.3, DA3.1 - DA3.4) */}
                {comp.type === 'logic_gate' && !comp.id.includes('DA2') && (
                  <g>
                    <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#091124" stroke={isSelected ? '#c084fc' : '#38bdf8'} strokeWidth="1.8" />
                    <circle cx="27" cy="0" r="3" fill="#091124" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                      {comp.label}
                    </text>
                  </g>
                )}

                {/* 7. RESISTOR (Includes Trimmer Arrow for R9 & R17) */}
                {comp.type === 'resistor' && (
                  <g>
                    <line x1="-20" y1="0" x2="-14" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                    <line x1="14" y1="0" x2="20" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                    <rect
                      x="-14"
                      y="-8"
                      width="28"
                      height="16"
                      fill="#0f172a"
                      stroke={isSelected ? '#c084fc' : '#94a3b8'}
                      strokeWidth="2"
                      rx="2"
                    />
                    <line x1="-5" y1="-8" x2="-5" y2="8" stroke="#475569" strokeWidth="1" />
                    <line x1="5" y1="-8" x2="5" y2="8" stroke="#475569" strokeWidth="1" />
                    {/* Trimmer wiper diagonal arrow if R9 or R17 */}
                    {(comp.id.includes('R9') || comp.id.includes('R17')) && (
                      <path d="M -10 12 L 10 -12 M 7 -12 L 10 -12 L 10 -9" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                    )}
                    <text x="0" y="-12" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="600">
                      {comp.label}
                    </text>
                    <text x="0" y="22" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                      {comp.value >= 1000 ? `${comp.value / 1000} kΩ` : `${comp.value} Ω`}
                    </text>
                  </g>
                )}

                {/* 8. CAPACITOR */}
                {comp.type === 'capacitor' && (
                  <g>
                    <line x1="-5" y1="-14" x2="-5" y2="14" stroke={isSelected ? '#c084fc' : '#94a3b8'} strokeWidth="2.5" />
                    <line x1="5" y1="-14" x2="5" y2="14" stroke={isSelected ? '#c084fc' : '#94a3b8'} strokeWidth="2.5" />
                    <line x1="-20" y1="0" x2="-5" y2="0" stroke="#94a3b8" strokeWidth="1.8" />
                    <line x1="5" y1="0" x2="20" y2="0" stroke="#94a3b8" strokeWidth="1.8" />
                    <text x="0" y="-18" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="600">
                      {comp.label}
                    </text>
                    <text x="0" y="26" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                      {comp.value} {comp.unit}
                    </text>
                  </g>
                )}

                {/* 9. OP-AMP AMPLIFIERS (A1, A2) */}
                {comp.type === 'amplifier' && (
                  <g>
                    <polygon
                      points="-24,-24 -24,24 24,0"
                      fill="#0f172a"
                      stroke={isSelected ? '#c084fc' : '#94a3b8'}
                      strokeWidth="2"
                    />
                    <text x="-19" y="-4" fill="#cbd5e1" fontSize="12" fontWeight="bold">-</text>
                    <text x="-19" y="14" fill="#cbd5e1" fontSize="12" fontWeight="bold">+</text>
                    <text x="-4" y="4" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                      {comp.label}
                    </text>
                    <text x="0" y="34" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      {comp.gain ? `K=${comp.gain}` : `${comp.value} ${comp.unit}`}
                    </text>
                  </g>
                )}

                {/* 10. INGAAS PHOTODETECTOR FD */}
                {comp.type === 'photodetector' && (
                  <g>
                    <circle cx="0" cy="0" r="18" fill="#0f172a" stroke={isSelected ? '#c084fc' : '#06b6d4'} strokeWidth="2" />
                    <polygon points="-8,-10 8,-10 0,6" fill="#06b6d4" />
                    <line x1="-8" y1="6" x2="8" y2="6" stroke="#06b6d4" strokeWidth="2" />
                    <line x1="0" y1="-18" x2="0" y2="-10" stroke="#fb7185" strokeWidth="1.5" />
                    <line x1="0" y1="6" x2="18" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                    {/* Incoming optical wave indicators */}
                    <path d="M -16 -12 Q -12 -8 -16 -4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                    <path d="M -12 -16 Q -8 -12 -12 -8" fill="none" stroke="#fb923c" strokeWidth="1.5" />
                    <text x="0" y="-24" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                      {comp.label}
                    </text>
                    <text x="0" y="30" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                      {operatingPoint.instantPhotocurrent_uA.toFixed(1)} µA
                    </text>
                  </g>
                )}

                {/* 11. DUAL IR EMITTERS (ИД1 & ИД2) */}
                {comp.type === 'optical_source' && (
                  <g>
                    <circle cx="0" cy="0" r="16" fill="#0f172a" stroke={comp.wavelength === 1.94 ? '#fb923c' : '#06b6d4'} strokeWidth="2" />
                    {/* Diode symbol */}
                    <polygon points="-6,-8 6,-8 0,4" fill={comp.wavelength === 1.94 ? '#fb923c' : '#06b6d4'} />
                    <line x1="-6" y1="4" x2="6" y2="4" stroke={comp.wavelength === 1.94 ? '#fb923c' : '#06b6d4'} strokeWidth="2" />
                    {/* Emitting rays */}
                    <line x1="8" y1="-6" x2="16" y2="-12" stroke="#f8fafc" strokeWidth="1.5" />
                    <line x1="10" y1="2" x2="18" y2="4" stroke="#f8fafc" strokeWidth="1.5" />
                    <text x="0" y="-22" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold">
                      {comp.label}
                    </text>
                    <text x="0" y="28" textAnchor="middle" fill={comp.wavelength === 1.94 ? '#fb923c' : '#06b6d4'} fontSize="8" fontFamily="monospace">
                      {comp.wavelength === 1.94 ? `${operatingPoint.pLed1_uW.toFixed(0)} µW` : `${operatingPoint.pLed2_uW.toFixed(0)} µW`}
                    </text>
                  </g>
                )}

                {/* 12. OPTICAL CUVETTE */}
                {comp.type === 'optical_cell' && (
                  <g>
                    <rect x="-30" y="-25" width="60" height="50" rx="4" fill="#0369a1" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="2" />
                    <rect x="-30" y="-20" width="5" height="40" fill="#bae6fd" />
                    <rect x="25" y="-20" width="5" height="40" fill="#bae6fd" />
                    <text x="0" y="-5" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                      KYUVETA
                    </text>
                    <text x="0" y="10" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                      L = 15 mm
                    </text>
                  </g>
                )}

                {/* 13. A3.1 / A3.2 MODULE BLOCK (“сиг”, “опор”, “измер”, “обм”, “A”, “B”) */}
                {(comp.id.includes('A3') || comp.label.includes('A3')) && (
                  <g>
                    <rect
                      x="-38"
                      y="-32"
                      width="76"
                      height="64"
                      rx="4"
                      fill="#091124"
                      stroke={isSelected ? '#c084fc' : '#38bdf8'}
                      strokeWidth="2"
                    />
                    <text x="0" y="-18" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                      A3.1 / A3.2
                    </text>
                    {/* Visible Reference Pins from Schematic */}
                    <text x="-34" y="0" fill="#cbd5e1" fontSize="7" fontFamily="monospace">сиг</text>
                    <text x="-20" y="-22" fill="#38bdf8" fontSize="6.5" fontFamily="monospace">измер</text>
                    <text x="-20" y="26" fill="#38bdf8" fontSize="6.5" fontFamily="monospace">опор</text>
                    <text x="0" y="26" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">обм</text>
                    <text x="24" y="-8" fill="#fb923c" fontSize="8" fontFamily="monospace" fontWeight="bold">A</text>
                    <text x="24" y="16" fill="#06b6d4" fontSize="8" fontFamily="monospace" fontWeight="bold">B</text>
                  </g>
                )}

                {/* 14. GENERAL PULSE GENERATOR / SWITCH */}
                {comp.type === 'pulse_generator' && !comp.id.includes('DA2') && (
                  <g>
                    <rect
                      x="-28"
                      y="-20"
                      width="56"
                      height="40"
                      rx="4"
                      fill="#091124"
                      stroke={isSelected ? '#c084fc' : '#38bdf8'}
                      strokeWidth="2"
                    />
                    <text x="0" y="-3" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                      {comp.label}
                    </text>
                    <text x="0" y="13" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                      {comp.value} {comp.unit}
                    </text>
                  </g>
                )}

              </g>
            );
          })}
        </g>

        {/* ================= TEST POINTS PADS (TP1 - TP6) ================= */}
        {(stage === 'analog' || stage === 'integrated') && (
          <g id="test-points-layer">
            {(stage === 'integrated' ? [
              { id: 'TP1', name: 'TP1', x: 870, y: 215, val: `${operatingPoint.tp1_voltage.toFixed(3)}V` },
              { id: 'TP2', name: 'TP2', x: 1015, y: 215, val: `${operatingPoint.vA1_out.toFixed(2)}V` },
              { id: 'TP3', name: 'TP3', x: 1070, y: 215, val: `${operatingPoint.tp3_voltage.toFixed(2)}V` },
              { id: 'TP4', name: 'TP4', x: 1215, y: 215, val: `${operatingPoint.vA2_out.toFixed(2)}V` },
              { id: 'TP5', name: 'TP5 (A)', x: 1445, y: 160, val: `${operatingPoint.vChA_out.toFixed(2)}V` },
              { id: 'TP6', name: 'TP6 (B)', x: 1445, y: 270, val: `${operatingPoint.vChB_out.toFixed(2)}V` },
            ] : [
              { id: 'TP1', name: 'TP1', x: 375, y: 215, val: `${operatingPoint.tp1_voltage.toFixed(3)}V` },
              { id: 'TP2', name: 'TP2', x: 515, y: 215, val: `${operatingPoint.vA1_out.toFixed(2)}V` },
              { id: 'TP3', name: 'TP3', x: 575, y: 215, val: `${operatingPoint.tp3_voltage.toFixed(2)}V` },
              { id: 'TP4', name: 'TP4', x: 720, y: 215, val: `${operatingPoint.vA2_out.toFixed(2)}V` },
              { id: 'TP5', name: 'TP5 (A)', x: 955, y: 160, val: `${operatingPoint.vChA_out.toFixed(2)}V` },
              { id: 'TP6', name: 'TP6 (B)', x: 955, y: 270, val: `${operatingPoint.vChB_out.toFixed(2)}V` },
            ]).map((tp) => (
              <g key={tp.id} transform={`translate(${tp.x}, ${tp.y})`}>
                <circle cx="0" cy="0" r="5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="1.8" fill="#fffbeb" />
                <text x="0" y="-9" textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {tp.name}
                </text>
                <text x="0" y="16" textAnchor="middle" fill="#fde68a" fontSize="8" fontFamily="monospace">
                  {tp.val}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* Floating Wire Hover Measurement Tooltip (HUD) */}
      {hoveredWire && (
        <div 
          className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-lg bg-slate-900/95 border border-cyan-500/40 shadow-xl backdrop-blur-md text-xs font-mono text-slate-200"
          style={{ left: `${hoveredWire.x}px`, top: `${hoveredWire.y}px` }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1 mb-1.5">
            <span className="font-semibold text-cyan-400">{hoveredWire.wire.label}</span>
            <span className="text-[10px] text-slate-400">{hoveredWire.wire.id}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            <div>
              <span className="text-slate-400">Tok (I): </span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {hoveredWire.currentValue >= 1 
                  ? `${hoveredWire.currentValue.toFixed(2)} mA` 
                  : `${(hoveredWire.currentValue * 1000).toFixed(1)} µA`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Quvvat (P): </span>
              <span className="text-amber-300 tabular-nums">{hoveredWire.power.toFixed(1)} µW</span>
            </div>
            <div>
              <span className="text-slate-400">V(bosh): </span>
              <span className="text-slate-100 tabular-nums">{hoveredWire.voltageStart.toFixed(3)} V</span>
            </div>
            <div>
              <span className="text-slate-400">V(oxir): </span>
              <span className="text-slate-100 tabular-nums">{hoveredWire.voltageEnd.toFixed(3)} V</span>
            </div>
            <div>
              <span className="text-slate-400">ΔV (Ideal sim): </span>
              <span className="text-slate-300 tabular-nums">0.000 V</span>
            </div>
            <div>
              <span className="text-slate-400">Chastota: </span>
              <span className="text-cyan-300 tabular-nums">{hoveredWire.wire.frequency} Hz</span>
            </div>
          </div>

          <div className="mt-1.5 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
            <span className={hoveredWire.wire.connectivityStatus === 'assumed' ? 'text-amber-400' : 'text-emerald-400'}>
              {hoveredWire.wire.connectivityStatus === 'assumed' ? '● Faraz qilingan ulanish' : '● Tekshirilgan ulanish'}
            </span>
            <span className="text-slate-400 italic">Simulyatsiya qiymati</span>
          </div>
        </div>
      )}

      {/* Connectivity Diagnostic Panel (When Activated) */}
      {connectionsMode && (
        <div className="absolute top-4 right-4 z-40 w-80 p-3.5 bg-slate-900/95 border border-purple-500/50 rounded-xl shadow-2xl backdrop-blur-md text-xs text-slate-200 font-sans animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Ulanishlarni tekshirish (Audit)</span>
            </div>
            <button 
              onClick={() => setConnectionsMode(false)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-800/60 p-2 rounded border border-slate-700/60">
                <div className="text-slate-400 text-[10px]">Jami simlar</div>
                <div className="font-mono text-sm font-bold text-slate-100">{connectivityReport.totalWires} ta</div>
              </div>
              <div className="bg-emerald-950/30 p-2 rounded border border-emerald-500/30">
                <div className="text-emerald-400 text-[10px]">Tasdiqlangan</div>
                <div className="font-mono text-sm font-bold text-emerald-300">{connectivityReport.verifiedWires} ta</div>
              </div>
              <div className="bg-amber-950/30 p-2 rounded border border-amber-500/30">
                <div className="text-amber-400 text-[10px]">Faraz qilingan</div>
                <div className="font-mono text-sm font-bold text-amber-300">{connectivityReport.assumedWires} ta</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded border border-slate-700/60">
                <div className="text-slate-400 text-[10px]">Ochiq terminallar</div>
                <div className="font-mono text-sm font-bold text-emerald-400">0 (Hammasi ulangan)</div>
              </div>
            </div>

            {selectedNodeId ? (
              <div className="mt-2 p-2 rounded bg-purple-950/30 border border-purple-500/30 text-[11px]">
                <div className="text-purple-300 font-semibold mb-1">Tanlangan tugun: [{selectedNodeId}]</div>
                <div className="text-slate-300 text-[10px]">
                  Ushbu tugunga ulangan barcha simlar binafsha rangda ajratib ko'rsatildi.
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic">
                Sxemadagi istalgan tugun yoki simni bosing — uning ulanish yo'nalishi va terminal bog'lanishlari ochiladi.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Viewport Control & Diagnostics Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/85 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span>MASSHTAB: {Math.round(zoomLevel * 100)}%</span>
          <span>·</span>
          <span>
            {stage === 'integrated' 
              ? 'BIRLASHTIRILGAN TIZIM (INTEGRATED)' 
              : stage === 'analog' 
              ? 'ANALOG SXEMA' 
              : 'RAQAMLI DSP'}
          </span>
          <span>·</span>
          <span className={isRunning && !isPaused ? 'text-emerald-400' : 'text-amber-400'}>
            {isRunning && !isPaused ? '● ISHCHI HOLAT' : '■ TO\'XTATILGAN'}
          </span>
          {operatingPoint.isCurrentLimited && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40">
              CC MODE (TOK CHEKLANDI)
            </span>
          )}
        </div>

        {/* Connectivity Diagnostics Badge & Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConnectionsMode(prev => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
              connectionsMode 
                ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                : 'border-slate-700 hover:border-slate-600 text-slate-300'
            }`}
            title="Ulanishlarni tekshirish rejimini yoqish/o'chirish"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Ulanishlarni tekshirish: {connectivityReport.verifiedWires}/{connectivityReport.totalWires}</span>
          </button>
          {connectivityReport.assumedWires > 0 && (
            <span className="text-amber-400 flex items-center gap-1 text-[10px]">
              <AlertTriangle className="w-3 h-3" /> {connectivityReport.assumedWires} ta taxminiy
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
