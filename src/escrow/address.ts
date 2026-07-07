import { fromBech32, toBech32 } from "@cosmjs/encoding";
import { createHash } from "node:crypto";

const ICS20_VERSION = "ics20-1";
const DEFAULT_PORT = "transfer";

export function getEscrowAddress(
  portId: string,
  channelId: string,
  bech32Prefix: string,
): string {
  const contents = `${portId}/${channelId}`;
  const preImage = Buffer.concat([
    Buffer.from(ICS20_VERSION, "utf8"),
    Buffer.from([0]),
    Buffer.from(contents, "utf8"),
  ]);

  const hash = createHash("sha256").update(preImage).digest();
  const addressBytes = hash.subarray(0, 20);

  return toBech32(bech32Prefix, addressBytes);
}

export function getTransferEscrowAddress(
  channelId: string,
  bech32Prefix: string,
): string {
  return getEscrowAddress(DEFAULT_PORT, channelId, bech32Prefix);
}

export function validateBech32Prefix(prefix: string): void {
  try {
    const sample = toBech32(prefix, new Uint8Array(20));
    fromBech32(sample);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid bech32 prefix "${prefix}": ${message}`);
  }
}