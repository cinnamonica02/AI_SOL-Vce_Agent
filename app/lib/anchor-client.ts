/**
 * Anchor client — typed wrapper around the VoiceDesk program.
 *
 * Day 3 TODO:
 *   1. After `anchor build`, copy target/idl/voicedesk.json to /app/lib/idl/
 *   2. Generate types via `anchor idl parse` or import from target/types
 *   3. Replace placeholder Program with a real Program<Voicedesk>
 *
 * Usage (after Day 3 wiring):
 *   const program = useVoiceDeskProgram();
 *   await program.methods.createBusiness(...).rpc();
 */

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

/** Custom hook returning a configured AnchorProvider, or null if no wallet. */
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

/**
 * TODO Day 3: replace this stub with a real Program<Voicedesk> instance.
 *
 * export function useVoiceDeskProgram(): Program<Voicedesk> | null {
 *   const provider = useAnchorProvider();
 *   return useMemo(() => {
 *     if (!provider) return null;
 *     return new Program<Voicedesk>(idl, provider);
 *   }, [provider]);
 * }
 */

// ─── PDA derivation helpers (work without IDL) ───────────────────

export function deriveBusinessPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("business"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveBookingPda(bookingId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("booking"), Buffer.from(bookingId)],
    PROGRAM_ID
  );
}

export function deriveEscrowAuthority(bookingId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(bookingId)],
    PROGRAM_ID
  );
}

export function getRpcConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed"
  );
}
