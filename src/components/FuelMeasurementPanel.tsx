/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationParameters } from '../types/circuit';
import { ElectricalOperatingPoint, FUEL_TYPES } from '../physics/fuelOptoModel';
import { 
  Droplet, 
  Thermometer, 
  Disc, 
  Eye, 
  ShieldAlert, 
  ShieldCheck, 
  HelpCircle, 
  Sliders, 
  Zap, 
  Power, 
  Radio, 
  AlertTriangle 
} from 'lucide-react';

interface FuelMeasurementPanelProps {
  params: SimulationParameters;
  onUpdateParams: (newParams: Partial<SimulationParameters>) => void;
  operatingPoint: ElectricalOperatingPoint;
}

export const FuelMeasurementPanel: React.FC<FuelMeasurementPanelProps> = ({
  params,
  onUpdateParams,
  operatingPoint,
}) => {
  const currentFuel = FUEL_TYPES.find(f => f.id === params.selectedFuel) || FUEL_TYPES[0];

  return (
    <div className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm transition-colors space-y-5">
      
      {/* Top Banner: Status & Principle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Birlashtirilgan Optoelektronik Boshqaruv & O'lchov Markazi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Potentsiometr (RP1) + Ta'minot manbai (G1) + Dual IR LED (ИД1/ИД2) + Fotodiod (FD) + Analog A1/A2
            </p>
          </div>
        </div>

        {/* Operational Safety Status Badge */}
        <div className="flex items-center gap-2">
          {operatingPoint.safetyStatus === 'normal' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>NORMA (Xavfsiz yoqilg'i)</span>
            </div>
          ) : operatingPoint.safetyStatus === 'warning' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>ME'YORDAN ORTIQ (Chegara ostonasi)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-pulse">
              <ShieldAlert className="w-4 h-4" />
              <span>AVARIYA XAVFI (Muz kristallanishi)</span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: TEACHER'S KEY DEMONSTRATION CONTROLS (POT + PSU + DUAL LED) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        
        {/* 1. Potentiometer (RP1) Demonstration Card */}
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20 space-y-2.5">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              3-Terminal Potentsiometr (RP1)
            </span>
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {params.potentiometerResistance_kOhm ?? 20} kΩ
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>Qarshilikni sozlash:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">R_pot = {params.potentiometerResistance_kOhm ?? 20} kΩ</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={params.potentiometerResistance_kOhm ?? 20}
              onChange={(e) => onUpdateParams({ potentiometerResistance_kOhm: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>1 kΩ (Yorug' LED / Maks)</span>
              <span>20 kΩ (Nominal)</span>
              <span>100 kΩ (Xira LED / Min)</span>
            </div>
          </div>

          {/* Demonstration Notice */}
          <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 text-[10px] space-y-1">
            <div className="text-slate-700 dark:text-slate-300 font-medium">
              💡 <strong>O'qituvchi tajribasi bog'liqligi:</strong>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-tight">
              <strong>Qarshilik ortsa (↑)</strong> → Wiper Vw kamayadi → LED toki va yorug'ligi kamayadi (↓).
              <br />
              <strong>Qarshilik kamaysa (↓)</strong> → Wiper Vw oshadi → LED toki va yorug'ligi ortadi (↑).
            </p>
            <div className="flex justify-between font-mono text-[9px] pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-500">
              <span>Term A: +5.0V</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">Wiper: {operatingPoint.vPotWiper.toFixed(2)}V</span>
              <span>Term B: 0V</span>
            </div>
          </div>
        </div>

        {/* 2. Adjustable Laboratory Power Supply (G1 / PSU) */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2.5">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Ta'minot Manbai (G1 / PSU)
            </span>
            <button
              onClick={() => onUpdateParams({ supplyEnabled: !(params.supplyEnabled !== false) })}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                params.supplyEnabled !== false
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{params.supplyEnabled !== false ? 'YOQILGAN' : 'O\'CHIRILGAN'}</span>
            </button>
          </div>

          {/* Voltage slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>Kuchlanish (V_sup):</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{params.supplyVoltage ?? 12.0} V</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              disabled={params.supplyEnabled === false}
              value={params.supplyVoltage ?? 12.0}
              onChange={(e) => onUpdateParams({ supplyVoltage: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Current limit slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>Tok chegarasi (I_lim):</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{params.supplyCurrentLimit_mA ?? 250} mA</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              disabled={params.supplyEnabled === false}
              value={params.supplyCurrentLimit_mA ?? 250}
              onChange={(e) => onUpdateParams({ supplyCurrentLimit_mA: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* PSU Telemetry Readout */}
          <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20 text-[10px] font-mono space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Haqiqiy kuchlanish:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{operatingPoint.vSupplyActual.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Yuklama toki:</span>
              <span className={`font-bold ${operatingPoint.isCurrentLimited ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {operatingPoint.iSupplyTotal_mA.toFixed(1)} mA / {operatingPoint.supplyCurrentLimit_mA} mA
              </span>
            </div>
            {operatingPoint.isCurrentLimited && (
              <div className="text-rose-500 font-bold text-[9px] flex items-center gap-1 pt-0.5">
                <AlertTriangle className="w-3 h-3" />
                <span>CC MODE: Tok chegarasiga yetildi! Kuchlanish pasaytirildi.</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Dual Infrared Emitters (ИД1 & ИД2) & Optical Beam Path */}
        <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-50/30 dark:bg-cyan-950/20 space-y-2.5">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
            <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              Dual IR Emitentlar (ИД1 & ИД2)
            </span>
            <span className="text-[10px] font-mono text-cyan-600">Optik Nur</span>
          </div>

          {/* Individual LED Toggles */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* LED 1 */}
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-500">ИД1 (1.94 µm)</span>
                <input
                  type="checkbox"
                  checked={params.led1Enabled !== false}
                  onChange={(e) => onUpdateParams({ led1Enabled: e.target.checked })}
                  className="accent-rose-500 cursor-pointer"
                />
              </div>
              <div className="text-[9px] text-slate-500">Suv yutilish o'lchovi</div>
              <div className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                {operatingPoint.iLed1_mA.toFixed(1)} mA ({operatingPoint.pLed1_uW.toFixed(0)} µW)
              </div>
            </div>

            {/* LED 2 */}
            <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-500">ИД2 (2.15 µm)</span>
                <input
                  type="checkbox"
                  checked={params.led2Enabled !== false}
                  onChange={(e) => onUpdateParams({ led2Enabled: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
              </div>
              <div className="text-[9px] text-slate-500">Tayanch kanali</div>
              <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {operatingPoint.iLed2_mA.toFixed(1)} mA ({operatingPoint.pLed2_uW.toFixed(0)} µW)
              </div>
            </div>
          </div>

          {/* Optical Alignment Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>Optik kollimatsiya / moslik:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{params.opticalAlignmentPercent ?? 95} %</span>
            </div>
            <input
              type="range"
              min={70}
              max={100}
              step={1}
              value={params.opticalAlignmentPercent ?? 95}
              onChange={(e) => onUpdateParams({ opticalAlignmentPercent: parseInt(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <p className="text-[10px] text-slate-500 italic">
            *Nurlar kyuveta orqali o'tib fotodiod (FD) ga tushadi. Elektr sim bilan ulanmagan.
          </p>
        </div>

      </div>

      {/* ============================================================== */}
      {/* SECTION 2: FUEL & ENVIRONMENTAL MEASUREMENT PARAMETERS */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
        
        {/* Left Column: Interactive Physical Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4 text-xs">
          {/* Fuel Selector */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Harbiy / Aviatsiya yoqilg'isi markasi:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FUEL_TYPES.map((fuel) => (
                <button
                  key={fuel.id}
                  onClick={() => onUpdateParams({ selectedFuel: fuel.id })}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    params.selectedFuel === fuel.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{fuel.name}</div>
                  <div className="text-[9px] opacity-75 font-mono">Maks: {fuel.maxAllowedMoisturePpm} ppm</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Water Concentration (0 - 120 ppm) */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Droplet className="w-3.5 h-3.5 text-cyan-500" />
                  Haqiqiy suv miqdori:
                </span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                  {params.waterConcentrationPpm} ppm
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={120}
                step={1}
                value={params.waterConcentrationPpm}
                onChange={(e) => onUpdateParams({ waterConcentrationPpm: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>0 ppm (Quruq)</span>
                <span>{currentFuel.maxAllowedMoisturePpm} ppm (Chegara)</span>
                <span>120 ppm (Xavfli)</span>
              </div>
            </div>

            {/* Fuel Temperature (-40 to +60 °C) */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                  Yoqilg'i harorati (T):
                </span>
                <span className="font-mono font-bold text-rose-500 dark:text-rose-400 text-sm">
                  {params.fuelTemperature > 0 ? `+${params.fuelTemperature}` : params.fuelTemperature} °C
                </span>
              </div>
              <input
                type="range"
                min={-40}
                max={60}
                step={1}
                value={params.fuelTemperature}
                onChange={(e) => onUpdateParams({ fuelTemperature: parseInt(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>-40 °C (Arktika)</span>
                <span>+20 °C</span>
                <span>+60 °C (Sahro)</span>
              </div>
            </div>

            {/* Optical Path Length (5 - 50 mm) */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5 text-indigo-500" />
                  Optik qatlam qalinligi (L):
                </span>
                <span className="font-mono font-bold text-indigo-500 dark:text-indigo-400 text-sm">
                  {params.opticalPathLengthMm} mm
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={params.opticalPathLengthMm}
                onChange={(e) => onUpdateParams({ opticalPathLengthMm: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>5 mm</span>
                <span>15 mm (Standart)</span>
                <span>50 mm</span>
              </div>
            </div>

            {/* Contamination / Turbidity (0 - 100%) */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  Ifloslanish & Xiralashuv:
                </span>
                <span className="font-mono font-bold text-amber-500 text-sm">
                  {params.turbidityContamination} %
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={params.turbidityContamination}
                onChange={(e) => onUpdateParams({ turbidityContamination: parseInt(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>0% (Toza)</span>
                <span>50%</span>
                <span>100% (Qurum)</span>
              </div>
            </div>
          </div>

          {/* Compensation Algorithm Toggles */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={params.tempCompensationEnabled}
                onChange={(e) => onUpdateParams({ tempCompensationEnabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Harorat kompensatsiyasi (k(T) ko'phadli model)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={params.turbidityCompensationEnabled}
                onChange={(e) => onUpdateParams({ turbidityCompensationEnabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Xiralashuvni differentsial so'ndirish
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Scientific Readings & Calculated Results (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-50 to-cyan-50/40 dark:from-slate-900/90 dark:to-cyan-950/20">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold">
                OPTOELEKTRONIK O'LCHOV NATIJALARI
              </span>
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                SNR: {operatingPoint.snrDb} dB
              </span>
            </div>

            {/* Main Result Display */}
            <div className="text-center py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                Aniqlangan Yakuniy Namlik Miqdori:
              </span>
              <div className="flex items-baseline justify-center gap-2 mt-1">
                <span className="text-4xl font-extrabold font-mono text-cyan-600 dark:text-cyan-300 tabular-nums">
                  {operatingPoint.compensatedPpm.toFixed(1)}
                </span>
                <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">
                  ppm (mg/kg)
                </span>
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                Massa ulushi: <span className="font-semibold text-slate-700 dark:text-slate-200">{(operatingPoint.moisturePercentMass).toFixed(4)} %</span>
                {' · '}
                Standart ruxsat: <span className="text-amber-500 font-semibold">{currentFuel.maxAllowedMoisturePpm} ppm</span>
              </div>
            </div>

            {/* Optical Channels Breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono">
              <div className="p-2 rounded bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">O'lchov Kanali V_A (1.94 µm)</span>
                <span className="font-bold text-rose-500 tabular-nums text-sm">
                  {operatingPoint.vChA_out.toFixed(3)} V
                </span>
                <span className="block text-[9px] text-slate-500 mt-0.5">
                  Fotodiod: {operatingPoint.pOpt1_uW.toFixed(1)} µW
                </span>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tayanch Kanali V_B (2.15 µm)</span>
                <span className="font-bold text-cyan-500 tabular-nums text-sm">
                  {operatingPoint.vChB_out.toFixed(3)} V
                </span>
                <span className="block text-[9px] text-slate-500 mt-0.5">
                  Fotodiod: {operatingPoint.pOpt2_uW.toFixed(1)} µW
                </span>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">O'tkazuvchanlik nisbati (R)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {operatingPoint.transmittanceRatio.toFixed(4)}
                </span>
              </div>

              <div className="p-2 rounded bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Xom hisob (Kompensatsiyasiz)</span>
                <span className="font-semibold text-slate-500 tabular-nums">
                  {operatingPoint.rawPpm.toFixed(1)} ppm
                </span>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimer */}
          <div className="mt-4 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Ilmiy eslatma:</strong> Universitet ta'limiy simulyatsiyasi. Barcha qiymatlar Buger-Lambert optik modeli va differentsial kuchaytirgich tenglamalari orqali hisoblangan.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
