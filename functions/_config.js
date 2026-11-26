import { getDocumentIfExists, putDocument } from "./_lib.js";

export const DEFAULT_SERVICES = [
  { id: "diagnostics-coding", name: "Diagnostics & Coding", slotMinutes: 60, jobMinutes: 60, fittingOnly: true, supplyAndFit: true },
  { id: "carplay", name: "CarPlay / Android Auto", slotMinutes: 60, jobMinutes: 60, fittingOnly: true, supplyAndFit: true },
  { id: "ambient-lighting", name: "Ambient Lighting", slotMinutes: 60, jobMinutes: 240, fittingOnly: true, supplyAndFit: true },
  { id: "starlight-headlining", name: "Starlight Headliner", slotMinutes: 120, jobMinutes: 480, fittingOnly: true, supplyAndFit: true },
  { id: "reverse-camera", name: "Reverse Camera", slotMinutes: 120, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
  { id: "dashcam", name: "Dashcam Installation", slotMinutes: 120, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
  { id: "virtual-cockpit", name: "Virtual Cockpit", slotMinutes: 120, jobMinutes: 240, fittingOnly: true, supplyAndFit: true },
  { id: "steering-wheel", name: "Steering Wheel Upgrades", slotMinutes: 60, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
  { id: "ecu-programming", name: "ECU / TCU Programming", slotMinutes: 60, jobMinutes: 120, fittingOnly: true, supplyAndFit: true, approvalRequired: true },
  { id: "ecu-cloning", name: "ECU Cloning", slotMinutes: 120, jobMinutes: 240, fittingOnly: true, supplyAndFit: true, approvalRequired: true },
  { id: "retrofits", name: "Retrofits", slotMinutes: 60, jobMinutes: 180, fittingOnly: true, supplyAndFit: true },
  { id: "electrical-upgrades", name: "Other Electrical Upgrades", slotMinutes: 60, jobMinutes: 120, fittingOnly: true, supplyAndFit: true },
];

export const DEFAULT_CONFIG = {
  services: DEFAULT_SERVICES,
  workingHours: {
    1: [{ start: "09:00", end: "17:00" }],
    2: [{ start: "09:00", end: "17:00" }],
    3: [{ start: "09:00", end: "17:00" }],
    4: [{ start: "09:00", end: "17:00" }],
    5: [{ start: "14:30", end: "18:00" }],
    6: [{ start: "09:00", end: "17:00" }],
    0: [{ start: "09:00", end: "17:00" }],
  },
  holidays: [],
  slotIncrementMinutes: 30,
  bookingLeadHours: 24,
  supplyAndFitLeadHours: 168,
  maxAdvanceDays: 180,
  allowMobileFitting: true,
};

export async function bookingConfig(env) {
  const stored = await getDocumentIfExists(env, "settings/bookingConfig");
  return {
    ...DEFAULT_CONFIG,
    ...(stored || {}),
    services: stored?.services?.length ? stored.services : DEFAULT_SERVICES,
    workingHours: { ...DEFAULT_CONFIG.workingHours, ...(stored?.workingHours || {}) },
  };
}

export async function saveBookingConfig(env, config) {
  await putDocument(env, "settings/bookingConfig", {
    ...config,
    updatedAt: new Date().toISOString(),
  });
}

export function serviceById(config, id) {
  return config.services.find((service) => service.id === id);
}
