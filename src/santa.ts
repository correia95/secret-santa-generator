export type Exclusion = [string, string];

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isExcludedPair(a: string, b: string, exclusions: Exclusion[]): boolean {
  return exclusions.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function isValidAssignment(
  names: string[],
  exclusions: Exclusion[],
  assignment: Record<string, string>,
): boolean {
  const values = Object.values(assignment);
  if (values.length !== names.length) return false;
  if (new Set(values).size !== names.length) return false;
  for (const giver of names) {
    const receiver = assignment[giver];
    if (receiver === undefined) return false;
    if (receiver === giver) return false;
    if (isExcludedPair(giver, receiver, exclusions)) return false;
  }
  return true;
}

const MAX_ATTEMPTS = 500;

export function generateAssignment(
  names: string[],
  exclusions: Exclusion[],
  seed: number,
): Record<string, string> | null {
  if (names.length < 2) return null;
  if (new Set(names).size !== names.length) return null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rand = mulberry32(seed + attempt * 7919);
    const receivers = shuffle(names, rand);
    const assignment: Record<string, string> = {};
    for (let i = 0; i < names.length; i++) assignment[names[i]] = receivers[i];
    if (isValidAssignment(names, exclusions, assignment)) return assignment;
  }
  return null;
}

export interface State {
  names: string[];
  exclusions: Exclusion[];
  seed: number;
}

function toUint8Array(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function toBase64Url(text: string): string {
  const bytes = toUint8Array(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeState(state: State): URLSearchParams {
  const params = new URLSearchParams();
  params.set('d', toBase64Url(JSON.stringify(state)));
  return params;
}

export function decodeState(params: URLSearchParams, fallback: State): State {
  const raw = params.get('d');
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    if (
      typeof parsed !== 'object' || parsed === null ||
      !Array.isArray(parsed.names) ||
      !Array.isArray(parsed.exclusions) ||
      typeof parsed.seed !== 'number'
    ) {
      return fallback;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
