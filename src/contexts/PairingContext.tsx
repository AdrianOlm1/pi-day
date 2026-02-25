/**
 * PairingContext
 *
 * Manages device identity and pairing state.
 *
 * On every launch:
 *   1. Load or generate a stable deviceId (UUID, stored in AsyncStorage)
 *   2. Look up which pair this deviceId belongs to, and what role (adrian/sarah)
 *   3. If unpaired → show PairingScreen
 *   4. If paired → expose role to UserModeContext
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { UserId } from '../types';
import * as PairingService from '../services/pairing';
import type { DevicePair } from '../services/pairing';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PairingState =
  | 'loading'      // checking AsyncStorage / Supabase
  | 'unpaired'     // no pair record found — need to show PairingScreen
  | 'paired';      // paired, role known

interface PairingContextValue {
  state: PairingState;
  deviceId: string;
  role: UserId | null;           // 'adrian' | 'sarah' once paired
  pair: DevicePair | null;
  /** First device: create a pair and become 'adrian' */
  createPair: () => Promise<string>;  // returns the pair code
  /** Second device: join with the 5-char code and become 'sarah' */
  joinPair: (code: string) => Promise<void>;
  /** Generate a 6-char claim code for phone replacement */
  generateClaimCode: () => Promise<string>;
  /** New device: enter the 6-char claim code to take over a role */
  claimDevice: (code: string) => Promise<void>;
  /** Force re-check pairing status (e.g. after background app resume) */
  refresh: () => Promise<void>;
}

const PairingContext = createContext<PairingContextValue | null>(null);

const DEVICE_ID_KEY = 'piday_device_id';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PairingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState]       = useState<PairingState>('loading');
  const [deviceId, setDeviceId] = useState('');
  const [role, setRole]         = useState<UserId | null>(null);
  const [pair, setPair]         = useState<DevicePair | null>(null);

  // ── Load or generate deviceId ──────────────────────────────────────────────
  const getOrCreateDeviceId = useCallback(async (): Promise<string> => {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const fresh = await Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
  }, []);

  // ── Check if this device is already paired ─────────────────────────────────
  const checkPairing = useCallback(async (devId: string) => {
    try {
      const result = await PairingService.findDeviceRole(devId);
      if (result) {
        setPair(result.pair);
        setRole(result.role);
        setState('paired');
      } else {
        // TODO: show PairingScreen once pairing is fully set up.
        // For now, default to 'adrian' so the app is accessible during development.
        setRole('adrian');
        setState('paired');
      }
    } catch {
      // Network error — fall back to cached role or default to 'adrian'
      const cachedRole = await AsyncStorage.getItem('piday_cached_role');
      const cachedPair = await AsyncStorage.getItem('piday_cached_pair');
      if (cachedRole === 'adrian' || cachedRole === 'sarah') {
        setRole(cachedRole);
        setPair(cachedPair ? JSON.parse(cachedPair) : null);
      } else {
        setRole('adrian');
      }
      setState('paired');
    }
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const devId = await getOrCreateDeviceId();
      setDeviceId(devId);
      await checkPairing(devId);
    })();
  }, [getOrCreateDeviceId, checkPairing]);

  // ── Persist role to cache whenever it changes ──────────────────────────────
  useEffect(() => {
    if (role) AsyncStorage.setItem('piday_cached_role', role);
    if (pair) AsyncStorage.setItem('piday_cached_pair', JSON.stringify(pair));
  }, [role, pair]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCreatePair = useCallback(async (): Promise<string> => {
    const newPair = await PairingService.createPair(deviceId);
    setPair(newPair);
    setRole('adrian');
    setState('paired');
    return newPair.pair_code;
  }, [deviceId]);

  const handleJoinPair = useCallback(async (code: string): Promise<void> => {
    const updatedPair = await PairingService.joinPair(code, deviceId);
    setPair(updatedPair);
    setRole('sarah');
    setState('paired');
  }, [deviceId]);

  const handleGenerateClaimCode = useCallback(async (): Promise<string> => {
    if (!pair || !role) throw new Error('Not paired');
    return PairingService.generateClaimCode(pair.id, role);
  }, [pair, role]);

  const handleClaimDevice = useCallback(async (code: string): Promise<void> => {
    const result = await PairingService.claimDevice(code, deviceId);
    setPair(result.pair);
    setRole(result.role);
    setState('paired');
  }, [deviceId]);

  const refresh = useCallback(async () => {
    if (deviceId) await checkPairing(deviceId);
  }, [deviceId, checkPairing]);

  return (
    <PairingContext.Provider value={{
      state, deviceId, role, pair,
      createPair: handleCreatePair,
      joinPair: handleJoinPair,
      generateClaimCode: handleGenerateClaimCode,
      claimDevice: handleClaimDevice,
      refresh,
    }}>
      {children}
    </PairingContext.Provider>
  );
}

export function usePairing() {
  const ctx = useContext(PairingContext);
  if (!ctx) throw new Error('usePairing must be used within PairingProvider');
  return ctx;
}
