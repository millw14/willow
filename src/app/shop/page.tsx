import type { Metadata } from "next";
import { ParticleField } from "@/components/scene/ParticleField";
import { Shop } from "@/components/shop/Shop";
import { TopBar, SiteFooter } from "@/components/layout/SiteChrome";

export const metadata: Metadata = {
  title: "The Shop — One Wish Willow",
  description: "A curiosity shop of artifacts. Each object kept like a museum exhibit.",
};

export default function ShopPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <ParticleField intensity={0.18} />
      <TopBar />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-10 pt-32">
        <div className="mb-16 text-center">
          <span className="eyebrow">the curiosity shop</span>
          <h1 className="prophecy mt-4 text-5xl text-parchment text-glow-warm sm:text-6xl">
            Artifacts kept under glass.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted">
            Not a store. A collection. Each object has been held, wished upon, and returned
            to its pedestal. You may take one home.
          </p>
        </div>
        <Shop />
      </div>
      <SiteFooter />
    </main>
  );
}
