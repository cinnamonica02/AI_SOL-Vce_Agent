"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import {
  USDC_MINT,
  bookingIdFromHex,
  deriveBookingPda,
  deriveEscrowAuthority,
  useAnchorProvider,
  useVoiceDeskProgram,
} from "@/lib/anchor-client";
import { formatUsdc, truncatePubkey } from "@/lib/utils";

interface BookingState {
  depositAmount: bigint;
  serviceStart: number;
  serviceEnd: number;
  status: string;
  customer: string;
}

export default function PayPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const { bookingId } = params;
  const { connected, publicKey } = useWallet();
  const provider = useAnchorProvider();
  const program = useVoiceDeskProgram();

  const [booking, setBooking] = useState<BookingState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch booking state on mount
  useEffect(() => {
    if (!program) return;
    (async () => {
      try {
        const idBytes = bookingIdFromHex(bookingId);
        const [bookingPda] = deriveBookingPda(idBytes);
        const acc: any = await (program.account as any).booking.fetch(bookingPda);
        setBooking({
          depositAmount: BigInt(acc.depositAmount.toString()),
          serviceStart: Number(acc.serviceStart),
          serviceEnd: Number(acc.serviceEnd),
          status: Object.keys(acc.status)[0],
          customer: acc.customer.toBase58(),
        });
      } catch (err: any) {
        setLoadError(err?.message ?? "Failed to load booking");
      }
    })();
  }, [program, bookingId]);

  async function handlePayDeposit() {
    if (!program || !publicKey || !provider) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const idBytes = bookingIdFromHex(bookingId);
      const [bookingPda] = deriveBookingPda(idBytes);
      const [escrowAuthority] = deriveEscrowAuthority(idBytes);

      const customerAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const escrowAta = await getAssociatedTokenAddress(
        USDC_MINT,
        escrowAuthority,
        true /* allowOwnerOffCurve */
      );

      // Create both ATAs idempotently in case they don't exist yet
      const preIxs = [
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          customerAta,
          publicKey,
          USDC_MINT
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          escrowAta,
          escrowAuthority,
          USDC_MINT
        ),
      ];

      const sig = await program.methods
        .lockDeposit()
        .accounts({
          booking: bookingPda,
          customer: publicKey,
          customerTokenAccount: customerAta,
          escrowTokenAccount: escrowAta,
          escrowAuthority,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(preIxs)
        .rpc();

      setTxSig(sig);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Depozyt rezerwacji</h1>
          <p className="text-muted-foreground text-sm">
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
          ) : loadError ? (
            <p className="text-sm text-red-600">⚠ {loadError}</p>
          ) : !booking ? (
            <p className="text-sm text-muted-foreground text-center">Ładowanie…</p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <Row label="Twój portfel" value={truncatePubkey(publicKey!.toBase58())} />
                <Row label="Depozyt" value={`${formatUsdc(booking.depositAmount)} USDC`} />
                <Row
                  label="Termin"
                  value={new Date(booking.serviceStart * 1000).toLocaleString("pl-PL")}
                />
                <Row label="Status" value={booking.status} />
              </div>

              <button
                onClick={handlePayDeposit}
                disabled={submitting || booking.status !== "pending" || !!txSig}
                className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {submitting
                  ? "Podpisywanie…"
                  : booking.status !== "pending"
                  ? `Booking ${booking.status}`
                  : "Zapłać depozyt"}
              </button>

              {submitError && (
                <div className="text-sm text-red-600">{submitError}</div>
              )}
              {txSig && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-sm space-y-1">
                  <div className="text-green-700 dark:text-green-300 font-medium">
                    ✓ Depozyt zablokowany
                  </div>
                  <a
                    href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline break-all block"
                  >
                    {txSig}
                  </a>
                </div>
              )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
