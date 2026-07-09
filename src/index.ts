#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import { mapWithConcurrency, queryBalances } from "./balance/client.js";
import { getTransferEscrowAddress } from "./escrow/address.js";
import { generateHtmlReport } from "./report/html.js";
import { getRestEndpoints, loadAssetList, loadChain, loadTargetChain } from "./registry/chain.js";
import {
  buildExcludedNetworkSet,
  parseExcludeOption,
} from "./registry/excluded-networks.js";
import { discoverConnections } from "./registry/ibc.js";
import { RegistryClient } from "./registry/client.js";
import type { EscrowRow, IbcConnection } from "./types.js";
import { formatBalances } from "./utils/denom.js";

interface CliOptions {
  chain: string;
  output?: string;
  registryRef: string;
  concurrency: string;
  exclude?: string;
}

function defaultOutputPath(chainName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ibc-escrow-${chainName}-${date}.html`;
}

function errorRow(connection: IbcConnection, error: unknown): EscrowRow {
  const message = error instanceof Error ? error.message : String(error);
  return {
    remoteChainName: connection.remoteChainName,
    remotePrettyName: connection.remoteChainName,
    remoteChannelId: connection.remoteChannelId,
    localChannelId: connection.localChannelId,
    escrowAddress: "—",
    balances: [],
    status: "error",
    error: message,
  };
}

async function buildEscrowRow(
  client: RegistryClient,
  connection: IbcConnection,
): Promise<EscrowRow> {
  let remoteChain;
  try {
    remoteChain = await loadChain(client, connection.remoteChainName);
  } catch (error) {
    return errorRow(connection, error);
  }

  const assetList = await loadAssetList(client, connection.remoteChainName);
  const restEndpoints = getRestEndpoints(remoteChain);

  const escrowAddress = getTransferEscrowAddress(
    connection.remoteChannelId,
    remoteChain.bech32_prefix,
  );

  try {
    const { balances, restEndpoint } = await queryBalances(restEndpoints, escrowAddress);

    return {
      remoteChainName: connection.remoteChainName,
      remotePrettyName: remoteChain.pretty_name ?? connection.remoteChainName,
      remoteChannelId: connection.remoteChannelId,
      localChannelId: connection.localChannelId,
      escrowAddress,
      balances: formatBalances(balances, assetList),
      restEndpoint,
      status: "ok",
    };
  } catch (error) {
    return {
      ...errorRow(connection, error),
      remotePrettyName: remoteChain.pretty_name ?? connection.remoteChainName,
      escrowAddress,
    };
  }
}

async function run(options: CliOptions): Promise<void> {
  const targetChain = options.chain.trim().toLowerCase();
  const concurrency = Math.max(1, Number.parseInt(options.concurrency, 10) || 10);
  const client = new RegistryClient(options.registryRef);

  console.error(`Loading target chain: ${targetChain}`);
  const target = await loadTargetChain(client, targetChain);

  const excluded = buildExcludedNetworkSet(parseExcludeOption(options.exclude));
  if (excluded.size > 0) {
    console.error(
      `Excluding ${excluded.size} remote network(s) from discovery (built-in + --exclude)`,
    );
  }

  console.error("Discovering IBC connections from chain-registry...");
  const connections = await discoverConnections(client, targetChain, excluded);

  if (connections.length === 0) {
    throw new Error(`No preferred ACTIVE transfer IBC connections found for "${targetChain}".`);
  }

  console.error(`Found ${connections.length} connections. Querying remote escrow balances...`);

  let completed = 0;
  const rows = await mapWithConcurrency(connections, concurrency, async (connection) => {
    const row = await buildEscrowRow(client, connection);
    completed += 1;
    console.error(`[${completed}/${connections.length}] ${connection.remoteChainName} (${row.status})`);
    return row;
  });

  rows.sort((a, b) => a.remotePrettyName.localeCompare(b.remotePrettyName));

  const report = generateHtmlReport({
    targetChainName: target.chain_name,
    targetChainId: target.chain_id,
    targetPrettyName: target.pretty_name ?? target.chain_name,
    generatedAt: new Date().toISOString(),
    rows,
  });

  const outputPath = options.output ?? defaultOutputPath(targetChain);
  await writeFile(outputPath, report, "utf8");

  const okCount = rows.filter((row) => row.status === "ok").length;
  const errorCount = rows.filter((row) => row.status === "error").length;

  console.error(`Report written to ${outputPath}`);
  console.error(`Completed: ${okCount} ok, ${errorCount} errors`);
}

const program = new Command();

program
  .name("ibc-escrow-report")
  .description("Generate an HTML report of IBC escrow balances on remote connected chains")
  .requiredOption("--chain <name>", "Target chain name from chain-registry (e.g. osmosis)")
  .option("--output <path>", "Output HTML file path")
  .option("--registry-ref <ref>", "chain-registry git ref", "master")
  .option("--concurrency <n>", "Max parallel remote balance queries", "10")
  .option(
    "--exclude <names>",
    "Comma-separated remote chain_name values to skip (merged with built-in list)",
  )
  .action(async (options: CliOptions) => {
    try {
      await run(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exitCode = 1;
    }
  });

program.parse();