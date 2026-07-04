import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { eq, isNull } from "drizzle-orm";
import { getDb } from "../lib/db";
import { activities } from "../lib/db/schema";

// Bäst-effort: hämta en representativ bild per aktivitet från Wikipedia
// (fr, hotlink-vänliga thumbnails från upload.wikimedia.org). Rör bara
// rader utan image_url och får ALDRIG fälla bygget.

async function searchOnce(query: string): Promise<string | null> {
  const url =
    "https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrlimit=5&gsrsearch=" +
    encodeURIComponent(query) +
    "&prop=pageimages&piprop=thumbnail&pithumbsize=800&pilimit=5";
  try {
    let res = await fetch(url, {
      headers: { "User-Agent": "mpl26-familjeapp/1.0 (andreas@cronamail.se)" },
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 15_000));
      res = await fetch(url, {
        headers: { "User-Agent": "mpl26-familjeapp/1.0 (andreas@cronamail.se)" },
      });
    }
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    // Sökresultaten är rankade via "index"; ta bästa träff som har bild
    const ranked = (
      Object.values(pages) as {
        index?: number;
        thumbnail?: { source?: string };
      }[]
    ).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
    return ranked.find((p) => p.thumbnail?.source)?.thumbnail!.source ?? null;
  } catch {
    return null;
  }
}

async function findImage(primary: string, fallback: string): Promise<string | null> {
  return (await searchOnce(primary)) ?? (primary !== fallback ? searchOnce(fallback) : null);
}

/** Rensa titeln till en sökbar platsfras. */
function searchQuery(title: string, address: string | null): string {
  const cleaned = title.split("—")[0].split(" - ")[0].trim();
  // Ortsnamn ur adressen hjälper träffsäkerheten
  const place = address?.split(",").pop()?.trim();
  return place && !cleaned.includes(place) ? `${cleaned} ${place}` : cleaned;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("enrich-images: DATABASE_URL saknas, hoppar över.");
    return;
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(activities)
    .where(isNull(activities.imageUrl));
  if (rows.length === 0) {
    console.log("enrich-images: alla aktiviteter har redan bild.");
    return;
  }
  let hits = 0;
  for (const row of rows) {
    await new Promise((r) => setTimeout(r, 1200)); // snäll mot Wikipedias API
    const cleaned = row.title.split("—")[0].split(" - ")[0].trim();
    const img = await findImage(searchQuery(row.title, row.address), cleaned);
    if (img) {
      await db
        .update(activities)
        .set({ imageUrl: img })
        .where(eq(activities.id, row.id));
      hits++;
    }
  }
  console.log(`enrich-images: ${hits}/${rows.length} bilder hittade.`);
}

main()
  .catch((e) => console.log("enrich-images: hoppade över —", e?.message))
  .then(() => process.exit(0));
