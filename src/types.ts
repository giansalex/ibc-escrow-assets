export interface IbcChannelSide {
  channel_id: string;
  port_id: string;
}

export interface IbcChannel {
  chain_1: IbcChannelSide;
  chain_2: IbcChannelSide;
  ordering: string;
  version: string;
  tags?: {
    preferred?: boolean;
    status?: string;
  };
}

export interface IbcConnectionFile {
  chain_1: {
    chain_name: string;
    chain_id: string;
  };
  chain_2: {
    chain_name: string;
    chain_id: string;
  };
  channels: IbcChannel[];
}

export interface ChainRegistryChain {
  chain_name: string;
  chain_id: string;
  pretty_name?: string;
  bech32_prefix: string;
  apis?: {
    rest?: Array<{ address: string; provider?: string }>;
  };
}

export interface DenomUnit {
  denom: string;
  exponent: number;
}

export interface Asset {
  base: string;
  display: string;
  symbol: string;
  denom_units: DenomUnit[];
}

export interface AssetList {
  chain_name: string;
  assets: Asset[];
}

export interface IbcConnection {
  remoteChainName: string;
  remoteChainId: string;
  remoteChannelId: string;
  localChannelId: string;
  portId: string;
}

export interface CoinBalance {
  denom: string;
  amount: string;
}

export interface FormattedBalance {
  denom: string;
  amount: string;
  display: string;
  symbol: string;
}

export interface EscrowRow {
  remoteChainName: string;
  remotePrettyName: string;
  remoteChannelId: string;
  localChannelId: string;
  escrowAddress: string;
  balances: FormattedBalance[];
  restEndpoint?: string;
  status: "ok" | "error";
  error?: string;
}

export interface ReportData {
  targetChainName: string;
  targetChainId: string;
  targetPrettyName: string;
  generatedAt: string;
  rows: EscrowRow[];
}