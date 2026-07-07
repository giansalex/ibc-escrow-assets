import type { IbcConnection, IbcConnectionFile } from "../types.js";
import { RegistryClient } from "./client.js";

function matchesTarget(filename: string, targetChain: string): boolean {
  const base = filename.replace(/\.json$/, "");
  const [chainA, chainB] = base.split("-");
  return chainA === targetChain || chainB === targetChain;
}

function isPreferredActiveTransferChannel(
  channel: IbcConnectionFile["channels"][number],
  remoteSide: "chain_1" | "chain_2",
  localSide: "chain_1" | "chain_2",
): boolean {
  const remote = channel[remoteSide];
  const local = channel[localSide];

  if (remote.port_id !== "transfer" || local.port_id !== "transfer") {
    return false;
  }

  const status = channel.tags?.status;
  const preferred = channel.tags?.preferred;

  return status === "ACTIVE" && preferred === true;
}

export async function discoverConnections(
  client: RegistryClient,
  targetChain: string,
): Promise<IbcConnection[]> {
  const filenames = await client.listIbcFiles();
  const matching = filenames.filter((name) => matchesTarget(name, targetChain));

  const connections = new Map<string, IbcConnection>();

  for (const filename of matching) {
    let data: IbcConnectionFile;
    try {
      data = await client.fetchJson<IbcConnectionFile>(`_IBC/${filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping ${filename}: ${message}`);
      continue;
    }

    const targetIsChain1 = data.chain_1.chain_name === targetChain;
    const targetIsChain2 = data.chain_2.chain_name === targetChain;

    if (!targetIsChain1 && !targetIsChain2) {
      continue;
    }

    const remoteSide = targetIsChain1 ? "chain_2" : "chain_1";
    const localSide = targetIsChain1 ? "chain_1" : "chain_2";
    const remoteMeta = data[remoteSide];
    const localMeta = data[localSide];

    for (const channel of data.channels) {
      if (!isPreferredActiveTransferChannel(channel, remoteSide, localSide)) {
        continue;
      }

      const remoteChannelId = channel[remoteSide].channel_id;
      const localChannelId = channel[localSide].channel_id;
      const key = `${remoteMeta.chain_name}:${remoteChannelId}`;

      connections.set(key, {
        remoteChainName: remoteMeta.chain_name,
        remoteChainId: remoteMeta.chain_id,
        remoteChannelId,
        localChannelId,
        portId: channel[remoteSide].port_id,
      });
    }
  }

  return Array.from(connections.values()).sort((a, b) =>
    a.remoteChainName.localeCompare(b.remoteChainName),
  );
}