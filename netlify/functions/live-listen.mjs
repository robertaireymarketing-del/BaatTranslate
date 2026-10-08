import { requireUser } from "../../lib/auth.mjs";
// Listen mode and English dictation: one chunk of audio (16 kHz WAV, base64) -> transcript via Groq Whisper.
// Only chunks with speech in them are ever sent. Family names are passed as a vocabulary hint.
//   lang "en"   — you speaking English (Reply / dictation)
//   lang "auto" — the room: Whisper works out the language itself, so someone switching to English
//                 comes through as real English words. If it guesses something unlikely
//                 (Arabic, Persian…), the chunk is re-heard as Urdu.
//   lang "ur"   — older app versions: always Urdu script

// Languages that are plausible in this house. Anything else is treated as a mis-detection.
const EXPECTED = new Set(["english", "en", "urdu", "ur", "hindi", "hi", "punjabi", "pa"]);
const NAMES = { en: "english", ur: "urdu", hi: "hindi", pa: "punjabi" };

async function transcribe(buf, language, hint) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "audio/wav" }), "chunk.wav");
  form.append("model", process.env.GROQ_MODEL || "whisper-large-v3");
  if (language) form.append("language", language);
  form.append("response_format", "verbose_json"); // includes the detected language
  form.append("temperature", "0");
  // Family names/words as a spelling hint (Whisper only reads the first ~200 tokens).
  if (hint) form.append("prompt", String(hint).slice(0, 500));

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
  return { text: (j.text || "").trim(), language: NAMES[detected] || detected };
}

export default async (req) => {
  const who = await requireUser(req);
  if (who.error) return who.error;

  const { audio = "", hint = "", lang = "ur" } = await req.json();
  if (!audio) return new Response("No audio", { status: 400 });
  const buf = Buffer.from(audio, "base64");

  try {
    if (lang === "en") return Response.json({ ...(await transcribe(buf, "en", hint)), passes: 1 });
    if (lang !== "auto") return Response.json({ ...(await transcribe(buf, "ur", hint)), passes: 1 });

    const first = await transcribe(buf, null, hint);
    // (If no language comes back at all, trust the first pass rather than paying twice.)
    if (!first.text || !first.language || EXPECTED.has(first.language)) return Response.json({ ...first, passes: 1 });
    // Detected something unlikely (often Mirpuri mistaken for Arabic/Persian): hear it again as Urdu.
    const second = await transcribe(buf, "ur", hint);
    return Response.json({ ...second, language: "urdu", passes: 2 });
  } catch (e) {
    return new Response(e.message, { status: e.status || 502 });
  }
};
