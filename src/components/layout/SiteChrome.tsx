"use client";

import Link from "next/link";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { WalletButton } from "@/components/ui/WalletButton";

export function TopBar({ showWallet = true }: { showWallet?: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="eyebrow text-parchment/80 transition hover:text-parchment">
        ✦ One Wish Willow
      </Link>
      <div className="flex items-center gap-5">
        <SoundToggle />
        {showWallet && <WalletButton />}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-32 border-t border-glow/10 px-6 py-12 text-center">
      <p className="font-display text-2xl text-parchment/70">One Wish Willow</p>
      <p className="eyebrow mt-3 opacity-50">everyone gets one wish · use it carefully</p>
      <nav className="mt-6 flex flex-wrap items-center justify-center gap-6">
        <Link href="/wishes" className="eyebrow opacity-60 transition hover:opacity-100">
          The Wishes
        </Link>
        <Link href="/shop" className="eyebrow opacity-60 transition hover:opacity-100">
          The Shop
        </Link>
        <Link href="/oracle" className="eyebrow opacity-60 transition hover:opacity-100">
          Call the Oracle
        </Link>
      </nav>
    </footer>
  );
}
