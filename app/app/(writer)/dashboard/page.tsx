"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

/**
 * SMB dashboard — Phantom wallet required.
 * Shows business config, live bookings, deposit/refund history.
 */
export default function DashboardPage() {
  const { connected, publicKey } = useWallet();

  if (!connected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">SMB Dashboard</h1>
          <p className="text-muted-foreground">
            Podłącz Phantom wallet, aby zarządzać biznesem.
          </p>
          <WalletMultiButton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {publicKey?.toBase58().slice(0, 8)}…
            </p>
          </div>
          <WalletMultiButton />
        </header>

        {/* TODO Day 3: fetch Business PDA and bookings from chain */}
        <section className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Active bookings</p>
            <p className="text-2xl font-bold mt-1">—</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Deposits locked</p>
            <p className="text-2xl font-bold mt-1">— USDC</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">No-show recoveries</p>
            <p className="text-2xl font-bold mt-1">— USDC</p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent bookings</h2>
            <Link
              href="/business/new"
              className="text-sm text-primary underline"
            >
              + Onboard new business
            </Link>
          </div>
          <div className="rounded-xl border border-border p-8 text-center text-muted-foreground">
            No bookings yet. (TODO: fetch from chain)
          </div>
        </section>
      </div>
    </main>
  );
}
