"use client";

import { useEffect, useState } from "react";
import * as sound from "@/lib/sound";

export function SoundToggle() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(sound.isMuted());
  }, []);

  function toggle() {
    const next = !muted;
    sound.resumeAudio();
    sound.setMuted(next);
    if (!next) sound.startAmbient();
    setMutedState(next);
  }

  return (
    <button
      onClick={toggle}
      className="eyebrow flex items-center gap-2 opacity-60 transition hover:opacity-100"
      aria-label={muted ? "Unmute the willow" : "Mute the willow"}
    >
      <span className="text-base leading-none">{muted ? "◌" : "◍"}</span>
      {muted ? "silence" : "sound"}
    </button>
  );
}
