/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CircuitStage = 'integrated' | 'analog' | 'digital';

export type ComponentType = 
  | 'resistor' 
  | 'capacitor' 
  | 'amplifier' 
  | 'photodetector' 
  | 'optical_source' 
  | 'led_driver' 
  | 'pulse_generator' 
  | 'adc_converter' 
  | 'mcu_dsp' 
  | 'switch' 
  | 'supply' 
  | 'ground' 
  | 'test_point' 
  | 'optical_cell' 
  | 'temp_sensor'
  | 'potentiometer'
  | 'power_supply'
  | 'transistor'
  | 'diode'
  | 'logic_gate';

export interface CircuitNode {
  id: string;
  name: string;
  x: number;
  y: number;
  voltage: number; // in Volts
  type?: 'ground' | 'supply' | 'signal' | 'optical';
}

export interface WireConnection {
  id: string;
  label: string;
  fromNode: string;
  toNode: string;
  points: Array<{ x: number; y: number }>;
  current: number; // in mA
  startVoltage: number; // in V
  endVoltage: number; // in V
  voltageDrop: number; // in V
  power: number; // in uW
  frequency: number; // in Hz
  amplitude: number; // in V
  status: 'active' | 'quiescent' | 'high' | 'low' | 'inactive';
  type?: 'signal' | 'optical' | 'supply' | 'ground';
  signalName?: string;
  connectivityStatus?: 'verified' | 'assumed' | 'unresolved';
  assumptionReason?: string;
}

export interface ComponentTerminal {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'input' | 'output' | 'power' | 'ground' | 'optical';
}

export interface CircuitComponent {
  id: string;
  name: string;
  fullUzbekName: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  rotation?: number;
  nodeA: string;
  nodeB: string;
  nodeC?: string;
  nodeD?: string;
  terminals?: ComponentTerminal[];
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  step: number;
  defaultValue: number;
  editable: boolean;
  
  // Electrical/optical operating state (Physics-grounded)
  operatingCurrent?: number; // mA
  operatingVoltage?: number; // V
  operatingPower?: number; // mW or uW
  charge_nC?: number; // Capacitor charge Q = C * V (nC)
  energy_uJ?: number; // Stored energy E = 0.5 * C * V^2 (uJ)
  timeConstant_ms?: number; // RC time constant tau = R * C (ms)
  dissipatedPower_uW?: number; // Resistor P = V^2 / R (uW)
  saturation?: boolean;
  gain?: number;
  responsivity?: number; // A/W
  wavelength?: number; // um

  // Scientific & Educational Documentation (Uzbek)
  purposeUz: string;
  workingPrincipleUz: string;
  circuitRoleUz: string;
  inputOutputSignalsUz: string;
  adjustableParametersUz: string;
  impactOnCircuitUz: string;
  assumedVsVerifiedUz: string;
  limitationsUz: string;
}

export interface ConnectivityValidationReport {
  totalWires: number;
  verifiedWires: number;
  assumedWires: number;
  unresolvedWires: number;
  disconnectedTerminals: Array<{ componentId: string; terminalName: string; x: number; y: number }>;
  warnings: string[];
}

export interface FuelTypeData {
  id: string;
  name: string;
  fullName: string;
  standard: string;
  baseRefractiveIndex: number;
  baseAbsorption1940: number; // cm^-1 at 1.94 um
  baseAbsorption2150: number; // cm^-1 at 2.15 um
  maxAllowedMoisturePpm: number;
  density: number; // g/cm^3
}

export interface SimulationParameters {
  isRunning: boolean;
  isPaused: boolean;
  simulationSpeed: number; // 0.5, 1, 2, 5
  time: number; // in seconds
  
  // Fuel & Environmental parameters
  selectedFuel: string; // fuel id
  waterConcentrationPpm: number; // 0 - 150 ppm
  fuelTemperature: number; // -40 to +60 °C
  turbidityContamination: number; // 0 - 100 % (optical scattering)
  opticalPathLengthMm: number; // 5 - 50 mm
  opticalIntensityPercent: number; // 50 - 150 %
  
  // Teacher Demonstration & Input Controls
  potentiometerResistance_kOhm: number; // 1 - 100 kOhm (default 20)
  supplyVoltage: number; // 0 - 15 V (default 12.0 V)
  supplyCurrentLimit_mA: number; // 10 - 500 mA (default 250 mA)
  supplyEnabled: boolean; // default true
  led1Enabled: boolean; // 1.94 um emitter on/off
  led2Enabled: boolean; // 2.15 um emitter on/off
  opticalAlignmentPercent: number; // 70 - 100 % (default 95%)

  // Dual-wavelength specific
  measWavelengthUm: number; // 1.94 um (water absorption)
  refWavelengthUm: number; // 2.15 um (reference isobestic)
  detectorResponsivity: number; // A/W (default ~0.85)
  calibOffset: number;
  calibSlope: number;
  tempCompensationEnabled: boolean;
  turbidityCompensationEnabled: boolean;
}

export interface MeasurementSample {
  timestamp: number;
  channelAVoltage: number; // V (meas)
  channelBVoltage: number; // V (ref)
  transmittanceRatio: number; // I_meas / I_ref
  absorbanceDelta: number;
  rawPpm: number;
  compensatedPpm: number;
  temperature: number;
  snrDb: number;
}
