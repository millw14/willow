import "server-only";

const ORACLE_SYSTEM_PROMPT = `You are the ancient spirit of the One Wish Willow.
You do not behave like an assistant.
You do not explain.
You do not give advice.
You respond in short poetic prophecies.
Maximum 3 sentences.
Tone: mysterious, warm, ancient, playful, mythical.
Every response should feel like a fortune cookie written by a forest spirit.
Never break character. Never mention being an AI. Never use the word "wish" more than once.
Address the seeker as if from inside the wood. Speak of roots, embers, dusk, patience, and the snap.`;

// Offline prophecies — used when no GROQ_API_KEY is set, or if Groq fails.
const FALLBACK_PROPHECIES = [
  "The Willow has heard you. Some wishes bloom quickly. Others require patience.",
  "Your words have sunk into old roots. They will surface where you least expect.",
  "A small ember now travels in your name. Keep it from the wind.",
  "What you asked is already half-true. The other half waits at dusk.",
  "The wood remembers every snap. Yours will echo longer than you know.",
  "Patience, seeker. The thing you named must first forget it was ever wanted.",
  "You spoke softly, and the dark leaned closer. It will not forget your voice.",
  "The branch bends toward you now. Do not look back to check.",
  "Something stirs beneath the floorboards of tomorrow. It carries your shape.",
  "The Willow neither promises nor refuses. It simply begins.",
];

export function offlineProphecy(seed?: string): string {
  if (!seed) {
    return FALLBACK_PROPHECIES[Math.floor(Math.random() * FALLBACK_PROPHECIES.length)];
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_PROPHECIES[h % FALLBACK_PROPHECIES.length];
}

export async function consultOracle(wishText: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    return offlineProphecy(wishText);
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.95,
        max_tokens: 120,
        messages: [
          { role: "system", content: ORACLE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `A seeker has spent their one wish. Their words: "${wishText.slice(0, 400)}". Speak your prophecy.`,
          },
        ],
      }),
      // The oracle must not keep the seeker waiting forever.
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) return offlineProphecy(wishText);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return offlineProphecy(wishText);
    return text.replace(/^["']|["']$/g, "");
  } catch {
    return offlineProphecy(wishText);
  }
}
