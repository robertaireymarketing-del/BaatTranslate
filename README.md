# Baat — English ⇄ Urdu voice translator, tuned for a Mirpuri speaker

- **Talk** — you type English, it speaks simple Urdu (or Mirpuri-style). She taps the big mic, it speaks the English back.
- **Listen** — leave the phone in the room and it shows a running English transcript.
- Sign in with Google. Everything (history, transcripts, settings, spending, family words, fixes) is backed up in Firestore.

## Fixing "Page not found"
`index.html`, `netlify.toml`, `package.json`, `firebase-config.js` and the `netlify` and `lib` folders must sit at the
**top level** of the GitHub repo — not inside a `baat` folder. Either move them up, or in Netlify set
Site configuration → Build & deploy → **Base directory** to the folder they're in. Then check Deploys shows "Published".

## 1. Firebase (sign-in + backup)
1. console.firebase.google.com → Add project (e.g. `baat-translate`). Analytics not needed.
2. **Build → Authentication** → Get started → Sign-in method → **Google** → Enable → Save.
3. Authentication → Settings → **Authorised domains** → Add `baattranslate.netlify.app`.
4. **Build → Firestore Database** → Create database → location `europe-west2 (London)` → Production mode.
5. Firestore → **Rules** → paste in `firestore.rules`, put your and Warda's Gmail addresses in the list → Publish.
6. Project settings (cog) → General → Your apps → **Web (</>)** → register app → copy the `firebaseConfig`
   values into `firebase-config.js`.

## 2. Netlify environment variables
Site configuration → Environment variables:
- `ANTHROPIC_API_KEY`
- `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (e.g. `uksouth`)
- `GROQ_API_KEY`
- `FIREBASE_PROJECT_ID` — the `projectId` from firebase-config.js
- `ALLOWED_EMAILS` — comma-separated Gmail addresses, same as in the rules (e.g. `you@gmail.com,warda@gmail.com`)
- optional: `ANTHROPIC_MODEL` (Talk), `ANTHROPIC_LIVE_MODEL` (Listen), `GROQ_MODEL`
- `APP_PASSCODE` is no longer used — delete it.

Push to GitHub, then Deploys → Trigger deploy.

## On the iPhone
Safari → open the site → Sign in with Google → Share → Add to Home Screen. Allow the microphone.

## Who can use it
Only Google accounts on both lists (Firestore rules + `ALLOWED_EMAILS`). Anyone else who finds the link sees
"isn't on the family list" and can't touch your data or your API keys. To add someone, add their address to both.

## What's stored where (Firestore)
- `words`, `fixes` — shared by the whole family; a fix Warda makes improves everyone's translations.
- `users/{you}` — your settings and this month's spending; `history` and `live` underneath hold Talk history and
  Listen transcripts. Works offline and syncs when back online. Signing in on a new phone brings it all back.
- First sign-in on a phone that used the old version copies its history, transcript and spending into Firestore.

## Spending
Cog → spending this month, per Google account, across all your devices. Prices are in `PRICES` at the top of the
script in `index.html`. Listen mode only sends audio when someone is speaking, so silence costs nothing.
