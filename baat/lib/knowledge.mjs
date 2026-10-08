// Shared family knowledge: names/words and past corrections. Stored in Netlify Blobs,
// so a fix Warda makes on her phone improves translations on yours too.
import { getStore } from "@netlify/blobs";

const KEY = "knowledge";
const empty = () => ({ words: [], fixes: [] });
const store = () => getStore("baat");

export async function loadKnowledge() {
  try { return (await store().get(KEY, { type: "json" })) || empty(); } catch { return empty(); }
}
export async function saveKnowledge(k) { await store().setJSON(KEY, k); }

// Text block added to every translation prompt.
export function notesFor(k, dir) {
  const parts = [];
  if (k.words.length) {
    parts.push(
      "Family words and names. Use these meanings, and recognise them even when the transcript spells them oddly:\n" +
        k.words.map((w) => `- ${w.term}${w.meaning ? ": " + w.meaning : ""}`).join("\n")
    );
  }
  const fixes = k.fixes.filter((f) => (dir === "to" ? f.dir === "out" : f.dir === "in")).slice(-25);
  if (fixes.length) {
    parts.push(
      (dir === "to"
        ? "Corrections the family has made to earlier translations. Learn from them — her words, tone and phrasing:\n"
        : "Corrections the family has made. On the left is what the recogniser produced; on the right is what she actually meant. Learn how her speech gets mangled:\n") +
        fixes
          .map((f) =>
            dir === "to"
              ? `- English "${f.source}" should be said as: ${f.right}${f.note ? " (" + f.note + ")" : ""}`
              : `- Heard "${f.source}" means: ${f.right}${f.note ? " (" + f.note + ")" : ""}`
          )
          .join("\n")
    );
  }
  return parts.length ? "\n\n" + parts.join("\n\n") : "";
}

// Short vocabulary hint for the Whisper recogniser (it only reads ~200 tokens).
export function whisperPrompt(k) {
  return k.words.map((w) => w.term).join("، ").slice(0, 500);
}
