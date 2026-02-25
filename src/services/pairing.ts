/**
 * Pairing Service
 *
 * Handles the device-pairing flow:
 *   1. First device creates a pair (generates a 5-char code, stores its deviceId as 'adrian')
 *   2. Second device joins with that code (stores its deviceId as 'sarah')
 *   3. On subsequent launches, each device looks up its deviceId to know its role
 *   4. Phone replacement: generate a 6-char claim code → new device enters it → takes over that role
 */

import { supabase } from '../lib/supabase';
import type { UserId } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DevicePair {
  id: string;
  pair_code: string;
  adrian_device_id: string | null;
  sarah_device_id: string | null;
  claim_code: string | null;
  claim_role: string | null;
  claim_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomCode(length: number, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ─── Core operations ──────────────────────────────────────────────────────────

/**
 * Create a new pair as the 'adrian' role.
 * Generates a 5-char pair code, stores deviceId in adrian_device_id.
 */
export async function createPair(deviceId: string): Promise<DevicePair> {
  // Try up to 5 times in case of code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(5);
    const { data, error } = await supabase
      .from('device_pairs')
      .insert({
        pair_code: code,
        adrian_device_id: deviceId,
      })
      .select()
      .single();

    if (!error && data) return data as DevicePair;
    // If it's a unique constraint violation on pair_code, retry
    if (error?.code !== '23505') throw new Error(error?.message ?? 'Failed to create pair');
  }
  throw new Error('Could not generate a unique pair code. Please try again.');
}

/**
 * Join an existing pair as the 'sarah' role using the 5-char code.
 * Returns the updated pair record, or throws if code not found / already full.
 */
export async function joinPair(pairCode: string, deviceId: string): Promise<DevicePair> {
  const code = pairCode.trim().toUpperCase();

  const { data: existing, error: fetchErr } = await supabase
    .from('device_pairs')
    .select('*')
    .eq('pair_code', code)
    .single();

  if (fetchErr || !existing) throw new Error('Pair code not found. Double-check and try again.');

  const pair = existing as DevicePair;

  if (pair.sarah_device_id && pair.sarah_device_id !== deviceId) {
    throw new Error('This pair already has two devices linked.');
  }
  if (pair.adrian_device_id === deviceId) {
    throw new Error('This is the same device that created the pair.');
  }

  const { data, error } = await supabase
    .from('device_pairs')
    .update({ sarah_device_id: deviceId, updated_at: new Date().toISOString() })
    .eq('pair_code', code)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DevicePair;
}

/**
 * Look up which role this deviceId has across all pairs.
 * Returns { pair, role } or null if not found.
 */
export async function findDeviceRole(
  deviceId: string
): Promise<{ pair: DevicePair; role: UserId } | null> {
  // Check adrian slot
  const { data: asAdrian } = await supabase
    .from('device_pairs')
    .select('*')
    .eq('adrian_device_id', deviceId)
    .maybeSingle();

  if (asAdrian) return { pair: asAdrian as DevicePair, role: 'adrian' };

  // Check sarah slot
  const { data: asSarah } = await supabase
    .from('device_pairs')
    .select('*')
    .eq('sarah_device_id', deviceId)
    .maybeSingle();

  if (asSarah) return { pair: asSarah as DevicePair, role: 'sarah' };

  return null;
}

// ─── Phone replacement ────────────────────────────────────────────────────────

/**
 * Generate a 6-char claim code for phone replacement.
 * Stores it on the pair with a 10-minute expiry.
 * The current device calls this to hand off its role to a new device.
 */
export async function generateClaimCode(pairId: string, role: UserId): Promise<string> {
  const code = randomCode(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const { error } = await supabase
    .from('device_pairs')
    .update({
      claim_code: code,
      claim_role: role,
      claim_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pairId);

  if (error) throw new Error(error.message);
  return code;
}

/**
 * New device calls this with the 6-char claim code.
 * If valid and not expired, the new deviceId takes over that role slot.
 */
export async function claimDevice(
  claimCode: string,
  newDeviceId: string
): Promise<{ pair: DevicePair; role: UserId }> {
  const code = claimCode.trim().toUpperCase();

  const { data: existing, error: fetchErr } = await supabase
    .from('device_pairs')
    .select('*')
    .eq('claim_code', code)
    .maybeSingle();

  if (fetchErr || !existing) throw new Error('Claim code not found.');

  const pair = existing as DevicePair;

  if (!pair.claim_expires_at || new Date(pair.claim_expires_at) < new Date()) {
    throw new Error('This claim code has expired. Generate a new one on the old device.');
  }

  const role = pair.claim_role as UserId;
  if (role !== 'adrian' && role !== 'sarah') throw new Error('Invalid claim role.');

  const patch =
    role === 'adrian'
      ? { adrian_device_id: newDeviceId }
      : { sarah_device_id: newDeviceId };

  const { data, error } = await supabase
    .from('device_pairs')
    .update({
      ...patch,
      claim_code: null,
      claim_role: null,
      claim_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pair.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { pair: data as DevicePair, role };
}
