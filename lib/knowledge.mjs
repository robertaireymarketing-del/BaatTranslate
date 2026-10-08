// Family words/names and past corrections. They live in Firestore; the app sends
// them with each request and these helpers turn them into prompt text.
const str = (s, n) => String(s ?? "").trim().slice(0, n);

export function cleanKnowledge(k) {
  const words = (Array.isArray(k?.words) ? k.words : [])
    .slice(-200)
    .map((w) => ({ term: str(w.term, 80), meaning: str(w.meaning, 200) }))
    .filter((w) => w.term);
  const fixes = (Array.isArray(k?.fixes) ? k.fixes : [])
    .slice(-120)
    .map((f) => ({ dir: f.dir === "out" ? "out" : "in", source: str(f.source, 500), right: str(f.right, 500), note: str(f.note, 200) }))
    .filter((f) => f.right);
  return { words, fixes };
}

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
