# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

**ibc-escrow-report** is a Node.js CLI that generates a self-contained HTML report of **ICS-20 escrow balances** held on remote Cosmos chains for a given target chain.

Pipeline:

1. Load the target chain from [cosmos/chain-registry](https://github.com/cosmos/chain-registry)
2. Discover IBC transfer connections under `_IBC/`
3. Derive each remote ICS-20 escrow address (`transfer` port + remote channel id)
4. Query balances via remote REST APIs
5. Format denoms using asset lists and write an HTML report

Package name: `ibc-escrow-report` · Binary: `ibc-escrow-report` · Repo folder may be named `ibc-escrow-tokens`.

## Stack

| Item | Value |
|------|--------|
| Runtime | Node.js **18+** (native `fetch`, ES modules) |
| Language | TypeScript (`strict`, target **ES2022**) |
| Module system | ESM (`"type": "module"`, `module`/`moduleResolution`: **NodeNext**) |
| CLI | `commander` |
| Crypto / bech32 | `@cosmjs/encoding`, Node `crypto` (SHA-256) |
| Tests | None currently |
| Lint / format | None currently |

## Source layout

```
src/
  index.ts                 # CLI entry (commander), orchestration
  types.ts                 # Shared interfaces (registry shapes, report rows)
  balance/client.ts        # REST balance queries + concurrency helper
  escrow/address.ts        # ICS-20 escrow address derivation
  registry/
    client.ts              # GitHub raw + API client for chain-registry
    chain.ts               # Load chain.json / assetlist.json, REST endpoints
    ibc.ts                 # Discover preferred transfer connections
    excluded-networks.ts   # Built-in denylist of dead networks
  report/html.ts           # Self-contained HTML report generation
  utils/denom.ts           # Denom → display amount / symbol formatting
dist/                      # tsc output (gitignored)
*.html                     # Generated reports (gitignored)
```

Compile maps `src/**/*.ts` → `dist/**/*.js` with declarations and source maps.

## Build and run

```bash
npm install
npm run build              # tsc → dist/
npm start -- --chain <name>
npm run dev -- --chain <name>   # build then run

# equivalent after build:
node dist/index.js --chain osmosis
```

### CLI options

| Option | Default | Notes |
|--------|---------|--------|
| `--chain <name>` | required | chain-registry `chain_name` (e.g. `osmosis`, `noble`) |
| `--output <path>` | `ibc-escrow-<chain>-<date>.html` | Report path |
| `--registry-ref <ref>` | `master` | chain-registry git ref |
| `--concurrency <n>` | `10` | Max parallel remote balance queries |
| `--exclude <names>` | — | Extra remotes to skip (comma-separated; merged with built-in denylist) |

Progress goes to **stderr**; the HTML file is the only filesystem output.

## Architecture notes

### Registry access

- `RegistryClient` reads from `https://raw.githubusercontent.com/cosmos/chain-registry/{ref}/...`
- Lists `_IBC` via GitHub Contents API: `https://api.github.com/repos/cosmos/chain-registry/contents/_IBC?ref=...`
- IBC pair files are named `{chainA}-{chainB}.json`
- Chain data: `{chain_name}/chain.json`; assets: `{chain_name}/assetlist.json`
- In-memory caches for chains and asset lists live in `registry/chain.ts`

### Escrow addresses

ICS-20 escrow address (port `transfer`, version `ics20-1`):

- Preimage: `utf8("ics20-1") || 0x00 || utf8("{portId}/{channelId}")`
- Address bytes: first 20 bytes of SHA-256(preimage)
- Encode with remote chain `bech32_prefix` via `@cosmjs/encoding`

Use `getTransferEscrowAddress(remoteChannelId, bech32Prefix)` for the common case.

### Balance queries

- REST path: `/cosmos/bank/v1beta1/balances/{address}` (paginated)
- 15s timeout; try each REST endpoint from the remote chain until one succeeds
- Concurrency controlled by `mapWithConcurrency`

### Connection discovery

- Prefer `transfer` port on both sides of the channel
- Built-in excluded networks always applied (`DEFAULT_EXCLUDED_NETWORKS`); CLI `--exclude` merges in more
- Per-row failures become `status: "error"` rows in the report; only total discovery failure aborts the run

## Code conventions

1. **ESM imports with `.js` extensions** in TypeScript sources (NodeNext requirement), e.g. `from "./types.js"`.
2. **Strict TypeScript** — no implicit any; keep types in `src/types.ts` when shared.
3. **Small focused modules** — one concern per folder (`registry/`, `escrow/`, `balance/`, `report/`).
4. **Errors**: throw `Error` with actionable messages; CLI catches top-level failures, sets `process.exitCode = 1`, logs to stderr.
5. **Logging**: user-facing progress on `console.error`; do not log secrets (there are none today).
6. **No external HTML libs** — report HTML is built as template strings with `escapeHtml`.
7. **Do not add dependencies** unless needed; prefer Node built-ins and existing packages.

## Domain constraints

- Network access is required (GitHub + many chain REST APIs). Offline runs will fail.
- GitHub API rate limits can affect `listIbcFiles()` when unauthenticated.
- Remote REST nodes are flaky; design assumes partial failures (error rows) rather than all-or-nothing.
- `chain_name` values are lowercase registry identifiers, not pretty names or chain IDs.
- Generated `*.html` reports and `dist/` are gitignored — do not commit them.

## Making changes safely

| Area | Touch | Watch out for |
|------|--------|----------------|
| CLI flags / orchestration | `src/index.ts` | Keep stderr-only progress; default output naming |
| Escrow derivation | `src/escrow/address.ts` | Byte-for-byte ICS-20 compatibility; do not “simplify” the preimage |
| Registry schema | `src/types.ts`, `registry/*` | Match chain-registry JSON shapes |
| Denylist | `src/registry/excluded-networks.ts` | Only permanent shutdowns / unusable nets in the default list |
| HTML report | `src/report/html.ts` | Always escape user/registry strings |
| Balance client | `src/balance/client.ts` | Pagination, timeouts, multi-endpoint fallback |

After code changes:

```bash
npm run build
# smoke test (needs network):
npm start -- --chain noble --concurrency 3
```

## Out of scope / non-goals

- Signing transactions or holding keys
- Indexer / historical state
- Non–ICS-20 ports or IBC apps other than transfer
- Permanent local cache of chain-registry (fetch each run)

## Quick mental model

**Target chain** = the chain whose *remote* escrows you inspect. For each IBC transfer connection, the tool queries the **remote** chain’s bank balances at the escrow address that holds tokens locked for that channel back to the target.
