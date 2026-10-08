# Baat — English ⇄ Urdu voice translator, tuned for a Mirpuri speaker

Two modes:
- **Talk** — you type English, it speaks simple Urdu (or Mirpuri-style). She taps the big mic, it speaks the English back.
- **Listen** — leave the phone in the room and it shows a running English transcript of what's being said.

## Keys you need
1. **Anthropic API key** — console.anthropic.com (translation)
2. **Azure Speech** — portal.azure.com → Create resource → "Speech service", **Free (F0)** tier, region **UK South**. Copy Key 1 and the region code (`uksouth`). Used by Talk mode.
3. **Groq API key** — console.groq.com → API Keys. The free plan is fine to start. Used by Listen mode.

## Deploy (GitHub + Netlify)
1. Push this folder to a GitHub repo.
2. Netlify → Add new site → Import from GitHub. No build command needed.
3. Site configuration → Environment variables:
   - `ANTHROPIC_API_KEY`
   - `AZURE_SPEECH_KEY`
   - `AZURE_SPEECH_REGION` (e.g. `uksouth`)
   - `GROQ_API_KEY`
   - `APP_PASSCODE` (any passcode — stops strangers using your keys)
   - optional: `ANTHROPIC_MODEL` (Talk mode), `ANTHROPIC_LIVE_MODEL` (Listen mode), `GROQ_MODEL`
4. Redeploy so the variables load.

## On the iPhone
Safari → open the site → Share → Add to Home Screen. Enter the passcode once, allow the microphone.

## Making it more accurate over time
- **Family words & names** (cog → Family words & names): add names, places and words she uses — e.g. "Kotli: her home town",
  family names, nicknames, Mirpuri words for everyday things. These guide both the listening and the translating.
- **Fix**: every translation in *Earlier* and in Listen mode has a Fix button. Correct it and the app learns from it.
  Fixes and words are stored on Netlify (Netlify Blobs, set up automatically), so they're shared between everyone's phones.
- Talk mode remembers the last few things said (within 30 minutes), so short replies make sense.

## Spending
Tap the cog to see this month's spend, broken down by service. It resets on the 1st and remembers last month's total.
Figures are estimates based on what this phone has used — prices are at the top of the script in `index.html`
(`PRICES`) so you can match them to your real bills.

Why Listen mode is cheap:
- The phone works out when someone is speaking. Silence is never sent, so it costs nothing.
- Short bits are bundled together to avoid paying Groq's 10-second minimum over and over.
- Groq Whisper costs about 8p per hour of speech, and its free plan may cover home use entirely.
- Listen mode translates with Claude Haiku, the cheapest Claude model.
