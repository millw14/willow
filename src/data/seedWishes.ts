import type { Wish } from "@/lib/types";

// Curated wishes that fill the archive in candlelight (no-database) mode,
// and that seed the live ticker. Written to feel real, strange, and human.
const RAW: Array<Pick<Wish, "wish_text" | "oracle_response"> & { tag?: string }> = [
  { wish_text: "I wish my dog lives forever.", oracle_response: "The loyal heart is not counted in years. It is counted in returns to the door." },
  { wish_text: "I wish Sakura reaches the moon.", oracle_response: "She is already climbing. The moon simply hasn't noticed yet." },
  { wish_text: "I wish my ex regrets everything.", oracle_response: "Regret is a slow root. It is already drinking from their sleep." },
  { wish_text: "I wish I could hear my grandmother's voice one more time.", oracle_response: "Listen for it in the kettle, the hinge, the rain. She never fully left the house." },
  { wish_text: "I wish my startup survives the winter.", oracle_response: "Frost teaches the strongest things to wait. Yours is learning quickly." },
  { wish_text: "I wish the right people find this.", oracle_response: "They are already on the road. The dark is only keeping them quiet." },
  { wish_text: "I wish for one perfect summer.", oracle_response: "It is being assembled, hour by hour, somewhere just ahead of you." },
  { wish_text: "I wish I stop being afraid of the dark.", oracle_response: "The dark has been waiting to be your friend. It is shy, that is all." },
  { wish_text: "I wish my mother's hands stop hurting.", oracle_response: "Tenderness travels backward too. Send it; it arrives." },
  { wish_text: "I wish I could draw like I dream.", oracle_response: "Your hand and your dream are the same age now. Let them meet." },
  { wish_text: "I wish the wildfires never come back.", oracle_response: "Ash is also a seed. The hills remember how to be green." },
  { wish_text: "I wish someone reads my book after I'm gone.", oracle_response: "Words outlive their writers by design. Yours have already begun the trick." },
  { wish_text: "I wish I had told him before he left.", oracle_response: "He knew. Some things are spoken without the mouth." },
  { wish_text: "I wish to be brave for exactly one day.", oracle_response: "Borrow it now. You will find you never have to give it back." },
  { wish_text: "I wish the ocean keeps its whales.", oracle_response: "The deep is older than greed. It keeps what it loves." },
  { wish_text: "I wish my brother comes home safe.", oracle_response: "A door left unlocked is a kind of prayer. Keep yours warm." },
  { wish_text: "I wish I could taste my childhood again.", oracle_response: "It is in the next bowl of something simple. Eat slowly." },
  { wish_text: "I wish the quiet kid at school finds a friend.", oracle_response: "Kindness has already chosen a desk beside him. Tomorrow it sits down." },
  { wish_text: "I wish I stop checking if they texted.", oracle_response: "Set the small glass thing down. The world is wider than its glow." },
  { wish_text: "I wish for snow on a day that matters.", oracle_response: "The sky is keeping a flurry in reserve. It knows the date." },
];

export const SEED_WISHES: Wish[] = RAW.map((r, i) => {
  const created = new Date(Date.now() - (RAW.length - i) * 1000 * 60 * 37);
  return {
    id: `seed-${i}`,
    wallet_address: `Wi11ow${i.toString().padStart(2, "0")}…${(1000 + i).toString(16)}`,
    wish_text: r.wish_text,
    wish_hash: `seed${i.toString().padStart(4, "0")}`,
    wish_number: 143_901 + i,
    oracle_response: r.oracle_response,
    wallet_status: "spent",
    created_at: created.toISOString(),
  };
});

export const SEED_BASE_COUNT = 143_921;
