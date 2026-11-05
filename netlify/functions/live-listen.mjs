import { requireUser } from "../../lib/auth.mjs";
// Listen mode and English dictation: one chunk of audio (16 kHz WAV, base64) -> transcript via Groq Whisper.
// Only chunks with speech in them are ever sent.
//   lang "en"   — you speaking English (Reply / dictation)
//   lang "auto" — the room: Whisper works out the language itself, so someone switching to English
//                 comes through as real English words. If it guesses something unlikely
//                 (Arabic, Persian…), the chunk is re-heard as Urdu.
//   lang "ur"   — older app versions: always Urdu script
//
// Whisper's "prompt" steers how it writes things down. For the room we give it:
//   - the tail of what it heard just before (so a sentence cut across two chunks carries on sensibly),
//   - or, when there's nothing yet, a short line of casual spoken Urdu/Punjabi so it expects
//     informal household talk rather than news-reader Urdu,
//   - plus the family's names/words so they're spelled right.

// Languages that are plausible in this house. Anything else is treated as a mis-detection.
const EXPECTED = new Set(["english", "en", "urdu", "ur", "hindi", "hi", "punjabi", "pa"]);
const NAMES = { en: "english", ur: "urdu", hi: "hindi", pa: "punjabi" };

// Everyday, informal speech (Urdu with Punjabi mixed in) — sets the register, not the content.
const CASUAL_PRIMER = "ہاں یار، اچھا سن۔ کی حال اے؟ میں نے کہا سی، چل ٹھیک اے، کوئی گل نئیں۔ اوکے، فون کر دینا۔";

// Whisper only reads roughly the last 220 tokens of a prompt, and Urdu script is token-heavy,
// so keep it short. The most useful part (what was just said) goes last.
function buildPrompt(hint, prev, lang) {
  const names = String(hint || "").slice(0, 160);
  if (lang === "en") return names;
  const tail = String(prev || "").trim().slice(-180);
  return [names, tail || CASUAL_PRIMER].filter(Boolean).join("۔ ");
}

// Whisper sometimes just repeats its prompt back when the audio is unclear. Treat that as nothing heard.
const norm = (s) => String(s || "").replace(/[\s،۔.,!?؟'"-]/g, "");
function echoesPrompt(text, prompt) {
  const t = norm(text);
  if (!t || !prompt) return false;
  const p = norm(prompt);
  // Short everyday phrases ("kya haal ae") can genuinely match the primer, so only longer repeats count.
  return t.length >= 16 && (p.includes(t) || (t.length > 24 && p.includes(t.slice(0, Math.floor(t.length * 0.7)))));
}

async function transcribe(buf, language, prompt) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "audio/wav" }), "chunk.wav");
  form.append("model", process.env.GROQ_MODEL || "whisper-large-v3");
  if (language) form.append("language", language);
  form.append("response_format", "verbose_json"); // includes the detected language
  form.append("temperature", "0");
  if (prompt) form.append("prompt", prompt);

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  if (r.status === 429) {
    const e = new Error("Listening limit reached for a moment. It will carry on shortly.");
    e.status = 429; throw e;
  }
  if (!r.ok) {
    const e = new Error(`Listening failed (${r.status}): ${await r.text()}`);
    e.status = 502; throw e;
  }
  const j = await r.json();
  const detected = String(j.language || language || "").toLowerCase();
  let text = (j.text || "").trim();
  if (echoesPrompt(text, prompt)) text = "";
  return { text, language: NAMES[detected] || detected };
}

export default async (req) => {
  const who = await requireUser(req);
  if (who.error) return who.error;

  const { audio = "", hint = "", prev = "", lang = "ur" } = await req.json();
  if (!audio) return new Response("No audio", { status: 400 });
  const buf = Buffer.from(audio, "base64");
  const prompt = buildPrompt(hint, prev, lang);

  try {
    if (lang === "en") return Response.json({ ...(await transcribe(buf, "en", prompt)), passes: 1 });
    if (lang !== "auto") return Response.json({ ...(await transcribe(buf, "ur", prompt)), passes: 1 });

    const first = await transcribe(buf, null, prompt);
    // (If no language comes back at all, trust the first pass rather than paying twice.)
    if (!first.text || !first.language || EXPECTED.has(first.language)) return Response.json({ ...first, passes: 1 });
    // Detected something unlikely (often Mirpuri mistaken for Arabic/Persian): hear it again as Urdu.
    const second = await transcribe(buf, "ur", prompt);
    return Response.json({ ...second, language: "urdu", passes: 2 });
  } catch (e) {
    return new Response(e.message, { status: e.status || 502 });
  }
};
