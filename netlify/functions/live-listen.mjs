import { requireUser } from "../../lib/auth.mjs";
// Listen mode: one chunk of room audio (16 kHz WAV, base64) -> Urdu-script transcript via Groq Whisper.
// Only chunks with speech in them are ever sent. Family names are passed as a vocabulary hint.

export default async (req) => {
  const who = await requireUser(req);
  if (who.error) return who.error;

  const { audio = "", hint = "" } = await req.json();
  if (!audio) return new Response("No audio", { status: 400 });

  const form = new FormData();
  form.append("file", new Blob([Buffer.from(audio, "base64")], { type: "audio/wav" }), "chunk.wav");
  form.append("model", process.env.GROQ_MODEL || "whisper-large-v3");
  form.append("language", "ur"); // one script throughout; Claude untangles Mirpuri/English words
  form.append("response_format", "json");
  form.append("temperature", "0");
  // Family names/words as a spelling hint (Whisper only reads the first ~200 tokens).
  if (hint) form.append("prompt", String(hint).slice(0, 500));

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });

  if (r.status === 429) return new Response("Listening limit reached for a moment. It will carry on shortly.", { status: 429 });
  if (!r.ok) return new Response(`Listening failed (${r.status}): ${await r.text()}`, { status: 502 });
  const j = await r.json();
  return Response.json({ text: (j.text || "").trim() });
};
