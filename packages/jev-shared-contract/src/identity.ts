/**
 * Distributed Intent Identity
 *
 * Prevents race conditions and cross-machine epoch collisions between MacBook
 * and Mac Studio running simultaneous autonomous or interactive agents.
 * Format: `${machineId}:${pid}:${epoch}:${sequence}:${bindingHash}`
 */

import * as os from "os";

export interface IntentIdentity {
  machineId: string;
  pid: number;
  epoch: number;
  sequence: number;
  bindingHash: string;
  key: string;
  createdAtMs: number;
}

let monotonicSequence = 0;

function resolveMachineId(): string {
  const envId = (globalThis as any).process?.env?.JEV_MACHINE_ID;
  if (envId && typeof envId === "string" && envId.trim().length > 0) {
    return envId.trim();
  }
  try {
    const hostname = os.hostname();
    if (hostname) {
      return hostname.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16);
    }
  } catch {
    // browser or sandboxed environment fallback
  }
  return "node_local";
}

function resolvePid(): number {
  return (globalThis as any).process?.pid || 1;
}

export function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Creates a globally unique IntentIdentity envelope.
 */
export function createIntentIdentity(params: {
  bindingHash?: string;
  epoch?: number;
  machineId?: string;
} = {}): IntentIdentity {
  monotonicSequence++;
  const machineId = params.machineId || resolveMachineId();
  const pid = resolvePid();
  const epoch = params.epoch ?? Date.now();
  const sequence = monotonicSequence;
  const bindingHash = params.bindingHash ? fnv1aHash(params.bindingHash) : "global";
  const createdAtMs = Date.now();

  const key = `${machineId}:${pid}:${epoch}:${sequence}:${bindingHash}`;

  return {
    machineId,
    pid,
    epoch,
    sequence,
    bindingHash,
    key,
    createdAtMs,
  };
}

/**
 * Parses an intent key into its constituent identity properties.
 */
export function parseIntentIdentity(key: string): IntentIdentity | null {
  if (!key || typeof key !== "string") return null;
  const parts = key.split(":");
  if (parts.length < 5) return null;

  const machineId = parts[0];
  const pid = parseInt(parts[1], 10);
  const epoch = parseInt(parts[2], 10);
  const sequence = parseInt(parts[3], 10);
  const bindingHash = parts.slice(4).join(":");

  if (isNaN(pid) || isNaN(epoch) || isNaN(sequence)) {
    return null;
  }

  return {
    machineId,
    pid,
    epoch,
    sequence,
    bindingHash,
    key,
    createdAtMs: epoch,
  };
}

/**
 * Validates whether an intent identity is fresh and strictly not superseded.
 */
export function isIntentFresh(
  identity: IntentIdentity,
  currentEpoch: number,
  maxAgeMs = 30000
): { valid: boolean; reason?: string } {
  if (identity.epoch < currentEpoch) {
    return {
      valid: false,
      reason: `Intent epoch ${identity.epoch} is older than current epoch ${currentEpoch}`,
    };
  }

  const ageMs = Date.now() - identity.createdAtMs;
  if (ageMs > maxAgeMs) {
    return {
      valid: false,
      reason: `Intent identity has expired: age ${ageMs}ms exceeds maxAge ${maxAgeMs}ms`,
    };
  }

  return { valid: true };
}
