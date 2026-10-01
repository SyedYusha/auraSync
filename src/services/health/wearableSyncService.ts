import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveManualHealthEntry, type ManualHealthEntry } from './manualHealthDataService';

const PAIRING_KEY = 'aurasync_conceptual_band_state';

export interface WearableDeviceState {
  readonly isPaired: boolean;
  readonly deviceName: string;
  readonly deviceId: string;
  readonly batteryPercent: number;
  readonly firmwareVersion: string;
  readonly lastSyncedAt: string | null;
  readonly connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'syncing';
}

const DEFAULT_STATE: WearableDeviceState = {
  isPaired: false,
  deviceName: 'AuraSync+ Band (Concept Prototype)',
  deviceId: 'AS-BAND-7X9',
  batteryPercent: 91,
  firmwareVersion: 'v2.4.1-concept',
  lastSyncedAt: null,
  connectionStatus: 'disconnected',
};

export async function getWearableState(): Promise<WearableDeviceState> {
  const raw = await AsyncStorage.getItem(PAIRING_KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    return JSON.parse(raw) as WearableDeviceState;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveWearableState(state: WearableDeviceState): Promise<void> {
  await AsyncStorage.setItem(PAIRING_KEY, JSON.stringify(state));
}

export async function pairWearable(): Promise<WearableDeviceState> {
  const current = await getWearableState();
  const next: WearableDeviceState = {
    ...current,
    isPaired: true,
    connectionStatus: 'connected',
    batteryPercent: Math.max(75, Math.floor(Math.random() * 25) + 75),
  };
  await saveWearableState(next);
  return next;
}

export async function unpairWearable(): Promise<WearableDeviceState> {
  const next: WearableDeviceState = {
    ...DEFAULT_STATE,
    isPaired: false,
    connectionStatus: 'disconnected',
    lastSyncedAt: null,
  };
  await saveWearableState(next);
  return next;
}

/**
 * Simulates BLE transmission of sensor packet from the conceptual AuraSync+ band
 * into personal health storage. No physical hardware is claimed.
 */
export async function syncWearableSignals(userId: string): Promise<{ state: WearableDeviceState; entry: ManualHealthEntry }> {
  const current = await getWearableState();

  const now = new Date();
  const hrvBase = 58 + Math.floor(Math.random() * 22); // 58-80 ms
  const restingHr = 56 + Math.floor(Math.random() * 12); // 56-68 bpm
  const sleepHours = Number((6.8 + Math.random() * 1.8).toFixed(1)); // 6.8 - 8.6 h
  const sleepScore = Math.min(96, Math.max(68, Math.round(sleepHours * 11 + (hrvBase > 65 ? 8 : 0))));
  const stress = Math.min(65, Math.max(18, Math.round(85 - hrvBase * 0.7)));
  const trainingLoad = 38 + Math.floor(Math.random() * 25);
  const steps = 7500 + Math.floor(Math.random() * 4500);
  const caloriesBurned = Math.round(steps * 0.045 + trainingLoad * 3.5);
  const activeMinutes = Math.round(trainingLoad * 0.8 + 15);

  const entry: ManualHealthEntry = {
    capturedAt: now.toISOString(),
    heartRate: restingHr,
    hrv: hrvBase,
    sleep: sleepHours,
    sleepScore,
    stress,
    trainingLoad,
    steps,
    caloriesBurned,
    activeMinutes,
  };

  await saveManualHealthEntry(userId, entry);

  const updatedState: WearableDeviceState = {
    ...current,
    isPaired: true,
    connectionStatus: 'connected',
    lastSyncedAt: now.toISOString(),
    batteryPercent: Math.max(12, current.batteryPercent - 1),
  };

  await saveWearableState(updatedState);

  return { state: updatedState, entry };
}
