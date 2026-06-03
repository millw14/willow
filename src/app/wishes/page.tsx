import type { Metadata } from "next";
import { ParticleField } from "@/components/scene/ParticleField";
import { WishArchive } from "@/components/wishes/WishArchive";
import { WishCounter } from "@/components/counter/WishCounter";
import { TopBar, SiteFooter } from "@/components/layout/SiteChrome";

export const metadata: Metadata = {
  title: "The Wishes — One Wish Willow",
  description: "Every wish ever cast into the Willow, drifting in the dark.",
};

export default function WishesPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField intensity={0.2} />
      <TopBar />
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-10 pt-32">
        <div className="mb-16 flex flex-col items-center gap-8 text-center">
          <span className="eyebrow">the wishes</span>
          <h1 className="prophecy text-5xl text-parchment text-glow-warm sm:text-6xl">
            Everything the Willow remembers.
          </h1>
          <WishCounter />
        </div>
        <WishArchive />
      </div>
      <SiteFooter />
    </main>
  );
}
