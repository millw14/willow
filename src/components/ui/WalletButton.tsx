"use client";

import dynamic from "next/dynamic";

// WalletMultiButton renders wallet state; load client-only to avoid hydration drift.
export const WalletButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false, loading: () => <span className="eyebrow opacity-50">summoning…</span> },
);
