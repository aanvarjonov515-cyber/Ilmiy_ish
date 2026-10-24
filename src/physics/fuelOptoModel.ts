/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FuelTypeData, SimulationParameters } from '../types/circuit';

export const FUEL_TYPES: FuelTypeData[] = [
  {
    id: 'ts1',
    name: 'TS-1 Aviakerosin',
    fullName: 'TS-1 Aviatsiya kerosini (GOST 10227-86)',
    standard: 'GOST 10227-86',
    baseRefractiveIndex: 1.442,
    baseAbsorption1940: 0.12, // cm^-1
    baseAbsorption2150: 0.14, // cm^-1
    maxAllowedMoisturePpm: 30, // Max 0.003%
    density: 0.775,
  },
  {
    id: 'rt',
    name: 'RT Reaktiv yoqilg\'isi',
    fullName: 'RT Gidrotozalangan reaktiv yoqilg\'i (GOST 16564-71)',
    standard: 'GOST 16564-71',
    baseRefractiveIndex: 1.445,
    baseAbsorption1940: 0.11,
    baseAbsorption2150: 0.13,
    maxAllowedMoisturePpm: 30,
    density: 0.780,
  },
  {
    id: 'diesel',
    name: 'Dizel yoqilg\'isi L-0.2-62',
    fullName: 'Harbiy transport dizel yoqilg\'isi (GOST 305-82)',
    standard: 'GOST 305-82',
    baseRefractiveIndex: 1.468,
    baseAbsorption1940: 0.18,
    baseAbsorption2150: 0.20,
    maxAllowedMoisturePpm: 60,
    density: 0.840,
  },
  {
    id: 'gasoline',
    name: 'Benzin A-92 / Avia-benzin',
    fullName: 'Avtomobil va yengil avia-benzin (GOST 2084-77)',
    standard: 'GOST 2084-77',
    baseRefractiveIndex: 1.418,
    baseAbsorption1940: 0.09,
    baseAbsorption2150: 0.11,
    maxAllowedMoisturePpm: 50,
    density: 0.745,
  },
];

export interface ElectricalOperatingPoint {
  // Power Supply Telemetry
  vSupplyActual: number; // Actual voltage supplied to circuit (V)
  iSupplyTotal_mA: number; // Total drawn current (mA)
  supplyCurrentLimit_mA: number; // Configured current limit (mA)
  isCurrentLimited: boolean; // True when load reaches limit (CC mode)
  supplyPower_mW: number; // Total dissipated power (mW)

  // Potentiometer & Driver Control
  vPotWiper: number; // Wiper terminal voltage (V)
  potResistance_kOhm: number; // Configured potentiometer resistance (kOhm)
  
  // Dual IR LED Emitter Operating States
  iLed1_mA: number; // Current through LED 1 (mA)
  iLed2_mA: number; // Current through LED 2 (mA)
  pLed1_uW: number; // Optical power emitted by LED 1 (uW)
  pLed2_uW: number; // Optical power emitted by LED 2 (uW)
  led1BrightnessPercent: number; // Relative optical brightness %
  led2BrightnessPercent: number; // Relative optical brightness %
  isLed1Active: boolean;
  isLed2Active: boolean;

  // Optical powers reaching detector through cuvette
  pOpt1_uW: number; // Optical power at detector for 1.94 um (uW)
  pOpt2_uW: number; // Optical power at detector for 2.15 um (uW)
  pBeamReceived1_uW: number;
  pBeamReceived2_uW: number;
  
  // Photocurrents
  iPh1_uA: number; // uA
  iPh2_uA: number; // uA
  instantPhotocurrent_uA: number;
  
  // Voltages
  vA1_out: number; // V
  vA2_out: number; // V
  vChA_out: number; // V (Demodulated Channel A)
  vChB_out: number; // V (Demodulated Channel B)
  
  // Intermediate nodes
  tp1_voltage: number;
  tp2_voltage: number;
  tp3_voltage: number;
  tp4_voltage: number;
  tp5_voltage: number;
  tp6_voltage: number;
  
  // Saturation flags
  isA1Saturated: boolean;
  isA2Saturated: boolean;
  
  // Calculated moisture metrics
  transmittanceRatio: number; // I_meas / I_ref
  rawPpm: number;
  compensatedPpm: number;
  moisturePercentMass: number;
  safetyStatus: 'normal' | 'warning' | 'critical';
  snrDb: number;
}

/**
 * Calculates complete optoelectronic signal propagation:
 * Potentiometer + Power Supply -> Driver & Logic -> Dual IR LEDs (ИД1 & ИД2)
 * -> Optical Beams -> Fuel Cuvette -> Photodetector FD -> A1 -> A2 -> A3.1/A3.2
 */
export function calculateCircuitOperatingPoint(
  params: SimulationParameters,
  componentsState: Record<string, number>,
  currentTime: number = 0
): ElectricalOperatingPoint {
  const fuel = FUEL_TYPES.find(f => f.id === params.selectedFuel) || FUEL_TYPES[0];
  const L_cm = (params.opticalPathLengthMm || 15) / 10; // mm to cm
  const T = params.fuelTemperature ?? 20; // °C
  const turbidity = (params.turbidityContamination ?? 8) / 100; // 0 to 1
  const intensityFactor = (params.opticalIntensityPercent ?? 100) / 100;
  const alignmentFactor = (params.opticalAlignmentPercent ?? 95) / 100;

  // ==========================================
  // 1. POWER SUPPLY & CURRENT LIMIT MODEL
  // ==========================================
  const isSupplyOn = params.supplyEnabled !== false;
  const vSupplySet = isSupplyOn ? Math.max(0, params.supplyVoltage ?? 12.0) : 0;
  const currentLimit_mA = Math.max(10, params.supplyCurrentLimit_mA ?? 250);

  // If supply is turned OFF, entire system shuts down safely
  if (!isSupplyOn || vSupplySet <= 0.2) {
    return {
      vSupplyActual: 0,
      iSupplyTotal_mA: 0,
      supplyCurrentLimit_mA: currentLimit_mA,
      isCurrentLimited: false,
      supplyPower_mW: 0,
      vPotWiper: 0,
      potResistance_kOhm: params.potentiometerResistance_kOhm ?? 20,
      iLed1_mA: 0,
      iLed2_mA: 0,
      pLed1_uW: 0,
      pLed2_uW: 0,
      led1BrightnessPercent: 0,
      led2BrightnessPercent: 0,
      isLed1Active: false,
      isLed2Active: false,
      pOpt1_uW: 0,
      pOpt2_uW: 0,
      pBeamReceived1_uW: 0,
      pBeamReceived2_uW: 0,
      iPh1_uA: 0,
      iPh2_uA: 0,
      instantPhotocurrent_uA: 0,
      vA1_out: 0,
      vA2_out: 0,
      vChA_out: 0,
      vChB_out: 0,
      tp1_voltage: 0,
      tp2_voltage: 0,
      tp3_voltage: 0,
      tp4_voltage: 0,
      tp5_voltage: 0,
      tp6_voltage: 0,
      isA1Saturated: false,
      isA2Saturated: false,
      transmittanceRatio: 1.0,
      rawPpm: 0,
      compensatedPpm: 0,
      moisturePercentMass: 0,
      safetyStatus: 'normal',
      snrDb: 0,
    };
  }

  // ==========================================
  // 2. POTENTIOMETER INPUT CONTROL MAPPING
  // ==========================================
  // 3-Terminal Potentiometer (Terminal A = 5V ref, Terminal B = GND, Wiper W = control)
  // Teacher requirement: Increasing resistance -> decreases LED brightness;
  //                      Decreasing resistance -> increases LED brightness.
  const R_pot_kOhm = Math.max(1, Math.min(100, params.potentiometerResistance_kOhm ?? 20));
  const R_fixed_kOhm = 20; // Reference internal load resistor
  
  // Wiper voltage: V_wiper = 5.0 * (R_fixed / (R_fixed + R_pot))
  // When R_pot = 1 kOhm  -> V_wiper ~ 4.76V (high drive, maximum brightness)
  // When R_pot = 20 kOhm -> V_wiper = 2.50V (nominal drive, 100% brightness)
  // When R_pot = 100 kOhm-> V_wiper ~ 0.83V (low drive, dim brightness)
  const vPotWiper = 5.0 * (R_fixed_kOhm / (R_fixed_kOhm + R_pot_kOhm));

  // LED Target Current from Potentiometer Wiper (Nominal 55 mA at 20 kOhm)
  const nominalLedCurrent_mA = 55;
  const headroomFactor = Math.min(1.0, Math.max(0.1, vSupplySet / 10.0));
  const targetLedCurrent_mA = nominalLedCurrent_mA * (vPotWiper / 2.5) * headroomFactor;

  // Unconstrained LED currents based on enable toggles
  let iLed1_unconstrained = (params.led1Enabled !== false) ? targetLedCurrent_mA : 0;
  let iLed2_unconstrained = (params.led2Enabled !== false) ? targetLedCurrent_mA : 0;

  // Quiescent background current for analog amplifiers and digital logic (mA)
  const iQuiescent_mA = 22 + (vSupplySet * 0.8);

  // Total unconstrained load current (LEDs are pulsed in 50% duty cycle complementary phases)
  const iPulsedLeds_mA = (iLed1_unconstrained + iLed2_unconstrained) * 0.52;
  const unconstrainedLoad_mA = iQuiescent_mA + iPulsedLeds_mA;

  // ==========================================
  // 3. CURRENT LIMIT & VOLTAGE CLAMPING
  // ==========================================
  let isCurrentLimited = false;
  let vSupplyActual = vSupplySet;
  let iSupplyTotal_mA = unconstrainedLoad_mA;
  let iLed1_mA = iLed1_unconstrained;
  let iLed2_mA = iLed2_unconstrained;

  if (unconstrainedLoad_mA > currentLimit_mA) {
    isCurrentLimited = true;
    iSupplyTotal_mA = currentLimit_mA;
    // In constant current (CC) mode, output voltage collapses
    const attenuation = currentLimit_mA / unconstrainedLoad_mA;
    vSupplyActual = vSupplySet * attenuation;
    iLed1_mA = iLed1_unconstrained * attenuation;
    iLed2_mA = iLed2_unconstrained * attenuation;
  }

  const supplyPower_mW = Math.round(vSupplyActual * iSupplyTotal_mA);

  // ==========================================
  // 4. DUAL IR EMITTERS OPTICAL OUTPUT
  // ==========================================
  // GaInAsSb IR LEDs produce optical power proportional to forward current
  // Nominal: 120 uW emitted at 55 mA
  const pLed1_uW = (iLed1_mA / 55) * 120 * intensityFactor;
  const pLed2_uW = (iLed2_mA / 55) * 120 * intensityFactor;

  const led1BrightnessPercent = Math.round((iLed1_mA / 55) * 100);
  const led2BrightnessPercent = Math.round((iLed2_mA / 55) * 100);

  // ==========================================
  // 5. BEER-LAMBERT TRANSMISSION THROUGH CUVETTE
  // ==========================================
  // Extinction of water at 1.94 um (water absorption band peak)
  const alphaWater1940_per_ppm = 0.000105 * fuel.density; // cm^-1 per ppm
  const alphaWater2150_per_ppm = 0.000004 * fuel.density; // minimal absorption at ref
  
  // Turbidity optical scattering coefficient (attenuates both wavelengths)
  const sigmaScattering = turbidity * 0.85; // cm^-1

  // Total absorption coefficients
  const totalAlpha1 = fuel.baseAbsorption1940 + (params.waterConcentrationPpm * alphaWater1940_per_ppm) + sigmaScattering;
  const totalAlpha2 = fuel.baseAbsorption2150 + (params.waterConcentrationPpm * alphaWater2150_per_ppm) + sigmaScattering;

  // Received optical power at photodetector FD aperture (uW)
  const pBeamReceived1_uW = Math.max(0, pLed1_uW * alignmentFactor * Math.exp(-totalAlpha1 * L_cm));
  const pBeamReceived2_uW = Math.max(0, pLed2_uW * alignmentFactor * Math.exp(-totalAlpha2 * L_cm));

  const pOpt1_uW = pBeamReceived1_uW;
  const pOpt2_uW = pBeamReceived2_uW;

  // ==========================================
  // 6. PHOTODETECTOR & SYNCHRONOUS MODULATION
  // ==========================================
  // InGaAs photodiode responsivity (~0.85 A/W = uA/uW)
  const responsivity = params.detectorResponsivity || 0.85;

  // Modulated optical signal switching between LED1 (Phase A, 1.94 um) and LED2 (Phase B, 2.15 um)
  // Frequency f_mod ~ 1000 Hz, period 1 ms.
  const modFreq = 1000;
  const phase = (currentTime * modFreq) % 1;
  const isPhaseA = phase < 0.45;
  const isPhaseB = phase >= 0.50 && phase < 0.95;

  let activePOpt = 0;
  if (isPhaseA) {
    activePOpt = pOpt1_uW;
  } else if (isPhaseB) {
    activePOpt = pOpt2_uW;
  } else {
    // Dead time between pulses (50 us non-overlapping period)
    activePOpt = 0.03 * Math.max(pOpt1_uW, pOpt2_uW);
  }

  // Photocurrent: I_ph = P_opt * S + I_dark
  const iDark_uA = 0.02 * Math.exp(0.05 * (T - 20)); // temperature-dependent dark current
  const iPh1_uA = pOpt1_uW * responsivity + iDark_uA;
  const iPh2_uA = pOpt2_uW * responsivity + iDark_uA;
  const instantPhotocurrent_uA = activePOpt * responsivity + iDark_uA;

  // ==========================================
  // 7. ANALOG AMPLIFICATION STAGES (A1 & A2)
  // ==========================================
  const R1_ohms = componentsState['R1'] || 100000; // 100 kOhm
  const R3_ohms = componentsState['R3'] || 4700;   // 4.7 kOhm
  const R4_ohms = componentsState['R4'] || 47000;  // 47 kOhm

  // Maximum linear voltage rail determined by actual power supply voltage
  const maxRail = Math.max(1.0, Math.min(10.5, vSupplyActual - 1.5));

  // Preamplifier A1 (Transimpedance stage): V_A1 = -I_ph * R1
  const rawVA1 = -(instantPhotocurrent_uA * 1e-6) * R1_ohms;
  const isA1Saturated = Math.abs(rawVA1) >= maxRail;
  const vA1_out = Math.max(-maxRail, Math.min(maxRail, rawVA1));

  // Intermediate Gain stage A2: Inverting gain = -(R4 / R3)
  const a2Gain = R4_ohms / Math.max(100, R3_ohms);
  const rawVA2 = -vA1_out * a2Gain * 0.45; // AC coupled scaling
  const isA2Saturated = Math.abs(rawVA2) >= maxRail;
  const vA2_out = Math.max(-maxRail, Math.min(maxRail, rawVA2));

  // Demodulated Channel DC Voltages
  const vChA_out = Math.min(maxRail, (iPh1_uA * 1e-6 * R1_ohms) * a2Gain * 0.45);
  const vChB_out = Math.min(maxRail, (iPh2_uA * 1e-6 * R1_ohms) * a2Gain * 0.45);

  // Test points voltages
  const tp1_voltage = -0.001 * instantPhotocurrent_uA; // virtual ground summing node
  const tp2_voltage = vA1_out;
  const tp3_voltage = vA1_out * 0.98; // AC coupled node
  const tp4_voltage = vA2_out;
  const tp5_voltage = vChA_out;
  const tp6_voltage = vChB_out;

  // ==========================================
  // 8. DUAL-WAVELENGTH MOISTURE EXTRACTION
  // ==========================================
  // Transmittance ratio: R = V_ChA / V_ChB
  const transmittanceRatio = Math.max(0.01, vChA_out / Math.max(0.001, vChB_out));

  // Optical differential absorbance: Delta_A = -ln(R)
  const deltaA = -Math.log(transmittanceRatio);

  const effectiveSlope = (alphaWater1940_per_ppm - alphaWater2150_per_ppm) * L_cm;
  const fuelOffset = (fuel.baseAbsorption1940 - fuel.baseAbsorption2150) * L_cm;
  
  let rawPpm = Math.max(0, (deltaA - fuelOffset) / Math.max(1e-7, effectiveSlope));

  // Quadratic temperature compensation polynomial
  const tempCorrectionFactor = params.tempCompensationEnabled 
    ? (1.0 + 0.0028 * (T - 20) + 0.000015 * Math.pow(T - 20, 2))
    : 1.0;

  // Turbidity compensation: dual-wavelength common-mode rejection cancels baseline scattering
  const turbidityCorrection = params.turbidityCompensationEnabled
    ? 1.0
    : (1.0 + 0.15 * turbidity);

  let compensatedPpm = rawPpm * tempCorrectionFactor * (params.turbidityCompensationEnabled ? 1.0 : turbidityCorrection);
  compensatedPpm = Math.max(0, Math.round(compensatedPpm * 10) / 10);

  const moisturePercentMass = compensatedPpm / 10000; // 100 ppm = 0.01%

  // Safety threshold based on fuel standard
  let safetyStatus: 'normal' | 'warning' | 'critical' = 'normal';
  if (compensatedPpm > fuel.maxAllowedMoisturePpm * 1.5) {
    safetyStatus = 'critical';
  } else if (compensatedPpm > fuel.maxAllowedMoisturePpm) {
    safetyStatus = 'warning';
  }

  // Signal-to-Noise Ratio (SNR) in dB
  const baseNoise_uV = 15 + 0.4 * Math.max(0, T) + (turbidity * 20);
  const signal_mV = Math.min(vChA_out, vChB_out) * 1000;
  const snrLinear = Math.max(1, (signal_mV * 1000) / baseNoise_uV);
  const snrDb = Math.min(75, Math.max(12, 20 * Math.log10(snrLinear)));

  return {
    vSupplyActual: Math.round(vSupplyActual * 100) / 100,
    iSupplyTotal_mA: Math.round(iSupplyTotal_mA * 10) / 10,
    supplyCurrentLimit_mA: currentLimit_mA,
    isCurrentLimited,
    supplyPower_mW,
    vPotWiper: Math.round(vPotWiper * 100) / 100,
    potResistance_kOhm: R_pot_kOhm,
    iLed1_mA: Math.round(iLed1_mA * 10) / 10,
    iLed2_mA: Math.round(iLed2_mA * 10) / 10,
    pLed1_uW: Math.round(pLed1_uW * 10) / 10,
    pLed2_uW: Math.round(pLed2_uW * 10) / 10,
    led1BrightnessPercent,
    led2BrightnessPercent,
    isLed1Active: params.led1Enabled !== false,
    isLed2Active: params.led2Enabled !== false,
    pOpt1_uW: Math.round(pOpt1_uW * 100) / 100,
    pOpt2_uW: Math.round(pOpt2_uW * 100) / 100,
    pBeamReceived1_uW: Math.round(pBeamReceived1_uW * 100) / 100,
    pBeamReceived2_uW: Math.round(pBeamReceived2_uW * 100) / 100,
    iPh1_uA: Math.round(iPh1_uA * 100) / 100,
    iPh2_uA: Math.round(iPh2_uA * 100) / 100,
    instantPhotocurrent_uA: Math.round(instantPhotocurrent_uA * 100) / 100,
    vA1_out: Math.round(vA1_out * 1000) / 1000,
    vA2_out: Math.round(vA2_out * 1000) / 1000,
    vChA_out: Math.round(vChA_out * 1000) / 1000,
    vChB_out: Math.round(vChB_out * 1000) / 1000,
    tp1_voltage: Math.round(tp1_voltage * 1000) / 1000,
    tp2_voltage: Math.round(tp2_voltage * 1000) / 1000,
    tp3_voltage: Math.round(tp3_voltage * 1000) / 1000,
    tp4_voltage: Math.round(tp4_voltage * 1000) / 1000,
    tp5_voltage: Math.round(tp5_voltage * 1000) / 1000,
    tp6_voltage: Math.round(tp6_voltage * 1000) / 1000,
    isA1Saturated,
    isA2Saturated,
    transmittanceRatio: Math.round(transmittanceRatio * 1000) / 1000,
    rawPpm: Math.round(rawPpm * 10) / 10,
    compensatedPpm,
    moisturePercentMass,
    safetyStatus,
    snrDb: Math.round(snrDb * 10) / 10,
  };
}
