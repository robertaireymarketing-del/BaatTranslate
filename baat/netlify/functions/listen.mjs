// Speech -> text. There is no Mirpuri recogniser, so the audio goes through
// Urdu and Punjabi recognisers in parallel and both transcripts are returned.
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
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (process.env.APP_PASSCODE && req.headers.get("x-passcode") !== process.env.APP_PASSCODE) {
    return new Response("Wrong passcode", { status: 401 });
  }

  const { audio = "" } = await req.json();
  if (!audio) return new Response("No audio", { status: 400 });
  const buf = Buffer.from(audio, "base64");

  const [ur, pa] = await Promise.allSettled([recognise(buf, "ur-PK"), recognise(buf, "pa-IN")]);
  if (ur.status === "rejected" && pa.status === "rejected") {
    return new Response(ur.reason.message, { status: 502 });
  }
  return Response.json({
    ur: ur.status === "fulfilled" ? ur.value : "",
    pa: pa.status === "fulfilled" ? pa.value : "",
  });
};
