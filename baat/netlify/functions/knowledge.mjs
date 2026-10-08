// Read and edit the shared family word list and corrections.
import { loadKnowledge, saveKnowledge } from "../../lib/knowledge.mjs";

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clean = (s, n = 300) => String(s || "").trim().slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (process.env.APP_PASSCODE && req.headers.get("x-passcode") !== process.env.APP_PASSCODE) {
    return new Response("Wrong passcode", { status: 401 });
  }

  const b = await req.json();
  const k = await loadKnowledge();

  switch (b.action) {
    case "get":
      return Response.json(k);
    case "addWord": {
      const term = clean(b.term, 80), meaning = clean(b.meaning, 200);
      if (!term) return new Response("Add a word or name first.", { status: 400 });
      k.words = k.words.filter((w) => w.term.toLowerCase() !== term.toLowerCase());
      k.words.push({ id: id(), term, meaning });
      k.words = k.words.slice(-200);
      break;
    }
    case "deleteWord":
      k.words = k.words.filter((w) => w.id !== b.id);
      break;
    case "addFix": {
      const right = clean(b.right, 500);
      if (!right) return new Response("Type what it should have said.", { status: 400 });
      k.fixes.push({
        id: id(), dir: b.dir === "out" ? "out" : "in",
        source: clean(b.source, 500), wrong: clean(b.wrong, 500), right, note: clean(b.note, 200), ts: Date.now(),
      });
      k.fixes = k.fixes.slice(-200);
      break;
    }
    case "deleteFix":
      k.fixes = k.fixes.filter((f) => f.id !== b.id);
      break;
    default:
      return new Response("Unknown action", { status: 400 });
  }

  await saveKnowledge(k);
  return Response.json(k);
};
