"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

/**
 * SMB onboarding — calls `create_business` instruction.
 *
 * MVP UI: minimal form. Day 3: hook up real Anchor client and submit tx.
 */
export default function NewBusinessPage() {
  const { connected } = useWallet();
  const [vertical, setVertical] = useState("Hotel");
  const [name, setName] = useState("");
  const [depositPln, setDepositPln] = useState("50");
  const [cancellationHours, setCancellationHours] = useState("24");

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
    // TODO Day 3: call program.methods.createBusiness(...)
    alert(
      `TODO: submit create_business tx\nvertical=${vertical}, name=${name}, deposit=${depositPln} PLN, cancellation=${cancellationHours}h`
    );
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
              <option>Hotel</option>
              <option>CarRental</option>
              <option>SkiRental</option>
              <option>EquipmentRental</option>
              <option>Restaurant</option>
              <option>Dental</option>
              <option>Salon</option>
              <option>Coworking</option>
              <option>Other</option>
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
              value={depositPln}
              onChange={(e) => setDepositPln(e.target.value)}
              min={1}
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
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Create business on-chain
          </button>
        </form>
      </div>
    </main>
  );
}
