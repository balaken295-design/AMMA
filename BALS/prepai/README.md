# MBA BJD — Interview Intelligence & Aptitude Platform

**MBA BJD** is a full-stack, AI-driven placement preparation platform built for MBA graduates and business candidates preparing for campus drives, consulting case interviews, corporate strategy roles, and top B-School admissions.

---

## Core features

### 1. Landing page (`/`)
- Hero section with an interactive quick case evaluator — candidates test a 30-second MECE-framework answer and get instant feedback.
- Direct navigation into the AI Interviewer, live GD Simulator, Aptitude Engine, or Dashboard.

### 2. MBA-focused AI case & behavioral interviewer
- Role tracks: Management Consulting Associate (case interviews), Tech/AI Product Manager, Investment Banking Associate, Corporate Strategy & Brand, Global Operations, Venture Capital & Private Equity.
- Live camera HUD analytics (eye contact, posture, speech pace, MECE structure) and spoken follow-up questions via the Web Speech API.

### 3. Live camera & mic group discussion (GD) simulator
- MBA business case topics (ESG vs profit maximization, EV market entry, GenAI disruption in finance, CBDCs vs commercial banking, and more).
- AI candidates (Alex, Sophia, David) join automatically with structured counterarguments, or generate a peer room code to bring in real study partners with live camera/mic.
- Works across different networks (not just the same WiFi) once a TURN server is configured — see [Cross-network video calls](#cross-network-video-calls) below.

### 4. Deep aptitude engine
- Verbal, Logical Reasoning, and Quantitative batteries aligned to CAT/GMAT/GRE-style questions, each with step-by-step explanations.
- AI-generated questions via Gemini when configured, with a built-in offline fallback bank (guaranteed no duplicate questions within a single set).

### 5. Real Google Sign-In + MongoDB Atlas
- Sign-in is verified server-side against Google (via `google-auth-library`) — not a demo/mock login.
- Candidate XP, level, aptitude scores, interview evaluations, and GD history persist to MongoDB Atlas per account, with a safe in-memory fallback if `MONGODB_URI` isn't set (useful for local dev).

---

## Technology stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Motion
- **Backend**: Node.js, Express, Socket.IO, tsx (dev) / esbuild (prod bundle)
- **Auth**: Google Identity Services + `google-auth-library` (server-side token verification)
- **AI SDK**: `@google/genai` (Gemini)
- **Database**: MongoDB Atlas via the official `mongodb` driver
- **Realtime**: Socket.IO for GD room signaling, native WebRTC (with TURN relay support) for camera/mic

---

## Quick start (local development)

### Prerequisites
- Node.js v18+
- npm
- A [Gemini API key](https://aistudio.google.com/apikey)

### 1. Install

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in what you have. At minimum, `GEMINI_API_KEY` gets you AI question generation and the interviewer running. Everything else is optional for local dev (each feature degrades gracefully without it — see the table below).

| Variable | Required for | If missing |
|---|---|---|
| `GEMINI_API_KEY` | AI-generated questions, AI interviewer, AI GD candidates | Falls back to the built-in offline question bank |
| `MONGODB_URI` | Persisting scores/progress across sessions | Falls back to in-memory storage (resets on server restart) |
| `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` | Real Google Sign-In | Sign-in button shows a "not configured" notice; app still works signed-out |
| `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL` | GD video calls across different networks | GD calls still work on the same WiFi/network, but fail across different networks |

### 3. Run

```bash
npm run dev
```

Opens at `http://localhost:3000`.

---

## Deploying to production

This app needs a **persistent Node process** (for Socket.IO and WebRTC signaling) — it will **not** work on static-only hosts like Netlify or Vercel's static hosting. Use a host built for long-running Node servers: **Render**, **Railway**, **Fly.io**, or **Google Cloud Run** all work.

1. Push this repo to GitHub.
2. Create a new Web Service on your chosen host, pointed at the repo.
3. **Build command:** `npm install && npm run build`
   **Start command:** `npm start`
4. Set all the environment variables from `.env.example` in the host's dashboard (never commit `.env` — it's already gitignored).
5. Once deployed, go back to Google Cloud Console → your OAuth client → **Authorized JavaScript origins** and add your live URL, or Google Sign-In will fail with a redirect/origin mismatch.
6. Visit `/api/db/status` to confirm MongoDB connected successfully.

The server reads its port from `process.env.PORT` (falls back to `3000` locally), which is what most hosts (Render, Railway, Cloud Run) require.

---

## Cross-network video calls

By default, WebRTC in the GD simulator only reliably connects two people on the **same** network (same WiFi/LAN) — that's a networking fact, not a bug, since NAT/firewalls block direct peer connections across different networks without a relay.

To make calls work across any two networks (different WiFi, mobile data, etc.), configure a TURN server:

1. Sign up free at [metered.ca](https://www.metered.ca/stun-turn) (or use Twilio, Xirsys, or your own `coturn`).
2. Generate credentials — you'll get a username, credential, and several TURN URLs (UDP, TCP, and TLS-on-443 variants).
3. Set `TURN_URL` (comma-separated list of all variants), `TURN_USERNAME`, and `TURN_CREDENTIAL` in your environment.
4. Redeploy. The in-app "same network only" notice on the GD screen disappears automatically once the server reports TURN is configured.

---

## Connecting MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user, and under Network Access allow `0.0.0.0/0` (required for cloud deployments, since the host's outbound IP isn't fixed).
3. Copy your connection string and set it as `MONGODB_URI`.
4. Verify at `/api/db/status`.

---

## Setting up real Google Sign-In

1. In [Google Cloud Console](https://console.cloud.google.com), create/select a project.
2. **APIs & Services → OAuth consent screen** — set the app name (e.g. "MBA BJD"), a support email, and save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
4. Under **Authorized JavaScript origins**, add your local dev URL (`http://localhost:3000`) and your production URL. No redirect URI is needed — this uses Google Identity Services' button/one-tap flow.
5. Copy the client ID and set it as **both** `GOOGLE_CLIENT_ID` (server-side verification) and `VITE_GOOGLE_CLIENT_ID` (baked into the frontend build) — they must match exactly.
6. While your consent screen is in **Testing** mode, only accounts you add as test users can sign in. Switch to **Production** to allow anyone.

---

## Repository structure

```
├── .env.example          # Sample environment variables
├── .gitignore
├── README.md
├── package.json           # Dependencies & npm scripts
├── server.ts               # Express + Socket.IO server: Gemini, MongoDB, Google auth, WebRTC signaling
├── metadata.json
└── src/
    ├── App.tsx                        # Root app state & routing
    ├── components/
    │   ├── LandingPageView.tsx        # Landing page with interactive demo
    │   ├── Header.tsx                 # Top navigation bar
    │   ├── DashboardView.tsx          # Candidate progress dashboard
    │   ├── AptitudeView.tsx           # Aptitude question engine
    │   ├── GroupDiscussionView.tsx    # Live GD room (WebRTC + Socket.IO)
    │   ├── AIInterviewView.tsx        # 1-on-1 AI case interviewer
    │   ├── EvaluationSummaryView.tsx  # Final report & scorecard
    │   └── GoogleLoginModal.tsx       # Real Google Sign-In modal
    ├── data/
    │   └── aptitudeData.ts            # Aptitude question batteries + offline fallback generator
    └── types.ts                        # Shared TypeScript interfaces
```

---

## License

Distributed under the MIT License. See `LICENSE` for details.
