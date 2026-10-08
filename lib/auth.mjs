// Checks the Google sign-in (Firebase ID token) on every request, and that the
// account is on the family list. Stops anyone else from using your API keys.
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const fail = (msg, status) => ({ error: new Response(msg, { status }) });

export async function requireUser(req) {
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return fail("Server not set up: FIREBASE_PROJECT_ID is missing in Netlify.", 500);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail("Please sign in.", 401);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    }));
  } catch {
    return fail("Your sign-in has expired. Please sign in again.", 401);
  }

  const email = String(payload.email || "").toLowerCase();
  const allowed = (process.env.ALLOWED_EMAILS || "")
    .toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  if (!payload.email_verified || !allowed.includes(email)) {
    return fail(`${email || "This account"} isn't on the family list for Baat.`, 403);
  }
  return { email };
}
