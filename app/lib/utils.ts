import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-style class concat helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate a base58 pubkey for display: "Abc1...XyZ9" */
export function truncatePubkey(pubkey: string, head = 4, tail = 4): string {
  if (pubkey.length <= head + tail) return pubkey;
  return `${pubkey.slice(0, head)}…${pubkey.slice(-tail)}`;
}

/** USDC base units → display string with 2 decimals. */
export function formatUsdc(baseUnits: bigint | number): string {
  const n = typeof baseUnits === "bigint" ? Number(baseUnits) : baseUnits;
  return (n / 1_000_000).toFixed(2);
}
