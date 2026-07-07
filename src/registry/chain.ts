import type { AssetList, ChainRegistryChain } from "../types.js";
import { RegistryClient } from "./client.js";

const chainCache = new Map<string, ChainRegistryChain>();
const assetListCache = new Map<string, AssetList>();

export async function loadChain(
  client: RegistryClient,
  chainName: string,
): Promise<ChainRegistryChain> {
  const cached = chainCache.get(chainName);
  if (cached) {
    return cached;
  }

  try {
    const chain = await client.fetchJson<ChainRegistryChain>(`${chainName}/chain.json`);
    chainCache.set(chainName, chain);
    return chain;
  } catch {
    throw new Error(`Remote chain "${chainName}" not found in chain-registry`);
  }
}

export async function loadAssetList(
  client: RegistryClient,
  chainName: string,
): Promise<AssetList | null> {
  const cached = assetListCache.get(chainName);
  if (cached) {
    return cached;
  }

  try {
    const assetList = await client.fetchJson<AssetList>(`${chainName}/assetlist.json`);
    assetListCache.set(chainName, assetList);
    return assetList;
  } catch {
    return null;
  }
}

export async function loadTargetChain(
  client: RegistryClient,
  targetChain: string,
): Promise<ChainRegistryChain> {
  try {
    return await loadChain(client, targetChain);
  } catch {
    throw new Error(
      `Chain "${targetChain}" not found in chain-registry. Use a valid chain_name (e.g. osmosis, cosmoshub).`,
    );
  }
}

export function getRestEndpoints(chain: ChainRegistryChain): string[] {
  const endpoints = chain.apis?.rest?.map((api) => api.address.trim()).filter(Boolean) ?? [];
  return [...new Set(endpoints)];
}