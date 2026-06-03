"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SolanaWalletProvider } from "./WalletProvider";

/**
 * Wallet adapters need the browser — but the site must still render on the
 * server and on first paint. Never wrap the entire tree in dynamic(ssr:false).
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
