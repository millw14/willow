"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { Adapter } from "@solana/wallet-adapter-base";

/**
 * Phantom, Solflare, and Backpack all implement the Wallet Standard and are
 * auto-detected by the wallet adapter — no explicit adapters needed. We pass an
 * empty array so the modal lists whatever the seeker has installed.
 */
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC ||
      "https://api.mainnet-beta.solana.com",
    [],
  );

  const wallets = useMemo<Adapter[]>(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
