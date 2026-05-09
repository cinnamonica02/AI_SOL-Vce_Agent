import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletProvider } from "@/components/providers/wallet-provider";

export const metadata: Metadata = {
  title: "VoiceDesk — Voice Booking + On-Chain Deposits",
  description:
    "Voice-initiated lock-and-release deposit primitive on Solana. " +
    "Hotels, car rentals, ski rentals, restaurants, dental, salons.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
