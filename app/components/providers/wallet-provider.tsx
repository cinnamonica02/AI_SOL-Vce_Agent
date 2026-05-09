"use client";

import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

const TypedConnectionProvider =
  ConnectionProvider as unknown as ComponentType<{
    endpoint: string;
    children: ReactNode;
  }>;

const TypedSolanaWalletProvider =
  SolanaWalletProvider as unknown as ComponentType<{
    wallets: PhantomWalletAdapter[];
    autoConnect?: boolean;
    children: ReactNode;
  }>;

const TypedWalletModalProvider =
  WalletModalProvider as unknown as ComponentType<{
    children: ReactNode;
  }>;

export function WalletProvider({ children }: { children: ReactNode }) {
  const endpoint =
    process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <TypedConnectionProvider endpoint={endpoint}>
      <TypedSolanaWalletProvider wallets={wallets} autoConnect>
        <TypedWalletModalProvider>{children}</TypedWalletModalProvider>
      </TypedSolanaWalletProvider>
    </TypedConnectionProvider>
  );
}
