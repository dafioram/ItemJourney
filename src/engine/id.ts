let counter = 0;

/** Deterministic-enough unique id generator (works without crypto.randomUUID in older test envs). */
export function makeId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter}_${rand}`;
}
