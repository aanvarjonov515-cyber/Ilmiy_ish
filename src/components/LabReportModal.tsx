/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SimulationParameters } from '../types/circuit';
import { ElectricalOperatingPoint, FUEL_TYPES } from '../physics/fuelOptoModel';
import { X, Printer, Copy, Check, FileCheck, ShieldAlert } from 'lucide-react';

interface LabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: SimulationParameters;
  operatingPoint: ElectricalOperatingPoint;
  sampleCount: number;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({
  isOpen,
  onClose,
  params,
  operatingPoint,
  sampleCount,
}) => {
  const [copied, setCopied] = React.useState(false);
  const currentFuel = FUEL_TYPES.find(f => f.id === params.selectedFuel) || FUEL_TYPES[0];

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const reportText = `
ILMIY-TADQIQOT VA TA'LIMIY LABORATORIYA BAYONNOMASI
Mavzu: Harbiylashtirilgan yoqilg'ilar namligini ikki to'lqinli optoelektronik o'lchash
Sana: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

1. NAMUNA VA METODOLOGIYA:
- Yoqilg'i markasi: ${currentFuel.fullName}
- Standart: ${currentFuel.standard}
- Zichlik: ${currentFuel.density} g/sm³
- Optik yo'l uzunligi (L): ${params.opticalPathLengthMm} mm
- Nurlanish to'lqin uzunliklari: λ1 = 1.94 µm (suv yutilishi), λ2 = 2.15 µm (tayanch)
- Sinov harorati: ${params.fuelTemperature} °C
- Optik xiralashuv/qurum: ${params.turbidityContamination} %

2. ELEKTR VA OPTIK SIGNALLAR:
- Boshqaruv potentsiometri (RP1): ${params.potentiometerResistance_kOhm ?? 20} kΩ (Wiper: ${operatingPoint.vPotWiper.toFixed(2)} V)
- Ta'minot manbai (G1): ${operatingPoint.vSupplyActual.toFixed(2)} V (Yuklama: ${operatingPoint.iSupplyTotal_mA.toFixed(1)} mA, limit: ${operatingPoint.supplyCurrentLimit_mA} mA)
- Emitentlar: ИД1 (1.94 µm) = ${operatingPoint.iLed1_mA.toFixed(1)} mA (${operatingPoint.pLed1_uW.toFixed(0)} µW), ИД2 (2.15 µm) = ${operatingPoint.iLed2_mA.toFixed(1)} mA (${operatingPoint.pLed2_uW.toFixed(0)} µW)
- Kanal A kuchlanishi (1.94 µm): ${operatingPoint.vChA_out.toFixed(3)} V
- Kanal B kuchlanishi (2.15 µm): ${operatingPoint.vChB_out.toFixed(3)} V
- O'tkazuvchanlik nisbati R: ${operatingPoint.transmittanceRatio.toFixed(4)}
- Fotodetektor toki: ${operatingPoint.instantPhotocurrent_uA.toFixed(2)} µA
- Signal/Shovqin nisbati: ${operatingPoint.snrDb} dB

3. YAKUNIY TAHLIL VA XULOSA:
- Hisoblangan suv miqdori: ${operatingPoint.compensatedPpm.toFixed(1)} ppm (${operatingPoint.moisturePercentMass.toFixed(4)} % massa)
- GOST bo'yicha ruxsat etilgan me'yor: ${currentFuel.maxAllowedMoisturePpm} ppm
- Xavfsizlik xulosasi: ${operatingPoint.safetyStatus === 'normal' ? 'NORMA (Parvoz xavfsizligi ta\'minlangan)' : 'ME\'YORDAN ORTIQ (Muzlash xavfi mavjud!)'}

DIQQAT: Ushbu bayonnoma universitet tadqiqot simulyatsiya modelidan olingan.
    `.trim();

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Laboratoriya Sinov Bayonnomasi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optoelektronik yoqilg'i namlik tahlili ilmiy protokoli
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Printable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans text-slate-700 dark:text-slate-300">
          
          {/* Institution Header */}
          <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Universitet Ilmiy Tadqiqot Laboratoriyasi
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Optoelektronika va Harbiy Yoqilg'i Texnologiyalari Kafedrasi
            </p>
          </div>

          {/* Section 1: Sample Info */}
          <div>
            <h5 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
              1. Yoqilg'i Namunasi va O'lchash Sharoitlari
            </h5>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div><span className="text-slate-400">Yoqilg'i turi:</span> <strong>{currentFuel.fullName}</strong></div>
              <div><span className="text-slate-400">Davlat standarti:</span> {currentFuel.standard}</div>
              <div><span className="text-slate-400">Optik kyuveta yo'li (L):</span> {params.opticalPathLengthMm} mm</div>
              <div><span className="text-slate-400">Yoqilg'i harorati (T):</span> {params.fuelTemperature} °C</div>
              <div><span className="text-slate-400">O'lchov to'lqin uzunligi:</span> 1.94 µm (suv piki)</div>
              <div><span className="text-slate-400">Tayanch to'lqin uzunligi:</span> 2.15 µm (izobestik)</div>
              <div><span className="text-slate-400">Xiralashuv darajasi:</span> {params.turbidityContamination} %</div>
              <div><span className="text-slate-400">Olingan namunalar soni:</span> {sampleCount} ta</div>
            </div>
          </div>

          {/* Section 2: Sensor & Analog Measurement */}
          <div>
            <h5 className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
              2. Elektr Signallari va Detektor Chiqishlari
            </h5>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div><span className="text-slate-400">Kanal A (1.94 µm) kuchlanishi:</span> <strong>{operatingPoint.vChA_out.toFixed(3)} V</strong></div>
              <div><span className="text-slate-400">Kanal B (2.15 µm) kuchlanishi:</span> <strong>{operatingPoint.vChB_out.toFixed(3)} V</strong></div>
              <div><span className="text-slate-400">O'tkazuvchanlik nisbati R:</span> {operatingPoint.transmittanceRatio.toFixed(4)}</div>
              <div><span className="text-slate-400">Fototok I_ph:</span> {operatingPoint.instantPhotocurrent_uA.toFixed(2)} µA</div>
              <div><span className="text-slate-400">Signal/Shovqin (SNR):</span> {operatingPoint.snrDb} dB</div>
              <div><span className="text-slate-400">Harorat kompensatsiyasi:</span> {params.tempCompensationEnabled ? 'Faol' : 'O\'chirilgan'}</div>
            </div>
          </div>

          {/* Section 3: Final Scientific Finding */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
              3. Tahlil Natijasi va Xavfsizlik Bahosi
            </h5>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[11px]">Haqiqiy Suv Miqdori (Korreksiyalangan):</span>
                <span className="text-2xl font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                  {operatingPoint.compensatedPpm.toFixed(1)} ppm
                </span>
                <span className="text-slate-500 text-[10px] ml-2">
                  ({(operatingPoint.moisturePercentMass).toFixed(4)} % massa ulushi)
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Standart bo'yicha chegara:</span>
                <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currentFuel.maxAllowedMoisturePpm} ppm
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-cyan-500/20 flex items-center gap-2">
              {operatingPoint.safetyStatus === 'normal' ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Xulosa: Yoqilg'i me'yorga mos. Suv miqdori ruxsat etilgan doirada.
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Xulosa: Me'yordan oshgan! Avia dvigatellarda muzlash va nosozlik xavfi!
                </span>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-400 italic">
            * Izoh: Ushbu protokol universitet dissertatsiyasi va ilmiy-tadqiqot simulyatsiyasi uchun avtomatlashtirilgan tarzda tuzildi.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Nusxa olindi" : "Nusxa olish"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Chop etish (PDF)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
