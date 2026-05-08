"use client";

import { use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * Customer deposit-payment view.
 *
 * Reached via SMS / chat link after booking conversation finishes.
 * Customer connects wallet and signs `lock_deposit` transaction.
 */
export default function PayPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const { connected, publicKey } = useWallet();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Depozyt rezerwacji</h1>
          <p className="text-muted-foreground">
            Booking ID: <code className="text-xs">{bookingId.slice(0, 12)}…</code>
          </p>
        </header>

        <div className="rounded-2xl border border-border p-6 space-y-4">
          {!connected ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Podłącz portfel, aby zapłacić depozyt.
              </p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Twój portfel:</span>
                  <code className="text-xs">
                    {publicKey?.toBase58().slice(0, 6)}…{publicKey?.toBase58().slice(-4)}
                  </code>
                </div>
                {/* TODO: fetch booking from chain and display real values */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Depozyt:</span>
                  <span className="font-medium">— USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Termin:</span>
                  <span>—</span>
                </div>
              </div>

              <button
                disabled
                className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium opacity-50 cursor-not-allowed"
              >
                Zapłać depozyt (TODO Day 3)
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Depozyt jest zwracany po wizycie. W przypadku no-show — przepada.
        </p>
      </div>
    </main>
  );
}
