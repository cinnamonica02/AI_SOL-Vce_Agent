import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">VoiceDesk</h1>
        <p className="text-xl text-muted-foreground">
          Voice-initiated lock-and-release deposit primitive on Solana.
          <br />
          Hotels, car rentals, ski rentals, restaurants, salons, dental clinics.
        </p>

        <div className="flex gap-4 justify-center pt-6">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            SMB dashboard
          </Link>
          <Link
            href="/business/new"
            className="px-6 py-3 rounded-lg border border-border font-medium"
          >
            Onboard business
          </Link>
        </div>

        <p className="text-sm text-muted-foreground pt-12">
          Built for Solana Frontier 2026 · Colosseum × SuperTeam Poland
        </p>
      </div>
    </main>
  );
}
