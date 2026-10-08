import { requireUser } from "../../lib/auth.mjs";
// Text -> natural speech using Azure neural voices (Pakistani Urdu, British English). Returns an MP3.
const VOICES = {
  ur: { locale: "ur-PK", female: "ur-PK-UzmaNeural", male: "ur-PK-AsadNeural" },
  en: { locale: "en-GB", female: "en-GB-SoniaNeural", male: "en-GB-RyanNeural" },
};
const RATES = { normal: "-5%", slow: "-20%" };

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export default async (req) => {
  const who = await requireUser(req);
  if (who.error) return who.error;

  const { text = "", lang = "ur", gender = "female", speed = "normal" } = await req.json();
  const v = VOICES[lang];
  if (!v || !text.trim()) return new Response("Nothing to say", { status: 400 });

  const rate = lang === "en" ? "0%" : RATES[speed] || RATES.normal;
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${v.locale}">` +
    `<voice name="${v[gender] || v.female}"><prosody rate="${rate}">${esc(text.slice(0, 1500))}</prosody></voice></speak>`;

  const r = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "baat",
    },
    body: ssml,
  });

  if (!r.ok) return new Response(`Voice failed (${r.status}): ${await r.text()}`, { status: 502 });
  return new Response(await r.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg" } });
};
