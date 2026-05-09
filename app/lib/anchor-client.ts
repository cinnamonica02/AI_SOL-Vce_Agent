/**
 * Anchor client — typed wrapper around the VoiceDesk program.
 *
 * IDL is loaded from `app/lib/idl/voicedesk.json`. After every `anchor build`,
 * sync the IDL with:
 *   cp target/idl/voicedesk.json app/lib/idl/voicedesk.json
 * (committed to git so Vercel builds work without anchor toolchain).
 */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useMemo } from "react";

// IDL is committed under app/lib/idl/. Until first sync the file is a stub.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import idlJson from "./idl/voicedesk.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    (idlJson as any)?.address ??
    "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// ─── Provider hook ───────────────────────────────────────────────

export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);
}

// ─── Program hook ────────────────────────────────────────────────

/**
 * Returns a configured Program<any>. Returns null when wallet not connected
 * OR when IDL is the placeholder stub (first run before `anchor build`).
 */
export function useVoiceDeskProgram(): Program<Idl> | null {
  const provider = useAnchorProvider();
  return useMemo(() => {
    if (!provider) return null;
    if (!idlJson || !(idlJson as any).instructions) {
      console.warn(
        "VoiceDesk IDL is a stub — run `anchor build` and sync target/idl/voicedesk.json"
      );
      return null;
    }
    const idlWithProgramId = {
      ...(idlJson as Idl),
      address: PROGRAM_ID.toBase58(),
    };
    return new Program(idlWithProgramId as Idl, provider);
  }, [provider]);
}

export async function getProgramDeploymentStatus(
  connection: Connection
): Promise<"deployed" | "missing" | "not-executable"> {
  const account = await connection.getAccountInfo(PROGRAM_ID, "confirmed");
  if (!account) return "missing";
  return account.executable ? "deployed" : "not-executable";
}

export function getProgramExplorerUrl(): string {
  const cluster = process.env.NEXT_PUBLIC_NETWORK ?? "devnet";
  return `https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=${cluster}`;
}

// ─── PDA derivation ──────────────────────────────────────────────

export function deriveBusinessPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [utf8Bytes("business"), owner.toBytes()],
    PROGRAM_ID
  );
}

export function deriveBookingPda(bookingId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [utf8Bytes("booking"), bookingId],
    PROGRAM_ID
  );
}

export function deriveEscrowAuthority(bookingId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [utf8Bytes("escrow"), bookingId],
    PROGRAM_ID
  );
}

// ─── Helpers ────────────────────────────────────────────────────

export function getRpcConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed"
  );
}

/**
 * Anchor enum encoding helper.
 * Vertical "Hotel" → { hotel: {} } as accepted by anchor methods.
 */
export function verticalEnum(name: string): Record<string, Record<string, never>> {
  const camel = name.charAt(0).toLowerCase() + name.slice(1);
  return { [camel]: {} };
}

/** Convert a hex booking_id to bytes. */
export function bookingIdFromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 64) {
    throw new Error(`booking_id must be 32 bytes (64 hex chars), got ${clean.length}`);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

// Re-export for convenience
export { BN, anchor };
