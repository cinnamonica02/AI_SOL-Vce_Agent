"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import {
  BN,
  deriveBusinessPda,
  useVoiceDeskProgram,
  verticalEnum,
} from "@/lib/anchor-client";

const VERTICALS = [
  "Hotel",
  "CarRental",
  "SkiRental",
  "EquipmentRental",
  "Restaurant",
  "Dental",
  "Salon",
  "Coworking",
  "Other",
];

export default function NewBusinessPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const program = useVoiceDeskProgram();

  const [vertical, setVertical] = useState("Hotel");
  const [name, setName] = useState("");
  const [depositUsdc, setDepositUsdc] = useState("50");
  const [cancellationHours, setCancellationHours] = useState("24");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  if (!connected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">Onboard your business</h1>
          <p className="text-muted-foreground">Connect Phantom to continue.</p>
          <WalletMultiButton />
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !publicKey) {
      setError("Program not ready — check IDL is synced");
      return;
    }

    setSubmitting(true);
    setError(null);
    setTxSig(null);

    try {
      const [businessPda] = deriveBusinessPda(publicKey);
      const depositBaseUnits = new BN(Math.floor(parseFloat(depositUsdc) * 1_000_000));

      const sig = await program.methods
        .createBusiness(
          verticalEnum(vertical),
          name,
          depositBaseUnits,
          parseInt(cancellationHours, 10)
        )
        .accounts({
          business: businessPda,
          owner: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxSig(sig);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">New business</h1>
          <p className="text-muted-foreground">
            Tworzymy Business PDA na Solanie. Po utworzeniu możesz odbierać rezerwacje.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branża</label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            >
              {VERTICALS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nazwa</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              required
              placeholder="Hotel Polonia"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Domyślny depozyt (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={depositUsdc}
              onChange={(e) => setDepositUsdc(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Polityka anulowania (godziny)
            </label>
            <input
              type="number"
              value={cancellationHours}
              onChange={(e) => setCancellationHours(e.target.value)}
              min={1}
              max={720}
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-background"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !program}
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting tx…" : "Create business on-chain"}
          </button>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {txSig && (
            <div className="rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-3 text-sm space-y-1">
              <div className="text-green-700 dark:text-green-300 font-medium">
                ✓ Business created
              </div>
              <a
                href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline break-all block"
              >
                {txSig}
              </a>
              <div className="text-xs text-muted-foreground">
                Redirecting to dashboard…
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
