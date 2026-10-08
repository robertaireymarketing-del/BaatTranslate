import { requireUser } from "../../lib/auth.mjs";
// Speech -> text for Talk mode (her side).
// Pure Urdu: just the Urdu recogniser.
// Punjabi / Mirpuri mix: there's no Mirpuri recogniser and the Punjabi one is Indian (Gurmukhi),
// so the audio goes through Urdu and Punjabi recognisers in parallel and both transcripts are returned.
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

  if (lang === "urdu") {
    try {
      return Response.json({ ur: await recognise(buf, "ur-PK"), pa: "", n: 1 });
    } catch (e) {
      return new Response(e.message, { status: 502 });
    }
  }

  const [ur, pa] = await Promise.allSettled([recognise(buf, "ur-PK"), recognise(buf, "pa-IN")]);
  if (ur.status === "rejected" && pa.status === "rejected") {
    return new Response(ur.reason.message, { status: 502 });
  }
  return Response.json({
    ur: ur.status === "fulfilled" ? ur.value : "",
    pa: pa.status === "fulfilled" ? pa.value : "",
    n: 2,
  });
};
