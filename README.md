# IBC Escrow Report

CLI tool that generates an HTML report of **ICS-20 escrow balances** held on remote Cosmos chains for a given target chain. It discovers IBC transfer channels from the [cosmos/chain-registry](https://github.com/cosmos/chain-registry), derives each remote escrow address, queries balances over REST, and writes a self-contained HTML table you can open in a browser.

## Requirements

- **Node.js** 18+ (uses native `fetch` and ES modules)
- Network access to GitHub (chain-registry) and remote chain REST APIs

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/giansalex/ibc-escrow-assets.git
cd ibc-escrow-tokens
npm install
npm run build
```

### Run locally

After building, invoke the CLI directly:

```bash
node dist/index.js --chain osmosis
```

Or use the npm scripts:

```bash
npm start -- --chain osmosis
npm run dev -- --chain neutron   # rebuilds then runs
```

## Usage

```bash
ibc-escrow-report --chain <name> [options]
```

### Required

| Option | Description |
|--------|-------------|
| `--chain <name>` | Target chain `chain_name` from chain-registry (e.g. `osmosis`, `cosmoshub`, `neutron`, `juno`) |

### Optional

| Option | Default | Description |
|--------|---------|-------------|
| `--output <path>` | `ibc-escrow-<chain>-<date>.html` | Output HTML file path |
| `--registry-ref <ref>` | `master` | Git ref/branch/tag for chain-registry |
| `--concurrency <n>` | `10` | Max parallel balance queries against remote chains |

### Examples

Generate a report for Osmosis (default output filename):

```bash
ibc-escrow-report --chain osmosis
```

Write to a custom path:

```bash
ibc-escrow-report --chain neutron --output reports/neutron-escrow.html
```

Use a specific chain-registry ref and lower concurrency:

```bash
ibc-escrow-report --chain cosmoshub --registry-ref v16.1.0 --concurrency 5
```

Progress and summary are printed to **stderr**; the HTML file is the only file output:

```
Loading target chain: osmosis
Discovering IBC connections from chain-registry...
Found 42 connections. Querying remote escrow balances...
[1/42] cosmoshub (ok)
...
Report written to ibc-escrow-osmosis-2026-07-07.html
Completed: 38 ok, 4 errors
```

## Development

```bash
npm run build   # Compile TypeScript to dist/
```
