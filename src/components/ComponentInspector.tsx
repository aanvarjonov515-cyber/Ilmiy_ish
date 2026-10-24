/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CircuitComponent } from '../types/circuit';
import { ElectricalOperatingPoint } from '../physics/fuelOptoModel';
import { Sliders, RotateCcw, AlertTriangle, CheckCircle, Info, ChevronRight, X } from 'lucide-react';

interface ComponentInspectorProps {
  component: CircuitComponent | null;
  onClose: () => void;
  onUpdateValue: (id: string, newValue: number) => void;
  onResetValue: (id: string) => void;
  operatingPoint: ElectricalOperatingPoint;
}

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  component,
  onClose,
  onUpdateValue,
  onResetValue,
  operatingPoint,
}) => {
  if (!component) {
    return (
      <aside className="w-full lg:w-80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-col items-center justify-center text-center text-slate-400 min-h-[380px]">
        <Info className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Komponent tanlanmagan</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Sxemadagi istalgan elementni (FD, R1, C1, A1, A2...) bosing va uning ilmiy pasportini ko'ring
        </p>
      </aside>
    );
  }

  // Calculate live dynamic electrical characteristics based on component type
  let liveCurrent_mA = 0;
  let liveVoltage_V = 0;
  let livePower_uW = 0;
  let liveCharge_nC = 0;
  let liveEnergy_uJ = 0;
  let liveTau_ms = 0;
  let isSaturated = false;

  if (component.id === 'POT_RP1') {
    liveVoltage_V = operatingPoint.vPotWiper;
    liveCurrent_mA = 0.25;
    livePower_uW = 1250;
  } else if (component.id === 'PSU') {
    liveVoltage_V = operatingPoint.vSupplyActual;
    liveCurrent_mA = operatingPoint.iSupplyTotal_mA;
    livePower_uW = operatingPoint.supplyPower_mW * 1000;
    isSaturated = operatingPoint.isCurrentLimited;
  } else if (component.id === 'LED_ID1' || component.id.includes('ID1')) {
    liveVoltage_V = operatingPoint.isLed1Active ? 1.85 : 0;
    liveCurrent_mA = operatingPoint.iLed1_mA;
    livePower_uW = operatingPoint.pLed1_uW;
  } else if (component.id === 'LED_ID2' || component.id.includes('ID2')) {
    liveVoltage_V = operatingPoint.isLed2Active ? 1.85 : 0;
    liveCurrent_mA = operatingPoint.iLed2_mA;
    livePower_uW = operatingPoint.pLed2_uW;
  } else if (component.type === 'diode') {
    liveVoltage_V = 0.7;
    liveCurrent_mA = 0.15;
    livePower_uW = 105;
  } else if (component.type === 'logic_gate' || component.id.includes('DA2')) {
    liveVoltage_V = 3.3;
    liveCurrent_mA = component.id.includes('DA2') ? 2.5 : 1.2;
    livePower_uW = liveVoltage_V * liveCurrent_mA * 1000;
  } else if (component.type === 'transistor') {
    const isPowerStage = component.id.includes('T3') || component.id.includes('T4');
    liveVoltage_V = isPowerStage ? 1.85 : 3.3;
    liveCurrent_mA = component.id.includes('T3') ? operatingPoint.iLed1_mA : component.id.includes('T4') ? operatingPoint.iLed2_mA : 1.5;
    livePower_uW = liveVoltage_V * liveCurrent_mA * 1000;
  } else if (component.type === 'resistor') {
    if (component.id.includes('R1') && !component.id.includes('R10') && !component.id.includes('R11') && !component.id.includes('R12') && !component.id.includes('R13') && !component.id.includes('R14') && !component.id.includes('R15') && !component.id.includes('R16') && !component.id.includes('R17')) {
      liveCurrent_mA = operatingPoint.instantPhotocurrent_uA / 1000;
      liveVoltage_V = Math.abs(operatingPoint.vA1_out);
    } else if (component.id.includes('R2')) {
      liveVoltage_V = Math.abs(operatingPoint.tp3_voltage);
      liveCurrent_mA = (liveVoltage_V / (component.value || 1)) * 1000;
    } else if (component.id.includes('R3')) {
      liveVoltage_V = Math.abs(operatingPoint.tp3_voltage);
      liveCurrent_mA = (liveVoltage_V / (component.value || 1)) * 1000;
    } else if (component.id.includes('R4')) {
      liveVoltage_V = Math.abs(operatingPoint.vA2_out);
      liveCurrent_mA = (liveVoltage_V / (component.value || 1)) * 1000;
    } else if (component.id.includes('R5')) {
      liveVoltage_V = operatingPoint.vChA_out;
      liveCurrent_mA = 0.002;
    } else if (component.id.includes('R6')) {
      liveVoltage_V = operatingPoint.vChB_out;
      liveCurrent_mA = 0.002;
    } else if (component.id.includes('R9')) {
      liveCurrent_mA = operatingPoint.iLed1_mA;
      liveVoltage_V = (liveCurrent_mA / 1000) * (component.value || 47);
    } else if (component.id.includes('R17')) {
      liveCurrent_mA = operatingPoint.iLed2_mA;
      liveVoltage_V = (liveCurrent_mA / 1000) * (component.value || 47);
    } else {
      liveVoltage_V = 3.3;
      liveCurrent_mA = (liveVoltage_V / (component.value || 1000)) * 1000;
    }
    livePower_uW = (liveVoltage_V * liveVoltage_V / (component.value || 1)) * 1e6;
  } else if (component.type === 'capacitor') {
    if (component.id.includes('C1')) {
      liveVoltage_V = Math.abs(operatingPoint.vA1_out);
      liveCharge_nC = (component.value * 1e-12) * liveVoltage_V * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-12) * Math.pow(liveVoltage_V, 2) * 1e6;
      liveTau_ms = (100000 * component.value * 1e-12) * 1000;
    } else if (component.id.includes('C2')) {
      liveVoltage_V = Math.abs(operatingPoint.vA1_out);
      liveCharge_nC = (component.value * 1e-6) * liveVoltage_V * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-6) * Math.pow(liveVoltage_V, 2) * 1e6;
      liveTau_ms = (10000 * component.value * 1e-6) * 1000;
    } else if (component.id.includes('C3')) {
      liveVoltage_V = Math.abs(operatingPoint.vA2_out);
      liveCharge_nC = (component.value * 1e-12) * liveVoltage_V * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-12) * Math.pow(liveVoltage_V, 2) * 1e6;
      liveTau_ms = (47000 * component.value * 1e-12) * 1000;
    } else if (component.id.includes('C4')) {
      liveVoltage_V = Math.abs(operatingPoint.tp3_voltage);
      liveCharge_nC = (component.value * 1e-6) * liveVoltage_V * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-6) * Math.pow(liveVoltage_V, 2) * 1e6;
      liveTau_ms = 4.7;
    } else if (component.id.includes('C5')) {
      liveVoltage_V = operatingPoint.vChA_out;
      liveCharge_nC = (component.value * 1e-6) * liveVoltage_V * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-6) * Math.pow(liveVoltage_V, 2) * 1e6;
      liveTau_ms = (10000 * component.value * 1e-6) * 1000;
    } else if (component.id.includes('C6')) {
      liveVoltage_V = operatingPoint.vChB_out;
      liveCharge_nC = (component.value * 1e-6) * liveVoltage_V * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-6) * Math.pow(liveVoltage_V, 2) * 1e6;
      liveTau_ms = (10000 * component.value * 1e-6) * 1000;
    } else {
      liveVoltage_V = 5.0;
      liveCharge_nC = (component.value * 1e-6) * 5.0 * 1e9;
      liveEnergy_uJ = 0.5 * (component.value * 1e-6) * 25.0 * 1e6;
    }
  } else if (component.id.includes('A1')) {
    liveVoltage_V = operatingPoint.vA1_out;
    liveCurrent_mA = operatingPoint.instantPhotocurrent_uA / 1000;
    isSaturated = operatingPoint.isA1Saturated;
  } else if (component.id.includes('A2')) {
    liveVoltage_V = operatingPoint.vA2_out;
    isSaturated = operatingPoint.isA2Saturated;
  } else if (component.id === 'FD') {
    liveCurrent_mA = operatingPoint.instantPhotocurrent_uA / 1000;
    liveVoltage_V = 12.0;
    livePower_uW = operatingPoint.pOpt1_uW;
  } else if (component.id.includes('A3')) {
    liveVoltage_V = operatingPoint.vA2_out;
    liveCurrent_mA = 0.01;
  }

  return (
    <aside className="w-full lg:w-[360px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 shadow-md flex flex-col gap-4 text-xs max-h-[620px] overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-cyan-600 dark:text-cyan-400">
              [{component.label}]
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {component.type}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            {component.fullUzbekName}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Yopish"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Electrical Operating State */}
      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
            Hozirgi elektr holati (Taxminiy hisoblangan)
          </span>
          {isSaturated ? (
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold">
              <AlertTriangle className="w-3 h-3" /> To'yinish (Clipping)!
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <CheckCircle className="w-3 h-3" /> Nominal rejim
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div>
            <span className="text-slate-400 block text-[10px]">Kuchlanish (V)</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">
              {liveVoltage_V.toFixed(3)} V
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Tok (I)</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold tabular-nums">
              {liveCurrent_mA >= 1 ? `${liveCurrent_mA.toFixed(2)} mA` : `${(liveCurrent_mA * 1000).toFixed(1)} µA`}
            </span>
          </div>

          {component.type === 'capacitor' ? (
            <>
              <div>
                <span className="text-slate-400 block text-[10px]">Zaryad (Q = C·V)</span>
                <span className="text-indigo-500 dark:text-indigo-400 tabular-nums">
                  {liveCharge_nC >= 1 ? `${liveCharge_nC.toFixed(2)} nC` : `${(liveCharge_nC * 1000).toFixed(1)} pC`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Energiya (E = ½CV²)</span>
                <span className="text-amber-500 dark:text-amber-400 tabular-nums">
                  {liveEnergy_uJ >= 1 ? `${liveEnergy_uJ.toFixed(3)} µJ` : `${(liveEnergy_uJ * 1000).toFixed(2)} nJ`}
                </span>
              </div>
              {liveTau_ms > 0 && (
                <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px]">RC Vaqt doimiysi (τ = R·C): </span>
                  <span className="text-cyan-500 font-semibold">{liveTau_ms.toFixed(3)} ms</span>
                </div>
              )}
            </>
          ) : component.type === 'resistor' ? (
            <>
              <div>
                <span className="text-slate-400 block text-[10px]">Ajralayotgan quvvat (P)</span>
                <span className="text-amber-500 dark:text-amber-400 tabular-nums">
                  {livePower_uW >= 1000 ? `${(livePower_uW / 1000).toFixed(2)} mW` : `${livePower_uW.toFixed(1)} µW`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ulanish tugunlari</span>
                <span className="text-slate-600 dark:text-slate-400 text-[10px]">
                  {component.nodeA} → {component.nodeB}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-slate-400 block text-[10px]">Ulanish tugunlari</span>
                <span className="text-slate-600 dark:text-slate-400 text-[10px]">
                  {component.nodeA} → {component.nodeB}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Quvvat sarfi</span>
                <span className="text-amber-500 dark:text-amber-400 tabular-nums">
                  {livePower_uW > 0 ? `${livePower_uW.toFixed(1)} µW` : 'Past'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Interactive Parameter Editor */}
      {component.editable && (
        <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-500" />
              Parametrni sozlash
            </span>
            <button
              onClick={() => onResetValue(component.id)}
              className="text-[10px] flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
              title="Standart laboratoriya qiymatiga qaytarish"
            >
              <RotateCcw className="w-3 h-3" /> Standart ({component.defaultValue} {component.unit})
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Qiymat:
              </span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                {component.value >= 1000 && component.unit === 'Ω' 
                  ? `${component.value / 1000} kΩ` 
                  : `${component.value} ${component.unit}`}
              </span>
            </div>

            <input
              type="range"
              min={component.minValue}
              max={component.maxValue}
              step={component.step}
              value={component.value}
              onChange={(e) => onUpdateValue(component.id, parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>{component.minValue} {component.unit}</span>
              <span>{component.maxValue} {component.unit}</span>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive 9-Point Uzbek Scientific & Educational Section */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
        <div>
          <span className="font-semibold text-cyan-600 dark:text-cyan-400 block mb-0.5">
            1. Asosiy vazifasi:
          </span>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {component.purposeUz}
          </p>
        </div>

        <div>
          <span className="font-semibold text-cyan-600 dark:text-cyan-400 block mb-0.5">
            2. Ishlash printsipi:
          </span>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {component.workingPrincipleUz}
          </p>
        </div>

        <div>
          <span className="font-semibold text-cyan-600 dark:text-cyan-400 block mb-0.5">
            3. Sxemadagi o'rni va roli:
          </span>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {component.circuitRoleUz}
          </p>
        </div>

        <div>
          <span className="font-semibold text-cyan-600 dark:text-cyan-400 block mb-0.5">
            4. Kirish va chiqish signallari:
          </span>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono text-[10px]">
            {component.inputOutputSignalsUz}
          </p>
        </div>

        <div>
          <span className="font-semibold text-cyan-600 dark:text-cyan-400 block mb-0.5">
            5. Qiymat o'zgarishining butun tizimga ta'siri:
          </span>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {component.impactOnCircuitUz}
          </p>
        </div>

        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px]">
          <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-0.5">
            6. Baholangan / Taxminiy parametrlar & Cheklovlar:
          </span>
          <p className="text-slate-600 dark:text-slate-400 mb-1">
            <strong>Taxminiy qiymatlar:</strong> {component.assumedVsVerifiedUz}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            <strong>Model cheklovi:</strong> {component.limitationsUz}
          </p>
        </div>
      </div>
    </aside>
  );
};
