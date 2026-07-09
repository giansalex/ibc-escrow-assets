/**
 * Remote chain_name values permanently excluded from IBC discovery.
 * These are cosmos/chain-registry identifiers for networks that have
 * shut down or are otherwise permanently unusable.
 */
export const DEFAULT_EXCLUDED_NETWORKS: readonly string[] = [
  // Classic permanent shutdowns
  "sifchain",
  "emoney",
  "dig",
  "starname",
  "microtick",
  // 2024–2025 ecosystem shutdowns / halted networks
  "omniflixhub",
  "pryzm",
  "migaloo",
  "stargaze",
  "evmos",
  "joltify",
  "int3face",
  "furya",
];

export function buildExcludedNetworkSet(extra: readonly string[] = []): Set<string> {
  const set = new Set(
    DEFAULT_EXCLUDED_NETWORKS.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  for (const name of extra) {
    const n = name.trim().toLowerCase();
    if (n) {
      set.add(n);
    }
  }
  return set;
}

/** Parse comma-separated `--exclude` CLI values into normalized chain names. */
export function parseExcludeOption(value?: string): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
