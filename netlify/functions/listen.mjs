import { requireUser } from "../../lib/auth.mjs";
// Speech -> text for Talk mode (her side).
// Pure Urdu: Urdu + English recognisers.
// Punjabi / Mirpuri mix: there's no Mirpuri recogniser and the Punjabi one is Indian (Gurmukhi),
// so the audio goes through Urdu, Punjabi and English recognisers in parallel.
// The translator compares them to work out what was said, including when she switches to English.
const recognise = async (audio, locale) => {
  const url =
    `https://${process.env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com` +
    `/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=simple`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
      "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
      Accept: "application/json",
    },
    body: audio,
  });
  if (!r.ok) throw new Error(`Listening failed (${r.status}): ${await r.text()}`);
  const j = await r.json();
  return j.RecognitionStatus === "Success" ? j.DisplayText || "" : "";
};

export default async (req) => {
  const who = await requireUser(req);
  if (who.error) return who.error;

  const { audio = "", lang = "mirpuri" } = await req.json();
  if (!audio) return new Response("No audio", { status: 400 });
  const buf = Buffer.from(audio, "base64");

  // An English recogniser always runs too, so if she switches to English it comes through as English.
  const locales = lang === "urdu" ? ["ur-PK", "en-GB"] : ["ur-PK", "pa-IN", "en-GB"];
  const results = await Promise.allSettled(locales.map((l) => recognise(buf, l)));
  if (results.every((x) => x.status === "rejected")) {
    return new Response(results[0].reason.message, { status: 502 });
  }
  const got = (l) => {
    const i = locales.indexOf(l);
    return i >= 0 && results[i].status === "fulfilled" ? results[i].value : "";
  };
  return Response.json({ ur: got("ur-PK"), pa: got("pa-IN"), en: got("en-GB"), n: locales.length });
};
