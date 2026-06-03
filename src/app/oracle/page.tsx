import type { Metadata } from "next";
import { ParticleField } from "@/components/scene/ParticleField";
import { OraclePhone } from "@/components/oracle/OraclePhone";
import { TopBar, SiteFooter } from "@/components/layout/SiteChrome";

export const metadata: Metadata = {
  title: "Call the Oracle — One Wish Willow",
  description: "Speak your wish into the dark and the Keeper answers aloud.",
};

export default function OraclePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <ParticleField intensity={0.16} />
      <TopBar />
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pt-24">
        <OraclePhone />
      </div>
      <SiteFooter />
    </main>
  );
}
