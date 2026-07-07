import type { EscrowRow, FormattedBalance, ReportData } from "../types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderBalances(balances: FormattedBalance[]): string {
  if (balances.length === 0) {
    return '<span class="zero">0</span>';
  }

  return balances
    .map(
      (balance) =>
        `<div class="balance-item"><strong>${escapeHtml(balance.symbol)}</strong> ${escapeHtml(balance.display)} <span class="denom">(${escapeHtml(balance.denom)})</span></div>`,
    )
    .join("");
}

function renderRow(row: EscrowRow): string {
  const statusClass = row.status === "ok" ? "status-ok" : "status-error";
  const statusText =
    row.status === "ok" ? "ok" : escapeHtml(row.error ?? "error");

  return `<tr>
    <td>${escapeHtml(row.remotePrettyName)}<div class="muted">${escapeHtml(row.remoteChainName)}</div></td>
    <td><code>${escapeHtml(row.remoteChannelId)}</code></td>
    <td><code>${escapeHtml(row.localChannelId)}</code></td>
    <td><code class="address">${escapeHtml(row.escrowAddress)}</code></td>
    <td>${renderBalances(row.balances)}</td>
    <td>${row.restEndpoint ? `<span class="muted">${escapeHtml(row.restEndpoint)}</span>` : "—"}</td>
    <td class="${statusClass}">${statusText}</td>
  </tr>`;
}

export function generateHtmlReport(data: ReportData): string {
  const nonZeroRows = data.rows.filter((row) => row.balances.length > 0).length;
  const errorRows = data.rows.filter((row) => row.status === "error").length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IBC Escrow Report - ${escapeHtml(data.targetPrettyName)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f5f7fb;
      --card: #ffffff;
      --text: #1f2937;
      --muted: #6b7280;
      --border: #d1d5db;
      --accent: #2563eb;
      --ok: #047857;
      --error: #b91c1c;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --card: #111827;
        --text: #e5e7eb;
        --muted: #9ca3af;
        --border: #374151;
        --accent: #60a5fa;
        --ok: #34d399;
        --error: #f87171;
      }
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 1.75rem;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }

    .stat {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      min-width: 140px;
    }

    .stat strong {
      display: block;
      font-size: 1.1rem;
      color: var(--accent);
    }

    .table-wrap {
      overflow-x: auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1100px;
    }

    th, td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      text-align: left;
    }

    th {
      background: var(--bg);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
    }

    tr:last-child td { border-bottom: none; }

    code {
      font-family: Consolas, Monaco, monospace;
      font-size: 0.85rem;
      word-break: break-all;
    }

    .address { color: var(--accent); }
    .muted { color: var(--muted); font-size: 0.85rem; }
    .zero { color: var(--muted); }
    .denom { color: var(--muted); font-size: 0.8rem; }
    .balance-item + .balance-item { margin-top: 6px; }
    .status-ok { color: var(--ok); font-weight: 600; }
    .status-error { color: var(--error); font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IBC Escrow Balances: ${escapeHtml(data.targetPrettyName)}</h1>
      <div class="meta">
        <span>Chain: <strong>${escapeHtml(data.targetChainName)}</strong></span>
        <span>Chain ID: <strong>${escapeHtml(data.targetChainId)}</strong></span>
        <span>Generated: <strong>${escapeHtml(data.generatedAt)}</strong></span>
      </div>
      <div class="stats">
        <div class="stat"><strong>${data.rows.length}</strong>connections</div>
        <div class="stat"><strong>${nonZeroRows}</strong>with balance</div>
        <div class="stat"><strong>${errorRows}</strong>errors</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Remote Chain</th>
            <th>Remote Channel</th>
            <th>Local Channel</th>
            <th>Escrow Address</th>
            <th>Balances</th>
            <th>REST Endpoint</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.rows.map(renderRow).join("")}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}