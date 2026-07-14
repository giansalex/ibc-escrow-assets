import type { IbcClientStatus } from "../types.js";
import { fetchWithTimeout, normalizeRestUrl } from "../utils/http.js";

interface ClientStatusResponse {
  status?: string;
}

export interface ClientStatusResult {
  status: IbcClientStatus;
  clientId: string;
  restEndpoint: string;
}

function normalizeClientStatus(raw: string | undefined): IbcClientStatus {
  if (!raw) {
    return "Unknown";
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "active") {
    return "Active";
  }
  if (normalized === "expired") {
    return "Expired";
  }
  if (normalized === "frozen") {
    return "Frozen";
  }
  return "Unknown";
}

/**
 * Prefer a known-good REST base first, then the remaining endpoints.
 */
export function preferRestEndpoint(
  restEndpoints: string[],
  preferred?: string,
): string[] {
  if (!preferred) {
    return restEndpoints;
  }

  const unique = [...new Set(restEndpoints)];
  const withoutPreferred = unique.filter((endpoint) => endpoint !== preferred);
  return unique.includes(preferred) ? [preferred, ...withoutPreferred] : unique;
}

async function fetchClientStatus(
  base: string,
  clientId: string,
): Promise<IbcClientStatus> {
  const url = `${base}/ibc/core/client/v1/client_status/${encodeURIComponent(clientId)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as ClientStatusResponse;
  return normalizeClientStatus(data.status);
}

/**
 * Query light-client status on a remote chain via REST, trying endpoints until one works.
 */
export async function queryClientStatus(
  restEndpoints: string[],
  clientId: string,
): Promise<ClientStatusResult> {
  if (!clientId) {
    throw new Error("Missing IBC client_id");
  }

  if (restEndpoints.length === 0) {
    throw new Error("No REST endpoints available for remote chain");
  }

  const errors: string[] = [];

  for (const endpoint of restEndpoints) {
    const base = normalizeRestUrl(endpoint);

    try {
      const status = await fetchClientStatus(base, clientId);
      return {
        status,
        clientId,
        restEndpoint: endpoint,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${endpoint}: ${message}`);
    }
  }

  throw new Error(errors.join("; "));
}
