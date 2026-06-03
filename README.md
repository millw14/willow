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
# via the Supabase SQL editor, paste in order:
supabase/migrations/0001_init.sql
supabase/migrations/0002_payments.sql
```

The unique index on `wallet_address` is what makes "one wish per wallet"
unbreakable — even under a race, the second insert is rejected.

---

## Paid wishes + buy-and-burn (optional)

Set a treasury and every wish costs **6.99 USDC**, paid on-chain from the
seeker's connected wallet. Every **3rd** paid wish, the treasury automatically
swaps **90%** of its USDC into the willow token via Jupiter and **burns** it,
keeping **10% back for fees**. Leave `TREASURY_SECRET_KEY` empty to keep wishes
free.

| Key | Purpose |
| --- | --- |
| `TREASURY_SECRET_KEY` | **Server-only.** base58 or JSON byte array. Its public key is the payment address. Never commit a funded key. |
| `WISH_PRICE_USDC` | Price per wish (default `6.99`). |
| `WISH_TOKEN_MINT` | Token bought & burned (default `2Vkp…pump`). |
| `BURN_EVERY` | Buy & burn every N paid wishes (default `3`). |
| `FEE_RESERVE_RATIO` | USDC kept back for fees each burn (default `0.10`). |
| `JUPITER_API_URL` / `JUPITER_API_KEY` | Swap routing (defaults to the free lite endpoint). |
| `SOLANA_RPC` | Server RPC for verification + burns (a private RPC is strongly recommended on mainnet). |
| `CRON_SECRET` | Bearer token guarding `POST /api/buyburn`. |

Generate a fresh treasury keypair (base58 secret) and fund it with a little SOL
for fees:

```bash
node -e "const {Keypair}=require('@solana/web3.js');const bs58=require('bs58');console.log(bs58.default.encode(Keypair.generate().secretKey))"
```

**Flow:** connect wallet → write wish → `Offer 6.99 USDC & wish` prompts a USDC
transfer to the treasury → the server verifies the signature on-chain (correct
mint, amount, destination, signer; replay-protected by a unique constraint) →
the wish is recorded.

**Reliable burns (cron).** Burns are tracked as *owed* — `floor(paidWishes / 3)`
minus the burns that have actually completed — so one that gets cut off mid-run
stays owed and is retried, never double-burned (an in-process lock + the owed
count guard against concurrency). A burn fires inline when a wish trips the
threshold, and `vercel.json` schedules an hourly **Vercel Cron** as a backstop:

```json
{ "crons": [{ "path": "/api/cron/buyburn", "schedule": "0 * * * *" }] }
```

You **must** set `CRON_SECRET` in your Vercel project — Vercel auto-sends it as
`Authorization: Bearer <CRON_SECRET>` and the route rejects anything else. (Note:
Vercel's Hobby plan runs crons at most once/day; Pro honors the hourly schedule.)
Test it locally with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/buyburn
```

Check `GET /api/buyburn` for paid-wish count, `pendingBurns`, the next burn, and
burn history. `POST /api/buyburn` (same `CRON_SECRET`) forces an immediate run.

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
