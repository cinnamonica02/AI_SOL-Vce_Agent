"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import {
  deriveBusinessPda,
  useVoiceDeskProgram,
} from "@/lib/anchor-client";
import { formatUsdc, truncatePubkey } from "@/lib/utils";

interface BusinessState {
  name: string;
  vertical: string;
  defaultDepositAmount: bigint;
  cancellationHours: number;
}

interface BookingRow {
  pubkey: string;
  bookingIdHex: string;
  customer: string;
  depositAmount: bigint;
  serviceStart: number;
  status: string;
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const program = useVoiceDeskProgram();

  const [business, setBusiness] = useState<BusinessState | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasNoBusiness, setHasNoBusiness] = useState(false);

  useEffect(() => {
    if (!program || !publicKey) return;
    (async () => {
      try {
        const [businessPda] = deriveBusinessPda(publicKey);
        try {
          const acc: any = await (program.account as any).business.fetch(businessPda);
          setBusiness({
            name: acc.name,
            vertical: Object.keys(acc.vertical)[0],
            defaultDepositAmount: BigInt(acc.defaultDepositAmount.toString()),
            cancellationHours: Number(acc.cancellationHours),
          });
          setHasNoBusiness(false);
        } catch {
          setHasNoBusiness(true);
          return;
        }

        // Fetch all bookings whose `business` field == this PDA
        const businessOffset = 8 + 32; // discriminator + booking_id
        const all: any[] = await (program.account as any).booking.all([
          {
            memcmp: {
              offset: businessOffset,
              bytes: businessPda.toBase58(),
            },
          },
        ]);
        setBookings(
          all.map((b) => ({
            pubkey: b.publicKey.toBase58(),
            bookingIdHex: Buffer.from(b.account.bookingId).toString("hex"),
            customer: b.account.customer.toBase58(),
            depositAmount: BigInt(b.account.depositAmount.toString()),
            serviceStart: Number(b.account.serviceStart),
            status: Object.keys(b.account.status)[0],
          }))
        );
      } catch (err: any) {
        setLoadError(err?.message ?? String(err));
      }
    })();
  }, [program, publicKey]);

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

  if (hasNoBusiness) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">No business yet</h1>
          <p className="text-muted-foreground">
            Wallet {truncatePubkey(publicKey!.toBase58())} nie ma jeszcze biznesu on-chain.
          </p>
          <Link
            href="/business/new"
            className="inline-block px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Onboard new business
          </Link>
        </div>
      </main>
    );
  }

  const lockedTotal = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((acc, b) => acc + b.depositAmount, 0n);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{business?.name ?? "Dashboard"}</h1>
            <p className="text-sm text-muted-foreground">
              {business?.vertical} · default deposit{" "}
              {business ? formatUsdc(business.defaultDepositAmount) : "—"} USDC ·
              cancellation {business?.cancellationHours}h
            </p>
          </div>
          <WalletMultiButton />
        </header>

        {loadError && (
          <div className="text-sm text-red-600">{loadError}</div>
        )}

        <section className="grid grid-cols-3 gap-4">
          <Card label="Total bookings" value={String(bookings.length)} />
          <Card label="Deposits locked" value={`${formatUsdc(lockedTotal)} USDC`} />
          <Card
            label="No-show recoveries"
            value={String(bookings.filter((b) => b.status === "claimed").length)}
          />
        </section>

        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Bookings</h2>
            <Link
              href="/business/new"
              className="text-sm text-primary underline"
            >
              + Onboard another business
            </Link>
          </div>
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center text-muted-foreground">
              No bookings yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Booking</th>
                    <th className="text-left px-4 py-2">Customer</th>
                    <th className="text-left px-4 py-2">Deposit</th>
                    <th className="text-left px-4 py-2">Service start</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.pubkey} className="border-t border-border">
                      <td className="px-4 py-2">
                        <code className="text-xs">{b.bookingIdHex.slice(0, 12)}…</code>
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs">{truncatePubkey(b.customer)}</code>
                      </td>
                      <td className="px-4 py-2">{formatUsdc(b.depositAmount)} USDC</td>
                      <td className="px-4 py-2">
                        {new Date(b.serviceStart * 1000).toLocaleString("pl-PL")}
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
