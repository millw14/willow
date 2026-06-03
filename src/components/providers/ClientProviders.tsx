"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// Wallet adapter touches browser globals; load it client-only to avoid SSR noise.
const SolanaWalletProvider = dynamic(
  () => import("./WalletProvider").then((m) => m.SolanaWalletProvider),
  { ssr: false },
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
