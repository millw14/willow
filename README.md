# One Wish Willow

> Everyone gets one wish. Use it carefully.

A cinematic, ritual web experience built around a single magical object — the **One Wish Willow**. Connect a Solana wallet, write your wish, and the Willow *snaps*. The wish is recorded forever, and that wallet can never wish again.

This is not a SaaS site, not a crypto landing page, not a chatbot. It is a digital ritual.

---

## The ritual

1. The site loads to near-black. Dust drifts, film grain shimmers, the box emerges from the dark.
2. **Everyone gets one wish.** … **Use it carefully.** → `ENTER`.
3. The box lunges toward you, golden light spills out, and the world unfolds.
4. **Make a wish** → connect a wallet → write into the dark → **Grant my wish**.
5. The screen darkens, the Willow bends, silence… **SNAP.** A golden burst. Calm.
6. The Keeper of Wishes (Groq) answers in a short prophecy.
7. That wallet is spent. Return and the Willow shows a broken box: *"The Willow remembers."*

---

## Tech

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind**
- **Framer Motion** + **GSAP** for cinematic motion
- Custom **canvas particle field** (cursor-reactive dust + embers, 60fps, mobile-tuned)
- **Web Audio** sound engine — ambient drone/wind, whispers, rumble, the SNAP, dry-crack failure (fully synthesized, no audio files)
- **Solana Wallet Adapter** — Phantom · Solflare · Backpack (Wallet Standard auto-detection)
- **Supabase** for persistent wishes + one-wish-per-wallet enforcement
- **Groq** as the Oracle
- Share-your-wish image cards generated on `<canvas>`

> Three.js / React Three Fiber are listed in the original brief; the dust + box
> are rendered with a tuned 2D canvas + layered CSS/Framer for reliability and
> performance. Swapping in an R3F scene is a drop-in enhancement at
> `src/components/scene/ParticleField.tsx`.

---

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**It runs with zero configuration** in "candlelight mode": wishes are kept in
server memory, the offline Oracle answers, and the archive is seeded with
curated wishes. Connect a wallet and the full ritual works immediately.

### Going live (optional)

Copy `.env.example` to `.env.local` and fill in what you want:

| Key | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Persistent wishes |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted server-side writes |
| `GROQ_API_KEY` / `GROQ_MODEL` | The real Oracle |
| `NEXT_PUBLIC_SOLANA_RPC` | Custom Solana RPC |
| `NEXT_PUBLIC_ORACLE_PHONE` | Oracle line number (display) |
| `TWILIO_*` / `ELEVENLABS_*` | Voice line (stretch) |

Then apply the database schema:

```bash
# via the Supabase SQL editor, paste:
supabase/migrations/0001_init.sql
```

The unique index on `wallet_address` is what makes "one wish per wallet"
unbreakable — even under a race, the second insert is rejected.

---

## Structure

```
src/
  app/                 routes: / , /wishes , /shop , /oracle , /api/*
  components/
    landing/           the intro + ENTER transition
    scene/             particle field, film grain, the floating/breaking box
    wish/              the ritual + snap sequence
    wishes/ feed/      archive + live ticker
    counter/ shop/ oracle/ share/ layout/ ui/
  lib/                 sound engine, oracle (Groq), store (Supabase/memory), utils
  data/                seed wishes for candlelight mode
supabase/migrations/   schema
```

---

## Deploy

Built for **Vercel**. Push the repo, import it, add env vars, done. The API
routes are `force-dynamic` so counts and the archive always reflect the latest.
