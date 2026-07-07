import type { CoinBalance } from "../types.js";

const REQUEST_TIMEOUT_MS = 15_000;

interface BalancesResponse {
  balances?: CoinBalance[];
  pagination?: {
    next_key?: string | null;
  };
}

function normalizeRestUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function queryBalances(
  restEndpoints: string[],
  address: string,
): Promise<{ balances: CoinBalance[]; restEndpoint: string }> {
  if (restEndpoints.length === 0) {
    throw new Error("No REST endpoints available for remote chain");
  }

  const errors: string[] = [];

  for (const endpoint of restEndpoints) {
    const base = normalizeRestUrl(endpoint);
    const url = `${base}/cosmos/bank/v1beta1/balances/${address}`;

    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        errors.push(`${endpoint}: HTTP ${response.status}`);
        continue;
      }

      const data = (await response.json()) as BalancesResponse;
      return {
        balances: data.balances ?? [],
        restEndpoint: endpoint,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${endpoint}: ${message}`);
    }
  }

  throw new Error(errors.join("; "));
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}