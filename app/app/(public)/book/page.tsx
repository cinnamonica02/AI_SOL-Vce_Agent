/**
 * Customer-facing voice agent landing page.
 *
 * MVP: embeds the ElevenLabs Conversational AI widget.
 * Wallet not required at this step — customer signs the deposit later
 * via /pay/[bookingId] using Phantom (or Privy in Phase 2).
 */
export default function BookPage() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Porozmawiaj z asystentem</h1>
          <p className="text-muted-foreground">
            Powiedz, co chciałbyś zarezerwować — termin, usługę, pytania.
          </p>
        </header>

        <div className="rounded-2xl border border-border p-8 bg-muted/30 min-h-[400px] flex items-center justify-center">
          {agentId ? (
            <p className="text-center text-muted-foreground">
              ElevenLabs widget loads here.
              <br />
              Agent ID: <code className="text-xs">{agentId}</code>
            </p>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-amber-600">⚠ Voice agent not configured</p>
              <p className="text-sm text-muted-foreground">
                Set <code>NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code> in <code>.env</code>
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Po potwierdzeniu rezerwacji przejdziesz do strony depozytu
          (Phantom wallet wymagany).
        </p>
      </div>
    </main>
  );
}
