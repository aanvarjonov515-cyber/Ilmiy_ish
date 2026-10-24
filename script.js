/**
 * OPTOELECTRONIC FUEL MOISTURE ANALYSIS LAB
 * Shared Scientific Simulation Module
 *
 * Physics Principles:
 * 1. Buger-Lambert-Ber law: I(λ) = I0(λ) * exp(-[α_fuel(λ) + α_water(λ)*Cw + σ_turbidity] * L)
 * 2. Dual-wavelength ratio: R = I_meas(1.94 µm) / I_ref(2.15 µm)
 * 3. Logarithmic absorbance: ΔA = -ln(R) = (α_w1 - α_w2) * Cw * L + Δα_fuel * L
 * 4. Temperature polynomial correction: k(T) = 1 + 0.0028*(T - 20) + 0.000015*(T - 20)^2
 */

window.OPTO_LAB_METADATA = {
  version: "3.2.0-LAB",
  method: "Dual-Wavelength Differential Near-Infrared Absorption",
  measurementWavelength: 1.94, // um
  referenceWavelength: 2.15, // um
  photodetectorRange: [1.8, 2.4], // um
  standardFuels: ["TS-1", "RT", "Diesel L-0.2-62", "Gasoline A-92"],
  scientificDisclaimer: "University research simulation model. Not a certified military instrument."
};

console.log("[OPTO-LAB] Dual-Wavelength Fuel Moisture Simulation Initialized.");
