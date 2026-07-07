import type { AssetList, CoinBalance, FormattedBalance } from "../types.js";

function findAsset(assetList: AssetList | null, denom: string) {
  return assetList?.assets.find((asset) => asset.base === denom || asset.display === denom);
}

function getExponent(assetList: AssetList | null, denom: string): number {
  const asset = findAsset(assetList, denom);
  if (!asset) {
    return 0;
  }

  const displayUnit = asset.denom_units.find((unit) => unit.denom === asset.display);
  return displayUnit?.exponent ?? 0;
}

function formatAmount(rawAmount: string, exponent: number): string {
  if (exponent === 0) {
    return rawAmount;
  }

  const padded = rawAmount.padStart(exponent + 1, "0");
  const whole = padded.slice(0, -exponent) || "0";
  const fraction = padded.slice(-exponent).replace(/0+$/, "");

  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function formatBalance(
  balance: CoinBalance,
  assetList: AssetList | null,
): FormattedBalance {
  const asset = findAsset(assetList, balance.denom);
  const exponent = getExponent(assetList, balance.denom);
  const symbol = asset?.symbol ?? balance.denom;
  const display = asset?.display ?? balance.denom;

  return {
    denom: balance.denom,
    amount: balance.amount,
    display: formatAmount(balance.amount, exponent),
    symbol,
  };
}

export function formatBalances(
  balances: CoinBalance[],
  assetList: AssetList | null,
): FormattedBalance[] {
  return balances
    .filter((balance) => balance.amount !== "0")
    .map((balance) => formatBalance(balance, assetList))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}