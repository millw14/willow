"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WishStatus } from "@/lib/types";

export function useWishStatus() {
  const { publicKey, connected } = useWallet();
  const address = publicKey?.toBase58() ?? null;
  const [status, setStatus] = useState<WishStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/wish-status?wallet=${encodeURIComponent(address)}`);
      const data = (await res.json()) as WishStatus;
      setStatus(data);
    } catch {
      setStatus({ hasWished: false });
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { address, connected, status, loading, refresh, setStatus };
}
