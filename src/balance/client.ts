import type { CoinBalance } from "../types.js";
import { fetchWithTimeout, normalizeRestUrl } from "../utils/http.js";

interface BalancesResponse {
  balances?: CoinBalance[];
  pagination?: {
    next_key?: string | null;
  };
}

function buildBalancesUrl(
  base: string,
  address: string,
  nextKey?: string | null,
): string {
  const path = `${base}/cosmos/bank/v1beta1/balances/${address}`;
  if (!nextKey) {
    return path;
  }

  const params = new URLSearchParams({ "pagination.key": nextKey });
  return `${path}?${params.toString()}`;
}

async function fetchAllBalances(
  base: string,
  address: string,
): Promise<CoinBalance[]> {
  const balances: CoinBalance[] = [];
  let nextKey: string | null | undefined;

  do {
    const response = await fetchWithTimeout(buildBalancesUrl(base, address, nextKey));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as BalancesResponse;
    balances.push(...(data.balances ?? []));
    nextKey = data.pagination?.next_key;
  } while (nextKey);

  return balances;
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

    try {
      const balances = await fetchAllBalances(base, address);
      return {
        balances,
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