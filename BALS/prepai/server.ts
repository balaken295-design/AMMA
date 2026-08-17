import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { Pool } from "pg";
import { Server as SocketIOServer, Socket } from "socket.io";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
const httpServer = createHttpServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});
const PORT = Number(process.env.PORT) || 3000;

// Resume text payloads are small (a few KB of plain text) but the default
// 100kb express.json() limit is tight once JSON-escaped, so this route
// group gets a slightly higher cap.
app.use(express.json({ limit: "2mb" }));

// In-memory fallback database for candidate results when DATABASE_URL is absent.
// NOTE: this only survives until the process restarts (Render free/starter
// tiers restart and sleep routinely) — it exists so a save at least persists
// for the lifetime of the running process, and so profile lookups below
// have something real to check instead of silently no-op'ing.
const inMemoryStore = {
  scores: [] as any[],
  interviews: [] as any[],
  profiles: new Map<string, any>(),
};

// Lazy Postgres connection pool (Render Postgres sets DATABASE_URL automatically
// once the database is linked to this service; falls back to PG_URL for other hosts).
let pgPool: Pool | null = null;
let pgReady: Promise<boolean> | null = null;

const initSchema = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      email TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      is_logged_in BOOLEAN DEFAULT true,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      level_title TEXT,
      streak_days INTEGER DEFAULT 0,
      readiness_score INTEGER DEFAULT 0,
      completed_tests INTEGER DEFAULT 0,
      completed_interviews INTEGER DEFAULT 0,
      completed_gds INTEGER DEFAULT 0,
      domain_scores JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aptitude_scores (
      id SERIAL PRIMARY KEY,
      candidate_name TEXT,
      topic_id TEXT,
      topic_title TEXT,
      score INTEGER,
      total_questions INTEGER,
      category TEXT,
      domain TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_evaluations (
      id SERIAL PRIMARY KEY,
      candidate_name TEXT,
      evaluation JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
};

const getPg = async (): Promise<Pool | null> => {
  const uri = process.env.DATABASE_URL || process.env.PG_URL;
  if (!uri) return null;
  if (pgPool) return pgPool;
  if (!pgReady) {
    pgReady = (async () => {
      try {
        const pool = new Pool({
          connectionString: uri,
          ssl: uri.includes("localhost") ? false : { rejectUnauthorized: false },
        });
        await initSchema(pool);
        pgPool = pool;
        console.log("Successfully connected to Postgres and verified schema");
        return true;
      } catch (err) {
        console.warn("Postgres connection attempt failed:", err);
        pgReady = null;
        return false;
      }
    })();
  }
  const ok = await pgReady;
  return ok ? pgPool : null;
};

// Maps a DB row (snake_case) to the camelCase shape the frontend expects.
const rowToProfile = (row: any) => ({
  email: row.email,
  name: row.name,
  avatar: row.avatar,
  isLoggedIn: row.is_logged_in,
  xp: row.xp,
  level: row.level,
  levelTitle: row.level_title,
  streakDays: row.streak_days,
  readinessScore: row.readiness_score,
  completedTests: row.completed_tests,
  completedInterviews: row.completed_interviews,
  completedGDs: row.completed_gds,
  domainScores: row.domain_scores,
  updatedAt: row.updated_at,
});

const upsertProfile = async (pool: Pool, profile: any) => {
  await pool.query(
    `INSERT INTO user_profiles
       (email, name, avatar, is_logged_in, xp, level, level_title, streak_days,
        readiness_score, completed_tests, completed_interviews, completed_gds,
        domain_scores, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       avatar = EXCLUDED.avatar,
       is_logged_in = EXCLUDED.is_logged_in,
       xp = EXCLUDED.xp,
       level = EXCLUDED.level,
       level_title = EXCLUDED.level_title,
       streak_days = EXCLUDED.streak_days,
       readiness_score = EXCLUDED.readiness_score,
       completed_tests = EXCLUDED.completed_tests,
       completed_interviews = EXCLUDED.completed_interviews,
       completed_gds = EXCLUDED.completed_gds,
       domain_scores = EXCLUDED.domain_scores,
       updated_at = now()`,
    [
      profile.email, profile.name, profile.avatar, profile.isLoggedIn ?? true,
      profile.xp ?? 0, profile.level ?? 1, profile.levelTitle, profile.streakDays ?? 0,
      profile.readinessScore ?? 0, profile.completedTests ?? 0, profile.completedInterviews ?? 0,
      profile.completedGDs ?? 0, JSON.stringify(profile.domainScores ?? {}),
    ]
  );
};

// ICE server config for WebRTC (Group Discussion camera/mic connections).
// STUN alone (Google's public servers) only works reliably when both
// participants are on the same network. Crossing different networks/mobile
// data usually needs a TURN relay — if TURN_URL/TURN_USERNAME/TURN_CREDENTIAL
// are set in .env, they're included here automatically; otherwise we still
// return STUN so same-network calls keep working.
app.get("/api/ice-servers", (req, res) => {
  const iceServers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];

  const turnUrl = process.env.TURN_URL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl.split(',').map(u => u.trim()).filter(Boolean),
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  return res.json({ iceServers, turnConfigured: Boolean(turnUrl) });
});

// Database Status Route
app.get("/api/db/status", async (req, res) => {
  const pool = await getPg();
  if (pool) {
    return res.json({ connected: true, mode: "Postgres (Render)", database: "prepai_mba" });
  }
  return res.json({ connected: false, mode: "In-Memory Local Fallback", note: "Add DATABASE_URL in .env to connect Postgres" });
});

// Save Aptitude Score Route
app.post("/api/db/save-score", async (req, res) => {
  const { candidateName = "Alex Johnson", topicId, topicTitle, score, totalQuestions, category, domain = "General Management" } = req.body;
  const scoreRecord = {
    candidateName,
    topicId,
    topicTitle,
    score,
    totalQuestions,
    category,
    domain,
    createdAt: new Date().toISOString()
  };

  const pool = await getPg();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO aptitude_scores (candidate_name, topic_id, topic_title, score, total_questions, category, domain)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [candidateName, topicId, topicTitle, score, totalQuestions, category, domain]
      );
      return res.json({ success: true, storage: "Postgres", record: scoreRecord });
    } catch (e) {
      console.error("Postgres insert error:", e);
    }
  }

  inMemoryStore.scores.push(scoreRecord);
  return res.json({ success: true, storage: "In-Memory Fallback", record: scoreRecord });
});

// Save Interview Evaluation Route
app.post("/api/db/save-interview", async (req, res) => {
  const { candidateName = "Alex Johnson", evaluation } = req.body;
  const interviewRecord = {
    candidateName,
    evaluation,
    createdAt: new Date().toISOString()
  };

  const pool = await getPg();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO interview_evaluations (candidate_name, evaluation) VALUES ($1,$2)`,
        [candidateName, JSON.stringify(evaluation)]
      );
      return res.json({ success: true, storage: "Postgres", record: interviewRecord });
    } catch (e) {
      console.error("Postgres insert error:", e);
    }
  }

  inMemoryStore.interviews.push(interviewRecord);
  return res.json({ success: true, storage: "In-Memory Fallback", record: interviewRecord });
});

// Save or Update User Profile Route (Postgres)
app.post("/api/db/user-profile", async (req, res) => {
  const { profile } = req.body;
  if (!profile || !profile.email) {
    return res.status(400).json({ success: false, error: "Missing profile or email" });
  }

  const pool = await getPg();
  if (pool) {
    try {
      await upsertProfile(pool, profile);
      return res.json({ success: true, storage: "Postgres", profile });
    } catch (e) {
      console.error("Postgres profile upsert error:", e);
    }
  }

  inMemoryStore.profiles.set(profile.email, { ...profile, updatedAt: new Date().toISOString() });
  return res.json({ success: true, storage: "In-Memory Fallback", profile });
});

// Get User Profile by email Route
app.get("/api/db/user-profile", async (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ success: false, error: "Missing email parameter" });
  }

  const pool = await getPg();
  if (pool) {
    try {
      const result = await pool.query(`SELECT * FROM user_profiles WHERE email = $1`, [email]);
      if (result.rows.length > 0) {
        return res.json({ success: true, profile: rowToProfile(result.rows[0]) });
      }
    } catch (e) {
      console.error("Postgres profile get error:", e);
    }
  }

  const cached = inMemoryStore.profiles.get(email);
  if (cached) {
    return res.json({ success: true, profile: cached, storage: "In-Memory Fallback" });
  }

  return res.json({ success: false, message: "Profile not found in database" });
});

// Real Google Sign-In verification. The frontend sends the signed ID token
// it gets back from Google Identity Services; we verify it here against
// Google's servers before trusting the email at all. This replaces the old
// demo flow where any typed email logged you in with no verification.
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ success: false, error: "Missing Google credential" });
  }
  if (!googleClient || !googleClientId) {
    return res.status(500).json({ success: false, error: "Google sign-in isn't configured on this server (missing GOOGLE_CLIENT_ID)." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    payload = ticket.getPayload();
  } catch (e) {
    console.warn("Google ID token verification failed:", e);
    return res.status(401).json({ success: false, error: "Could not verify Google sign-in. Please try again." });
  }

  if (!payload || !payload.email || !payload.email_verified) {
    return res.status(401).json({ success: false, error: "Google account email is not verified." });
  }

  const email = payload.email;
  const name = payload.name || email.split("@")[0];
  const avatar = payload.picture || "";

  const pool = await getPg();
  if (pool) {
    try {
      const result = await pool.query(`SELECT * FROM user_profiles WHERE email = $1`, [email]);
      if (result.rows.length > 0) {
        return res.json({ success: true, profile: rowToProfile(result.rows[0]) });
      }
    } catch (e) {
      console.error("Postgres profile lookup error:", e);
    }
  }

  // Postgres absent or the lookup above failed — before assuming this is a
  // first-time sign-in, check the in-memory fallback too. Previously this
  // step was skipped entirely whenever `pool` was falsy, so every login
  // without a working DB connection silently overwrote real progress
  // with a fresh 0-XP profile.
  const cachedExisting = inMemoryStore.profiles.get(email);
  if (cachedExisting) {
    return res.json({ success: true, profile: cachedExisting, storage: "In-Memory Fallback" });
  }

  // First-time sign-in: start fresh at 0 XP.
  const freshProfile = {
    email, name, avatar, isLoggedIn: true,
    xp: 0, level: 1, levelTitle: "Intern Quest", streakDays: 0, readinessScore: 0,
    completedTests: 0, completedInterviews: 0, completedGDs: 0,
    domainScores: { Finance: 0, HR: 0, Marketing: 0, "Business Analytics": 0, Operations: 0, Strategy: 0 },
  };

  if (pool) {
    try {
      await upsertProfile(pool, freshProfile);
    } catch (e) {
      console.error("Postgres profile create error:", e);
    }
  } else {
    inMemoryStore.profiles.set(email, { ...freshProfile, updatedAt: new Date().toISOString() });
  }

  return res.json({ success: true, profile: freshProfile });
});

// Get Candidate History Route
app.get("/api/db/history", async (req, res) => {
  const pool = await getPg();
  if (pool) {
    try {
      const scores = (await pool.query(`SELECT * FROM aptitude_scores ORDER BY created_at DESC LIMIT 20`)).rows;
      const interviews = (await pool.query(`SELECT * FROM interview_evaluations ORDER BY created_at DESC LIMIT 20`)).rows;
      return res.json({ success: true, storage: "Postgres", scores, interviews });
    } catch (e) {
      console.error("Postgres query error:", e);
    }
  }

  return res.json({ success: true, storage: "In-Memory Fallback", scores: inMemoryStore.scores, interviews: inMemoryStore.interviews });
});

// Initialize Gemini SDK with User-Agent header as required
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini request timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// Retries a Gemini call up to `attempts` times with a short backoff before
// giving up. Most interview-evaluation failures are transient (rate limit /
// momentary timeout on the model call), so a single retry clears the large
// majority of them instead of immediately dropping the user to a fallback.
async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 800): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await withTimeout(fn(), 25000);
    } catch (err) {
      lastError = err;
      console.error(`Gemini call attempt ${i + 1}/${attempts} failed:`, err);
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

// Builds a real (non-zero) evaluation from the actual transcript when Gemini
// is unavailable, so the candidate never sees a blanket "0/100 — AI service
// did not respond" screen. Scores are heuristic (based on answer length and
// completeness) and clearly labeled as an estimate in each note.
function buildHeuristicEvaluation(role: string, qaPairs: any[]): any {
  const answers = (qaPairs || []).map((q) => (q?.userAnswer || "").trim());
  const answered = answers.filter((a) => a.length > 0);
  const avgLen = answered.length
    ? answered.reduce((sum, a) => sum + a.split(/\s+/).length, 0) / answered.length
    : 0;

  // Simple, transparent heuristic: reward longer, more complete answers.
  // Clamped so it never reads as a polished AI score, just a fair estimate.
  const completeness = qaPairs?.length ? answered.length / qaPairs.length : 0;
  const depthScore = Math.min(100, Math.round(avgLen * 2.5));
  const baseScore = Math.round(completeness * 50 + Math.min(depthScore, 50));
  const clampedScore = Math.max(35, Math.min(baseScore, 80));

  const note = "Estimated score — our AI evaluator was temporarily unavailable, so this reflects a basic completeness/length check of your answer rather than a full review.";

  return {
    role: role || "Candidate Interview",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    readinessScore: clampedScore,
    percentile: Math.max(5, 100 - clampedScore),
    metrics: {
      communication: { score: clampedScore, note },
      technicalAccuracy: { score: clampedScore, note },
      bodyLanguage: { score: clampedScore, note: "Not evaluated — AI evaluator was unavailable for this session." },
      confidence: { score: clampedScore, note },
    },
    transcript: (qaPairs || []).map((pair: any, i: number) => ({
      id: String(pair.id ?? i + 1),
      question: pair.question,
      answer: pair.userAnswer || "",
      aiInsight: "AI insight unavailable for this answer — the evaluator service could not be reached.",
    })),
    nextSteps: [
      { title: "Retry Evaluation", description: "Our AI evaluator hit a temporary issue. Try running the interview again for a full, detailed report.", icon: "refresh" },
    ],
    recommendedResources: [],
    degraded: true,
  };
}

// API Endpoint 1: Generate dynamic quiz questions for topics or module tests (supports 20 to 30 gaming questions per topic)
app.post("/api/gemini/generate-questions", async (req, res) => {
  const { topicTitle, category, count = 20, domain = "General Management" } = req.body;
  const targetCount = Math.max(20, Number(count) || 20);
  const ai = getGeminiClient();

  // Each entry returns a distinct scenario for index `i`. Cycling through
  // several templates per domain (instead of one fixed template with only
  // the numbers changing) is what actually makes a 20-30 question fallback
  // set feel varied instead of repetitive.
  type FallbackTemplate = (i: number, topicName: string, catName: string) => { question: string; options: string[]; correctIndex: number; explanation: string };

  const financeTemplates: FallbackTemplate[] = [
    (i, topicName) => {
      const revenue = (i * 40) + 150; const opex = Math.round(revenue * 0.55);
      const ebitda = revenue - opex; const margin = Math.round((ebitda / revenue) * 100);
      return {
        question: `A corporate entity generated $${revenue}M Revenue with $${opex}M OPEX in Q${(i % 4) + 1}. What is the EBITDA margin percentage?`,
        options: [`${margin - 15}%`, `${margin}%`, `${margin + 10}%`, `${margin + 20}%`],
        correctIndex: 1,
        explanation: `EBITDA = Revenue ($${revenue}M) - OPEX ($${opex}M) = $${ebitda}M. EBITDA Margin = ($${ebitda}M / $${revenue}M) * 100 = ${margin}%.`,
      };
    },
    (i) => {
      const principal = (i * 25) + 100; const rate = 6 + (i % 5); const years = 3 + (i % 4);
      const fv = Math.round(principal * Math.pow(1 + rate / 100, years));
      return {
        question: `An investment of $${principal}K compounds annually at ${rate}% for ${years} years. What is the approximate future value?`,
        options: [`$${Math.round(fv * 0.85)}K`, `$${fv}K`, `$${Math.round(fv * 1.1)}K`, `$${Math.round(fv * 1.25)}K`],
        correctIndex: 1,
        explanation: `FV = P × (1 + r)^n = $${principal}K × (1 + ${rate}%)^${years} ≈ $${fv}K.`,
      };
    },
    (i) => {
      const debt = (i * 10) + 40; const equity = (i * 8) + 60;
      const ratio = (debt / equity).toFixed(2);
      return {
        question: `A firm carries $${debt}M in total debt and $${equity}M in shareholder equity. What is its Debt-to-Equity ratio?`,
        options: [`${(Number(ratio) - 0.3).toFixed(2)}`, `${ratio}`, `${(Number(ratio) + 0.2).toFixed(2)}`, `${(Number(ratio) + 0.5).toFixed(2)}`],
        correctIndex: 1,
        explanation: `Debt-to-Equity = Total Debt / Shareholder Equity = $${debt}M / $${equity}M = ${ratio}.`,
      };
    },
    (i) => {
      const cashflows = [(i * 5) + 20, (i * 4) + 25, (i * 3) + 30];
      const npv = Math.round(cashflows.reduce((s, c, idx) => s + c / Math.pow(1.1, idx + 1), 0) - ((i * 6) + 50));
      return {
        question: `A project requires an initial outlay of $${(i * 6) + 50}M and returns cash flows of $${cashflows.join('M, $')}M over 3 years at a 10% discount rate. Is the NPV positive or negative, and approximately what value?`,
        options: [`Negative, approx -$${Math.abs(npv) + 5}M`, `${npv >= 0 ? 'Positive' : 'Negative'}, approx $${npv}M`, `Exactly $0M (break-even)`, `Positive, approx $${Math.abs(npv) + 20}M`],
        correctIndex: 1,
        explanation: `NPV = Σ (Cash Flow / (1+r)^t) − Initial Outlay ≈ $${npv}M, so the project is ${npv >= 0 ? 'value-accretive' : 'value-destructive'} at a 10% discount rate.`,
      };
    },
    () => ({
      question: `A CFO is deciding between debt and equity financing for expansion. Which factor most directly favors debt financing over equity?`,
      options: [
        'The company wants to avoid all fixed obligations',
        'Interest payments are tax-deductible, lowering the after-tax cost of capital',
        'Debt never needs to be repaid',
        'Equity holders demand no return',
      ],
      correctIndex: 1,
      explanation: `Interest is tax-deductible (the "tax shield"), which lowers the effective cost of debt relative to equity, though it adds fixed repayment risk.`,
    }),
    () => ({
      question: `Two acquisition targets have identical revenue, but Target A has a higher Free Cash Flow Conversion ratio. What does this indicate?`,
      options: [
        'Target A has weaker unit economics',
        'Target A converts more of its earnings into distributable cash, a sign of capital efficiency',
        'Target A has higher debt',
        'Free Cash Flow Conversion is irrelevant to valuation',
      ],
      correctIndex: 1,
      explanation: `Free Cash Flow Conversion (FCF / EBITDA or Net Income) shows how efficiently earnings become spendable cash — higher is generally better for valuation.`,
    }),
  (i) => {
      const currentAssets = (i * 12) + 80; const currentLiabilities = (i * 7) + 50;
      const workingCapital = currentAssets - currentLiabilities;
      return {
        question: `A company reports Current Assets of $${currentAssets}M and Current Liabilities of $${currentLiabilities}M. What is its Working Capital?`,
        options: [`$${workingCapital - 10}M`, `$${workingCapital}M`, `$${workingCapital + 15}M`, `$${workingCapital + 30}M`],
        correctIndex: 1,
        explanation: `Working Capital = Current Assets − Current Liabilities = $${currentAssets}M − $${currentLiabilities}M = $${workingCapital}M.`,
      };
    },
    (i) => {
      const cogs = (i * 20) + 100; const avgInventory = (i * 4) + 20;
      const turnover = (cogs / avgInventory).toFixed(1);
      return {
        question: `A retailer has COGS of $${cogs}M and Average Inventory of $${avgInventory}M. What is the Inventory Turnover Ratio?`,
        options: [`${(Number(turnover)-1.5).toFixed(1)}x`, `${turnover}x`, `${(Number(turnover)+1).toFixed(1)}x`, `${(Number(turnover)+2.5).toFixed(1)}x`],
        correctIndex: 1,
        explanation: `Inventory Turnover = COGS / Average Inventory = $${cogs}M / $${avgInventory}M = ${turnover}x, showing how many times inventory is sold and replaced per period.`,
      };
    },
    (i) => {
      const netIncome = (i * 5) + 30; const equity = (i * 20) + 150;
      const roe = ((netIncome / equity) * 100).toFixed(1);
      return {
        question: `A firm posts Net Income of $${netIncome}M on Shareholder Equity of $${equity}M. Using the basic ROE formula, what is its Return on Equity?`,
        options: [`${(Number(roe)-3).toFixed(1)}%`, `${roe}%`, `${(Number(roe)+2).toFixed(1)}%`, `${(Number(roe)+5).toFixed(1)}%`],
        correctIndex: 1,
        explanation: `ROE = Net Income / Shareholder Equity = $${netIncome}M / $${equity}M = ${roe}%.`,
      };
    },
    (i) => {
      const investment = (i * 15) + 60; const annualCashFlow = (i * 3) + 15;
      const payback = (investment / annualCashFlow).toFixed(1);
      return {
        question: `A project requires an initial investment of $${investment}M and generates $${annualCashFlow}M in annual cash flow. What is the Payback Period?`,
        options: [`${(Number(payback)-1).toFixed(1)} years`, `${payback} years`, `${(Number(payback)+1.5).toFixed(1)} years`, `${(Number(payback)+3).toFixed(1)} years`],
        correctIndex: 1,
        explanation: `Payback Period = Initial Investment / Annual Cash Flow = $${investment}M / $${annualCashFlow}M ≈ ${payback} years.`,
      };
    },
    () => ({
      question: `Using CAPM, if the risk-free rate is 4%, the market return is 10%, and a stock's beta is 1.2, what is its Cost of Equity?`,
      options: ['10.0%', '11.2%', '13.2%', '16.0%'],
      correctIndex: 1,
      explanation: `Cost of Equity = Rf + β(Rm − Rf) = 4% + 1.2 × (10% − 4%) = 4% + 7.2% = 11.2%.`,
    }),
    () => ({
      question: `A bond's yield to maturity (YTM) rises sharply after issuance while its coupon rate stays fixed. What happened to the bond's market price?`,
      options: [
        'It rose, since yields and prices move together',
        'It fell, since bond prices and yields move inversely',
        'It stayed exactly the same',
        'Price is unrelated to yield changes',
      ],
      correctIndex: 1,
      explanation: `Bond prices and yields have an inverse relationship — as required yields rise, the present value of fixed coupon payments falls, pushing the bond's market price down.`,
    }),];

  const marketingTemplates: FallbackTemplate[] = [
    (i) => {
      const spend = (i * 15000) + 20000; const customers = (i * 400) + 500;
      const cac = Math.round(spend / customers);
      return {
        question: `A campaign spent $${spend.toLocaleString()} and acquired ${customers.toLocaleString()} customers. What is the Customer Acquisition Cost (CAC)?`,
        options: [`$${cac - 8}`, `$${cac}`, `$${cac + 12}`, `$${cac * 2}`],
        correctIndex: 1,
        explanation: `CAC = Total Spend / New Customers = $${spend.toLocaleString()} / ${customers.toLocaleString()} ≈ $${cac}.`,
      };
    },
    (i) => {
      const arpu = 20 + (i % 15); const churn = 2 + (i % 6); const ltv = Math.round((arpu * 100) / churn);
      return {
        question: `A subscription product has ARPU of $${arpu}/month and a monthly churn rate of ${churn}%. What is the approximate customer Lifetime Value (LTV)?`,
        options: [`$${Math.round(ltv * 0.6)}`, `$${ltv}`, `$${Math.round(ltv * 1.3)}`, `$${Math.round(ltv * 1.8)}`],
        correctIndex: 1,
        explanation: `LTV ≈ ARPU / Churn Rate = $${arpu} / ${churn / 100} ≈ $${ltv}.`,
      };
    },
    () => ({
      question: `A brand sees rising impressions but falling click-through rate (CTR) over a quarter. What is the most likely explanation?`,
      options: [
        'Ad creative fatigue among a saturated audience',
        'The product price decreased',
        'CTR is unaffected by creative or audience factors',
        'Impressions and CTR always move together',
      ],
      correctIndex: 0,
      explanation: `Rising impressions with falling CTR classically signals creative fatigue — the same audience is seeing the same ad too often.`,
    }),
    () => ({
      question: `Which metric best captures whether marketing spend is actually profitable, not just growth-generating?`,
      options: ['Total impressions', 'LTV:CAC ratio', 'Number of ad campaigns launched', 'Social media follower count'],
      correctIndex: 1,
      explanation: `LTV:CAC ratio (commonly targeting 3:1 or higher) directly measures whether the value a customer generates exceeds what it cost to acquire them.`,
    }),
  (i) => {
      const customers = (i * 500) + 2000; const totalMarket = (i * 3000) + 20000;
      const penetration = ((customers / totalMarket) * 100).toFixed(1);
      return {
        question: `A brand has ${customers.toLocaleString()} customers in a total addressable market of ${totalMarket.toLocaleString()}. What is its Market Penetration Rate?`,
        options: [`${(Number(penetration)-3).toFixed(1)}%`, `${penetration}%`, `${(Number(penetration)+4).toFixed(1)}%`, `${(Number(penetration)+8).toFixed(1)}%`],
        correctIndex: 1,
        explanation: `Market Penetration = Customers / Total Addressable Market × 100 = ${customers.toLocaleString()} / ${totalMarket.toLocaleString()} × 100 ≈ ${penetration}%.`,
      };
    },
    () => ({
      question: `A company's Net Promoter Score (NPS) survey shows 50% Promoters, 30% Passives, and 20% Detractors. What is the NPS?`,
      options: ['20', '30', '50', '70'],
      correctIndex: 1,
      explanation: `NPS = %Promoters − %Detractors = 50% − 20% = 30. Passives are excluded from the calculation entirely.`,
    }),
    (i) => {
      const visitors = (i * 2000) + 10000; const purchases = (i * 40) + 200;
      const conv = ((purchases / visitors) * 100).toFixed(2);
      return {
        question: `An e-commerce funnel had ${visitors.toLocaleString()} visitors and ${purchases.toLocaleString()} purchases last month. What is the conversion rate?`,
        options: [`${(Number(conv)-0.5).toFixed(2)}%`, `${conv}%`, `${(Number(conv)+0.8).toFixed(2)}%`, `${(Number(conv)+1.5).toFixed(2)}%`],
        correctIndex: 1,
        explanation: `Conversion Rate = Purchases / Visitors × 100 = ${purchases.toLocaleString()} / ${visitors.toLocaleString()} × 100 ≈ ${conv}%.`,
      };
    },
    () => ({
      question: `In the classic marketing mix (4 Ps), a company drops its price significantly right after a competitor's product launch. Which "P" is being adjusted?`,
      options: ['Product', 'Price', 'Place', 'Promotion'],
      correctIndex: 1,
      explanation: `Price is one of the 4 Ps (Product, Price, Place, Promotion) — adjusting the price point directly in response to competitive pressure is a pricing-strategy decision.`,
    }),
    (i) => {
      const adSpend = (i * 2000) + 8000; const revenue = (i * 9000) + 30000;
      const roas = (revenue / adSpend).toFixed(1);
      return {
        question: `A campaign spent $${adSpend.toLocaleString()} on ads and generated $${revenue.toLocaleString()} in attributed revenue. What is the Return on Ad Spend (ROAS)?`,
        options: [`${(Number(roas)-0.8).toFixed(1)}x`, `${roas}x`, `${(Number(roas)+0.6).toFixed(1)}x`, `${(Number(roas)+1.5).toFixed(1)}x`],
        correctIndex: 1,
        explanation: `ROAS = Revenue / Ad Spend = $${revenue.toLocaleString()} / $${adSpend.toLocaleString()} ≈ ${roas}x, meaning every $1 spent returned $${roas}.`,
      };
    },
    () => ({
      question: `Two products have identical features and price, but one commands a much higher willingness-to-pay. What best explains this gap?`,
      options: [
        'Random chance in customer surveys',
        'Strong brand equity built through perceived quality, awareness, and loyalty',
        'The product with lower price always wins regardless of brand',
        'Brand has no measurable effect on pricing power',
      ],
      correctIndex: 1,
      explanation: `Brand equity — the accumulated value from awareness, perceived quality, and loyalty — lets a brand charge a premium even when functional attributes are identical to competitors.`,
    }),];

  const hrTemplates: FallbackTemplate[] = [
    (_i, topicName) => ({
      question: `In evaluating organizational talent retention for ${topicName || 'the org'}, which analytics metric best predicts key-employee flight risk?`,
      options: [
        'Gross headcount at fiscal year end',
        'Voluntary turnover segmented by high-performer tenure cohorts and eNPS scores',
        'Total annual office supply costs',
        'Average employee age distribution',
      ],
      correctIndex: 1,
      explanation: `Segmented voluntary turnover correlated with eNPS isolates flight risk among the employees who matter most to retain.`,
    }),
    () => ({
      question: `A company's engagement survey shows high satisfaction but high attrition among top performers. What does this combination most likely suggest?`,
      options: [
        'The survey itself is flawed and should be discarded',
        'Top performers are leaving for growth or compensation reasons unrelated to day-to-day satisfaction',
        'Attrition data is always noise',
        'Nothing — the two metrics are unrelated',
      ],
      correctIndex: 1,
      explanation: `Satisfaction surveys often miss career-growth and compensation drivers, which disproportionately affect high performers' exit decisions.`,
    }),
    () => ({
      question: `When redesigning a performance appraisal system to reduce bias, which change has the most direct impact?`,
      options: [
        'Adding more subjective free-text fields',
        'Calibration sessions across managers using structured, criteria-based rubrics',
        'Removing all manager input',
        'Appraising employees only once every 3 years',
      ],
      correctIndex: 1,
      explanation: `Cross-manager calibration against a shared rubric is the standard lever for reducing individual rater bias in appraisals.`,
    }),
  (i) => {
      const marketMedian = (i * 2) + 60; const currentPay = (i * 2) + 54;
      const compaRatio = (currentPay / marketMedian).toFixed(2);
      return {
        question: `An employee earns $${currentPay}K against a market median of $${marketMedian}K for the role. What is their compa-ratio, and what does it suggest?`,
        options: [
          `${compaRatio} — paid above market`,
          `${compaRatio} — paid below market median, a retention risk`,
          `${compaRatio} — exactly at market rate`,
          `Compa-ratio cannot be calculated from this data`,
        ],
        correctIndex: 1,
        explanation: `Compa-ratio = Employee Pay / Market Median = $${currentPay}K / $${marketMedian}K = ${compaRatio}. A ratio below 1.0 signals below-market pay, a common driver of voluntary attrition.`,
      };
    },
    () => ({
      question: `A company has no identified successor for its CFO role, who plans to retire within a year. What HR practice most directly mitigates this risk?`,
      options: [
        'Waiting until the CFO formally resigns to begin searching',
        'A structured succession plan identifying and developing internal high-potential candidates in advance',
        'Freezing the finance department budget',
        'Succession planning is only relevant for CEO-level roles',
      ],
      correctIndex: 1,
      explanation: `Succession planning proactively identifies and develops internal candidates for critical roles, reducing disruption and search time when a leader departs.`,
    }),
    (i) => {
      const trainingCost = (i * 5) + 20; const productivityGain = (i * 9) + 35;
      const roi = (((productivityGain - trainingCost) / trainingCost) * 100).toFixed(0);
      return {
        question: `A training program cost $${trainingCost}K and produced a measured productivity gain valued at $${productivityGain}K. What is the Training ROI?`,
        options: [`${Number(roi)-20}%`, `${roi}%`, `${Number(roi)+15}%`, `${Number(roi)+40}%`],
        correctIndex: 1,
        explanation: `Training ROI = (Gain − Cost) / Cost × 100 = ($${productivityGain}K − $${trainingCost}K) / $${trainingCost}K × 100 ≈ ${roi}%.`,
      };
    },
    () => ({
      question: `A firm's diversity dashboard shows strong representation at entry level but a sharp drop-off at senior management. What does this pattern typically indicate?`,
      options: [
        'The hiring pipeline is entirely responsible and nothing else matters',
        'A leaky pipeline — barriers to advancement or retention that disproportionately affect underrepresented groups as they move up',
        'The company has no diversity issue since entry-level looks fine',
        'This pattern is statistically impossible',
      ],
      correctIndex: 1,
      explanation: `This leaky-pipeline pattern points to promotion, mentorship, or retention barriers further up the career ladder, not just a hiring-stage problem.`,
    }),
    () => ({
      question: `On a 9-box talent grid, an employee rated "High Performance, Low Potential" is best suited for which action?`,
      options: [
        'Immediate promotion to a leadership track',
        'Recognition and reward in their current role, without assuming they want or fit a broader leadership path',
        'Termination, since low potential is disqualifying',
        'No action of any kind should be taken',
      ],
      correctIndex: 1,
      explanation: `High performers with lower assessed leadership potential are often best retained and rewarded as strong specialists rather than pushed into a mismatched leadership track.`,
    }),
    (i) => {
      const daysAbsent = (i * 3) + 20; const workDays = (i * 10) + 220;
      const rate = ((daysAbsent / workDays) * 100).toFixed(1);
      return {
        question: `A department logged ${daysAbsent} absence-days out of ${workDays} total scheduled work-days this year. What is the Absenteeism Rate?`,
        options: [`${(Number(rate)-1).toFixed(1)}%`, `${rate}%`, `${(Number(rate)+1.5).toFixed(1)}%`, `${(Number(rate)+3).toFixed(1)}%`],
        correctIndex: 1,
        explanation: `Absenteeism Rate = Absence Days / Total Scheduled Work Days × 100 = ${daysAbsent} / ${workDays} × 100 ≈ ${rate}%.`,
      };
    },];

  const analyticsTemplates: FallbackTemplate[] = [
    (i, topicName) => ({
      question: `In a predictive analytics model for ${topicName || 'this business problem'}, a regression yields an R-squared of 0.${70 + (i % 20)}. How should leaders interpret this?`,
      options: [
        `${70 + (i % 20)}% of predictions are inaccurate`,
        `${70 + (i % 20)}% of variance in the target metric is explained by the model's features`,
        `The absolute error margin is ${70 + (i % 20)} units`,
        `Only ${30 - (i % 20)}% of data points were sampled`,
      ],
      correctIndex: 1,
      explanation: `R-squared is the proportion of variance in the dependent variable explained by the model — not an accuracy or error percentage.`,
    }),
    () => ({
      question: `A/B test results show a 2% lift with a p-value of 0.09. What is the most statistically sound conclusion?`,
      options: [
        'The result is definitively significant and should be rolled out immediately',
        'The result does not meet the conventional 0.05 significance threshold — more data or a longer test is warranted',
        'p-values do not matter for A/B testing',
        'A 2% lift is always meaningful regardless of significance',
      ],
      correctIndex: 1,
      explanation: `At the common 5% significance level, p = 0.09 fails to reject the null hypothesis, so the observed lift could plausibly be noise.`,
    }),
    () => ({
      question: `Two models have similar accuracy, but Model A has much higher recall while Model B has much higher precision. For a fraud-detection use case, which tradeoff usually matters more?`,
      options: [
        'Precision, because missing fraud cases is always cheaper than false alarms',
        'Recall, since missing actual fraud (false negatives) is often more costly than investigating false alarms',
        'Neither matters if accuracy is equal',
        'Recall and precision are the same metric',
      ],
      correctIndex: 1,
      explanation: `In fraud detection, false negatives (missed fraud) are typically far more costly than false positives, so recall is often prioritized.`,
    }),
  () => ({
      question: `A K-means clustering model on customer data produces 4 distinct clusters with very high within-cluster variance. What does this most likely suggest?`,
      options: [
        'The clustering is perfect and needs no further work',
        `The chosen number of clusters (k) may be too low, or the features used don't separate customers well`,
        'High within-cluster variance is always desirable',
        'K-means cannot produce variance metrics',
      ],
      correctIndex: 1,
      explanation: `High within-cluster variance suggests points in the same cluster aren't very similar — often fixed by testing more values of k (e.g. via the elbow method) or better feature selection.`,
    }),
    () => ({
      question: `Ice cream sales and drowning incidents are strongly positively correlated across months. What is the correct interpretation?`,
      options: [
        'Ice cream sales cause drownings',
        'Drownings cause ice cream sales',
        'Both are driven by a third variable (hot weather/summer), a classic correlation-does-not-imply-causation case',
        'The correlation must be a calculation error',
      ],
      correctIndex: 2,
      explanation: `This is a textbook confounding-variable case — a third factor (warm weather) drives both variables independently, and the correlation between them is not causal.`,
    }),
    () => ({
      question: `A customer satisfaction survey is emailed only to customers who made a purchase in the last 30 days. What bias does this sampling method introduce?`,
      options: [
        'No bias — email surveys are always representative',
        'Survivorship/selection bias — it excludes churned or infrequent customers, likely inflating satisfaction scores',
        'This method guarantees a random sample',
        'Sampling method never affects survey results',
      ],
      correctIndex: 1,
      explanation: `Restricting the sample to recent purchasers excludes dissatisfied customers who already churned, systematically inflating the measured satisfaction score.`,
    }),
    () => ({
      question: `A retailer's monthly sales data shows a repeating spike every December for 5 straight years. What time-series component does this represent?`,
      options: ['Trend', 'Seasonality', 'Random noise', 'Structural break'],
      correctIndex: 1,
      explanation: `A regularly repeating pattern tied to a specific calendar period (like December holiday sales) is classic seasonality, distinct from a long-term trend or one-off structural break.`,
    }),
    () => ({
      question: `A model reports a 95% confidence interval for average customer spend of [$42, $58]. What is the correct interpretation?`,
      options: [
        '95% of customers spend between $42 and $58',
        'If we repeated this sampling process many times, about 95% of such intervals would contain the true population mean',
        'There is a 95% chance the true mean is exactly $50',
        'Confidence intervals guarantee the exact population value',
      ],
      correctIndex: 1,
      explanation: `A confidence interval describes the reliability of the estimation procedure across repeated sampling — it does not mean 95% of individual data points fall in that range.`,
    }),];

  const generalTemplates: FallbackTemplate[] = [
    (_i, topicName, catName) => ({
      question: `Which strategic framework best supports rigorous decision-making when addressing "${topicName || catName || 'this business issue'}" in a boardroom setting?`,
      options: [
        'Making assumptions without financial sensitivity testing',
        'Applying MECE (Mutually Exclusive, Collectively Exhaustive) structuring, risk modeling, and ROI calculation',
        'Relying solely on historic gut instinct',
        'Deferring the decision indefinitely',
      ],
      correctIndex: 1,
      explanation: `Boardroom rigor typically demands MECE decomposition, financial benchmarking, and explicit risk mitigation.`,
    }),
    (_i, topicName) => ({
      question: `A cross-functional team disagrees on how to prioritize "${topicName || 'a strategic initiative'}." What is the most effective first step?`,
      options: [
        'Escalate immediately to the CEO without discussion',
        'Align on shared success metrics before debating specific tactics',
        'Let the loudest voice in the room decide',
        'Postpone the decision until the next fiscal year',
      ],
      correctIndex: 1,
      explanation: `Aligning on shared, measurable success criteria first prevents debates over tactics from masking a deeper disagreement about goals.`,
    }),
    () => ({
      question: `When entering a new market, which factor is most commonly underestimated by executive teams?`,
      options: [
        'Local regulatory and cultural adaptation costs',
        'Total addressable market size',
        'Competitor pricing (always fully known in advance)',
        'None — market entry risk is usually overestimated',
      ],
      correctIndex: 0,
      explanation: `Regulatory complexity and cultural/localization needs are frequently underestimated relative to headline market-size opportunity.`,
    }),
  () => ({
      question: `Using Porter's Five Forces, a market with low switching costs, many substitute products, and price-sensitive buyers signals which condition?`,
      options: [
        'High barriers to entry protecting incumbents',
        'High buyer power and intense competitive rivalry, compressing margins',
        'A natural monopoly with no competitive pressure',
        `These factors are irrelevant to Porter's framework`,
      ],
      correctIndex: 1,
      explanation: `Low switching costs, abundant substitutes, and price-sensitive buyers all strengthen buyer power and rivalry — two of Porter's five forces that squeeze industry profitability.`,
    }),
    (_i, topicName) => ({
      question: `In a SWOT analysis for "${topicName || 'a new market entry'}", a strong existing distribution network but weak brand recognition abroad would be classified as which combination?`,
      options: ['Strength and Opportunity', 'Strength and Weakness', 'Weakness and Threat', 'Opportunity and Threat'],
      correctIndex: 1,
      explanation: `An existing distribution network is an internal Strength; weak brand recognition abroad is an internal Weakness — both are internal factors, distinct from external Opportunities/Threats.`,
    }),
    () => ({
      question: `A company creates an entirely new product category with no direct competitors, rather than competing on price in a saturated market. This best describes which strategic concept?`,
      options: ['Red Ocean Strategy', 'Blue Ocean Strategy', 'Cost Leadership', 'Vertical Integration'],
      correctIndex: 1,
      explanation: `Blue Ocean Strategy focuses on creating uncontested market space rather than competing head-to-head in an existing, saturated market.`,
    }),
    () => ({
      question: `A major organizational restructuring fails despite a sound strategic rationale, because employees were never given a clear, urgent reason to change. Which step of Kotter's 8-step change model was likely skipped?`,
      options: ['Forming a powerful coalition', 'Creating a sense of urgency', 'Anchoring changes in culture', 'Removing obstacles'],
      correctIndex: 1,
      explanation: `Kotter's model begins with "Creating a Sense of Urgency" — without it, employees lack the motivation to support disruptive change, a common root cause of failed transformations.`,
    }),
    () => ({
      question: `A CEO makes decisions that boost short-term stock price (and their own bonus) at the expense of long-term shareholder value. This is a classic example of which governance issue?`,
      options: [
        'Perfect alignment between management and shareholders',
        'The agency problem — a conflict of interest between agents (management) and principals (shareholders)',
        'A regulatory requirement being properly followed',
        'This scenario has no governance implications',
      ],
      correctIndex: 1,
      explanation: `The agency problem arises when managers (agents) pursue their own interests at the expense of shareholders (principals) — a core concern in corporate governance design.`,
    }),
    (_i, topicName, catName) => ({
      question: `On a standard risk matrix, a risk with "High Impact" but "Low Probability" for "${topicName || catName || 'a strategic initiative'}" should typically be handled how?`,
      options: [
        `Ignored entirely since it's unlikely`,
        `Mitigated with contingency plans even though it's rare, because the potential impact is severe`,
        'Accepted without any monitoring',
        'Treated identically to a Low Impact, Low Probability risk',
      ],
      correctIndex: 1,
      explanation: `High-impact/low-probability risks (rare but catastrophic events) typically warrant contingency planning or risk transfer, because the potential damage is severe despite low likelihood.`,
    }),];

  const generateFallbackQuestions = (topicName: string, catName: string, numToGen: number) => {
    const templatesByDomain: Record<string, FallbackTemplate[]> = {
      Finance: financeTemplates,
      Marketing: marketingTemplates,
      HR: hrTemplates,
      'Business Analytics': analyticsTemplates,
    };
    const templates = templatesByDomain[domain] || generalTemplates;
    const seenQuestions = new Set<string>();
    const questions = [];

    for (let i = 1; i <= numToGen; i++) {
      const levelTier = i <= Math.ceil(numToGen * 0.25) ? "LVL 1 - Intern Quest" : i <= Math.ceil(numToGen * 0.5) ? "LVL 2 - Associate Sprint" : i <= Math.ceil(numToGen * 0.75) ? "LVL 3 - VP Strategy" : "LVL 4 - MD Boss Battle";

      // Cycle through templates, offsetting by domain length so different
      // topics don't line up on the same template at the same question index.
      let template = templates[(i - 1 + Math.floor(i / templates.length)) % templates.length];
      let built = template(i, topicName, catName);
      let attempts = 0;
      while (seenQuestions.has(built.question) && attempts < templates.length) {
        template = templates[(i + attempts) % templates.length];
        built = template(i + attempts, topicName, catName);
        attempts++;
      }
      seenQuestions.add(built.question);

      // Shuffle option order (and correct index with it) so the answer
      // isn't always sitting in the same slot across every question.
      const optionOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const shuffledOptions = optionOrder.map(idx => built.options[idx]);
      const newCorrectIndex = optionOrder.indexOf(built.correctIndex);

      questions.push({
        id: `q_fallback_${i}`,
        topicId: topicName || 'general',
        question: `[🎮 ${levelTier} | Q${i}/${numToGen}] ${built.question}`,
        options: shuffledOptions,
        correctAnswer: newCorrectIndex,
        explanation: `${built.explanation} (+50 XP)`
      });
    }
    return questions;
  };

  if (!ai) {
    return res.json({
      success: true,
      questions: generateFallbackQuestions(topicTitle, category, targetCount)
    });
  }

  try {
    const prompt = `Generate exactly ${targetCount} comprehensive, concept-building multiple choice assessment questions for ${category} Aptitude, specifically topic: "${topicTitle}". 
The questions MUST range from foundational concepts to advanced edge cases to promote deep learning. 
Each question must have 4 distinct, plausible options, a 0-indexed correct answer, and a detailed, step-by-step explanation for why the answer is correct and how to master this concept.

Critical variety requirements — questions must NOT feel repetitive:
- Do not reuse the same sentence structure, opening phrase, or scenario template for more than 2 questions in a row.
- Vary the question TYPE across the set: mix numeric/calculation problems, scenario judgment calls, conceptual definitions, "which of these is FALSE/NOT true" questions, and short case vignettes.
- Vary the numbers, company names, and scenarios used — don't reuse the same fictional company or dataset twice.
- Spread the correct answer across all 4 option positions roughly evenly — do not always put the correct answer in the same slot.`;

   const response = await withTimeout(ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["id", "question", "options", "correctAnswer", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      },
    }), 15000);

    const data = JSON.parse(response.text || "{}");
    const returnedQuestions = data.questions || [];

    // Ensure we return at least 10 questions if Gemini produced fewer
    if (returnedQuestions.length < targetCount) {
      const extraNeeded = targetCount - returnedQuestions.length;
      const extraQuestions = generateFallbackQuestions(topicTitle, category, extraNeeded);
      return res.json({ success: true, questions: [...returnedQuestions, ...extraQuestions] });
    }

    return res.json({ success: true, questions: returnedQuestions });
  } catch (error) {
    console.error("Error generating questions:", error);
    return res.json({
      success: true,
      questions: generateFallbackQuestions(topicTitle, category, targetCount)
    });
  }
});

// Shared pools of varied fallback lines so repeated calls without a Gemini key
// (or when Gemini errors out) don't say the exact same thing every time.
const GD_FALLBACK_LINES: Record<string, ((topic: string) => string)[]> = {
  'Alex': [
    (topic) => `I partially agree, but from an implementation angle on ${topic} we need to weigh scalability against cost before a rapid rollout.`,
    (topic) => `Interesting take. On ${topic}, though, I'd want to see a pilot phase first to de-risk the technical rollout.`,
    (topic) => `Building on that — for ${topic}, the engineering lift is non-trivial, so phased delivery beats a big-bang launch.`,
    (topic) => `Fair point, but has anyone considered the maintenance overhead ${topic} would add to existing systems?`,
  ],
  'Sophia': [
    (topic) => `Building on that, data security and regulatory compliance are just as critical for ${topic}. Early auditing avoids delays later.`,
    (topic) => `From a policy lens, ${topic} raises some compliance questions we shouldn't gloss over.`,
    (topic) => `I'd push back slightly — the regulatory landscape around ${topic} varies a lot by region, so a one-size plan is risky.`,
    (topic) => `Good points so far, but stakeholder governance around ${topic} needs a clearer owner.`,
  ],
  'David': [
    (topic) => `Strong point! Beyond that, user adoption for ${topic} will hinge on intuitive UX and clear onboarding.`,
    (topic) => `I'd add that customer research should shape how we roll out ${topic}, not just internal assumptions.`,
    (topic) => `Agreed, though from a product standpoint ${topic} needs a crisper success metric before we commit resources.`,
    (topic) => `Nice framing — for ${topic}, I'd prioritize a small user test before scaling further.`,
  ],
};

const GD_INSIGHT_POOL = [
  "Strong point! Try inviting a quieter participant to weigh in next.",
  "Good engagement — keep responses concise and structured, e.g. using the STAR method.",
  "Nice structure. Summarizing the discussion so far could strengthen your leadership signal.",
  "You're building on others well — try adding one concrete data point or example next turn.",
  "Solid contribution. Consider steering toward a conclusion to show time-management awareness.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateGdTurn({ roomTopic, participantName, participantRole, transcript, lastUserMessage }: {
  roomTopic: string; participantName: string; participantRole: string; transcript: any[]; lastUserMessage: string;
}) {
  const ai = getGeminiClient();

  if (!ai) {
    const pool = GD_FALLBACK_LINES[participantName];
    const text = pool ? pickRandom(pool)(roomTopic) : `I think this is a crucial aspect of ${roomTopic} that requires balanced collaboration.`;
    return { success: true, text, aiInsight: pickRandom(GD_INSIGHT_POOL) };
  }

  try {
    const recentTexts = (transcript || []).map((m: any) => m.text).filter(Boolean);
    const prompt = `You are playing the role of ${participantName}, a ${participantRole} in a professional Group Discussion on the topic: "${roomTopic}".
Recent Discussion Transcript:
${transcript && transcript.length ? transcript.map((m: any) => `${m.senderName}: ${m.text}`).join("\n") : "Discussion started."}

Candidate just said: "${lastUserMessage}"

Provide a realistic 2-3 sentence contribution in character as ${participantName}. Agree, add a nuanced perspective, or respectfully challenge.
Do NOT repeat phrasing, sentence structure, or arguments already used earlier in the transcript (avoid: ${recentTexts.slice(-6).join(" | ") || "none yet"}).
Vary your opening words each time — do not always start with "That's a" or "Building on". Also provide a brief 1-sentence "aiInsight" for the candidate on how to improve their GD score, varying its phrasing too.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            aiInsight: { type: Type.STRING },
          },
          required: ["text", "aiInsight"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return { success: true, text: data.text, aiInsight: data.aiInsight };
  } catch (error) {
    console.error("Error generating GD response:", error);
    const pool = GD_FALLBACK_LINES[participantName];
    const text = pool ? pickRandom(pool)(roomTopic) : `That raises an interesting angle on ${roomTopic}. We should also weigh operational feasibility.`;
    return { success: true, text, aiInsight: pickRandom(GD_INSIGHT_POOL) };
  }
}

// API Endpoint 2: AI Participant Response in Group Discussion
app.post("/api/gemini/gd-turn", async (req, res) => {
  const result = await generateGdTurn(req.body);
  return res.json(result);
});

// API Endpoint 2.5: Final Group Discussion Evaluation
app.post("/api/gemini/gd-evaluation", async (req, res) => {
  const { transcript, userId } = req.body; // transcript = array of {senderName, text}
  const ai = getGeminiClient();

  if (!ai || !transcript || transcript.length === 0) {
    return res.json({ success: true, evaluation: { readinessScore: 0, metrics: {
      relevance: { score: 0, note: "No transcript captured." },
      clarity: { score: 0, note: "No transcript captured." },
      listening: { score: 0, note: "No transcript captured." },
      leadership: { score: 0, note: "No transcript captured." }
    }}});
  }

  try {
    const convo = transcript.map((t: any) => `${t.senderName}: ${t.text}`).join("\n");
    const prompt = `You are an MBA Group Discussion evaluator. Score ONLY the candidate's turns (the user, not AI peers) on Content Relevance, Communication Clarity, Listening/Building on Others, Leadership/Initiative (each 0-100). Transcript:\n${convo}\nReturn JSON only: {"readinessScore": n, "metrics": {"relevance": {"score": n, "note": "..."}, "clarity": {"score": n, "note": "..."}, "listening": {"score": n, "note": "..."}, "leadership": {"score": n, "note": "..."}}}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const evaluation = JSON.parse(response.text || "{}");
    return res.json({ success: true, evaluation });
  } catch (error) {
    console.error("GD evaluation error:", error);
    return res.json({ success: false });
  }
});

// API Endpoint 3: Interactive Step-by-Step AI Interviewer Turn
// API Endpoint: Parse an uploaded resume (plain text, already extracted
// client-side from the PDF/DOCX) into structured fields, plus a set of
// dropdown "focus" options that reference the candidate's actual resume
// content — used to drive the AI interview instead of a generic case study.
app.post("/api/gemini/resume-parse", async (req, res) => {
  const { resumeText, domain } = req.body;

  if (!resumeText || !String(resumeText).trim()) {
    return res.status(400).json({ success: false, error: "resumeText is required" });
  }

  const ai = getGeminiClient();

  // Heuristic fallback (no Gemini key configured): still lets the flow work,
  // just without resume-specific focus options.
  if (!ai) {
    return res.json({
      success: true,
      resumeSummary: {
        candidateName: "Candidate",
        headline: `${domain || "General"} track candidate`,
        skills: [],
        projects: [],
        experience: [],
        education: [],
        focusOptions: [
          { id: "mixed", label: "Mixed — let the AI pick", instruction: "Ask a balanced mix of questions grounded in the resume text provided." },
          { id: "general", label: `General ${domain || ""} round based on my resume`.trim(), instruction: "Ask general questions appropriate for the chosen domain, referencing the resume where possible." },
        ],
      },
    });
  }

  try {
    const prompt = `You are helping set up a realistic, resume-based mock interview (not a canned case study).
Read the candidate's resume text below and extract structured information, then propose 4-6 interview "focus options" a candidate could pick from a dropdown before the interview starts. Each focus option must reference something SPECIFIC and REAL from this resume (an actual project name, company, or skill mentioned) — never generic placeholders.

Target domain for this interview: "${domain || "General Management"}"

Resume text:
"""
${String(resumeText).slice(0, 12000)}
"""

Return:
1. candidateName (best guess from resume, else "Candidate")
2. headline (one line summarizing their profile)
3. skills (array of specific skills found)
4. projects (array of {name, description} — real projects found in the resume)
5. experience (array of {company, roleTitle, description} — real roles found)
6. education (array of strings)
7. focusOptions: 4-6 options like:
   - one per notable project ("Ask about my [Project Name]")
   - one per notable role/internship ("Ask about my time at [Company]")
   - one for skills ("Ask about my [specific skills]")
   - one general HR/domain-fit round based on the whole resume
   - one "Mixed — let the AI pick"
   Each option needs: id (short slug), label (short, first-person, shown in a dropdown), instruction (1-2 sentences telling the interviewer AI exactly what resume detail to probe and how, in the style of a real interviewer, not a case-study prompt).`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            candidateName: { type: Type.STRING },
            headline: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                required: ["name", "description"],
              },
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  roleTitle: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["company", "roleTitle", "description"],
              },
            },
            education: { type: Type.ARRAY, items: { type: Type.STRING } },
            focusOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                },
                required: ["id", "label", "instruction"],
              },
            },
          },
          required: ["candidateName", "focusOptions"],
        },
      },
    }), 2, 600);

    const resumeSummary = JSON.parse(response.text || "{}");
    return res.json({ success: true, resumeSummary });
  } catch (error) {
    console.error("Error parsing resume:", error);
    return res.status(500).json({ success: false, error: "Failed to parse resume" });
  }
});

app.post("/api/gemini/interview-step", async (req, res) => {
  const { domain, resumeSummary, focusLabel, focusInstruction, stepNumber, previousQuestions, userAnswer } = req.body;
  const ai = getGeminiClient();
  const domainLabel = domain || "General Management";
  const candidateName = resumeSummary?.candidateName || "the candidate";

  if (!ai) {
    const questionsByStep: Record<number, string> = {
      1: `Hi ${candidateName}, thanks for joining. Walk me through your background and why you're a fit for a ${domainLabel} role.`,
      2: `${focusLabel ? `Let's talk about "${focusLabel.replace(/^Ask about /i, "")}"` : "Let's go deeper on your resume"} — what was your specific contribution, and what would you do differently now?`,
      3: `From a ${domainLabel} lens, how did you measure success in that work, and what trade-offs did you have to make?`,
      4: `Tell me about a time something didn't go to plan in that project or role — how did you handle it?`
    };

    return res.json({
      success: true,
      nextQuestion: questionsByStep[stepNumber] || `Thanks, ${candidateName} — that's helpful. Do you have any questions for me about the ${domainLabel} role?`,
      feedback: userAnswer ? `Good detail — grounding your answer in specifics from your resume (numbers, your actual role) makes it land better with a real interviewer.` : null,
      isFinished: stepNumber > 4
    });
  }

  try {
    const resumeContext = resumeSummary
      ? `Candidate: ${resumeSummary.candidateName || "Candidate"}
Headline: ${resumeSummary.headline || "N/A"}
Skills: ${(resumeSummary.skills || []).join(", ") || "N/A"}
Projects: ${(resumeSummary.projects || []).map((p: any) => `${p.name} — ${p.description}`).join(" | ") || "N/A"}
Experience: ${(resumeSummary.experience || []).map((e: any) => `${e.roleTitle} at ${e.company} — ${e.description}`).join(" | ") || "N/A"}
Education: ${(resumeSummary.education || []).join(", ") || "N/A"}`
      : "No resume on file — ask general questions for the domain.";

    const prompt = `You are a real, experienced human interviewer conducting a natural, conversational interview for a "${domainLabel}" role. This is NOT a scripted case-study interview — do not pose invented business-case scenarios. Instead, ask the way a real interviewer would: reference the candidate's ACTUAL resume details below, ask them to elaborate, probe specifics, ask follow-ups on what they say.

Candidate's resume:
${resumeContext}

Chosen interview focus: ${focusLabel || "Mixed — let the AI pick"}
Focus guidance: ${focusInstruction || "Cover a natural mix of the candidate's resume highlights relevant to the domain."}

Step Number: ${stepNumber} / 5.
Previous Transcript:
${previousQuestions ? previousQuestions.map((q: any) => `Q: ${q.question}\nA: ${q.userAnswer || "N/A"}`).join("\n") : "Interview starting."}

Candidate's last answer: "${userAnswer || ""}"

1. Provide constructive 1-2 sentence real-time feedback on the candidate's last answer.
2. Generate the next question — it must sound like something a real interviewer would say out loud, and should reference a specific resume detail (project, company, skill) whenever one is available, rather than a generic prompt.
3. Indicate if the interview is finished (isFinished = true if step > 4).`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            nextQuestion: { type: Type.STRING },
            isFinished: { type: Type.BOOLEAN },
          },
          required: ["nextQuestion", "isFinished"],
        },
      },
    }), 2, 600);

    const data = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      nextQuestion: data.nextQuestion,
      feedback: data.feedback,
      isFinished: data.isFinished,
    });
  } catch (error) {
    console.error("Error in interview step:", error);
    return res.json({
      success: true,
      nextQuestion: `Tell me more about your role in ${resumeSummary?.projects?.[0]?.name || "your most recent project"} — what exactly did you own?`,
      feedback: `Good start — try to quantify the impact next time (numbers, outcomes) since that's what stands out to a real interviewer.`,
      isFinished: stepNumber > 4
    });
  }
});

// API Endpoint 3.5: Company-specific interview questions. Used for the
// follow-up rounds once the interview's 3 fixed starter questions are done,
// when the candidate entered a target company on the setup screen. Mirrors
// /api/gemini/interview-step but grounds every question in the named
// organization (business model, recent strategy, culture) instead of a
// generic domain prompt.
app.post("/api/gemini/company-interview-step", async (req, res) => {
  const { domain, resumeSummary, targetCompany, stepNumber, previousQuestions, userAnswer } = req.body;
  const ai = getGeminiClient();
  const domainLabel = domain || "General Management";
  const company = (targetCompany || "").trim() || "the company";
  const candidateName = resumeSummary?.candidateName || "the candidate";

  if (!ai) {
    const questionsByStep: Record<number, string> = {
      1: `What do you know about ${company}'s business model and where it's headed, and why does that appeal to you for a ${domainLabel} role?`,
      2: `${company} operates in a competitive market — how would you approach adding value here in your first 90 days?`,
      3: `Tell me about a time you had to adapt to a fast-changing situation — how does that experience translate to working at ${company}?`,
    };
    return res.json({
      success: true,
      nextQuestion: questionsByStep[stepNumber] || `Thanks, ${candidateName} — do you have any questions for me about the role at ${company}?`,
      feedback: userAnswer ? `Good detail — tying your answer to something specific about ${company} (a product, value, or recent move) makes it land better.` : null,
      isFinished: stepNumber > 3,
    });
  }

  try {
    const resumeContext = resumeSummary
      ? `Candidate: ${resumeSummary.candidateName || "Candidate"}
Headline: ${resumeSummary.headline || "N/A"}
Skills: ${(resumeSummary.skills || []).join(", ") || "N/A"}
Projects: ${(resumeSummary.projects || []).map((p: any) => `${p.name} — ${p.description}`).join(" | ") || "N/A"}
Experience: ${(resumeSummary.experience || []).map((e: any) => `${e.roleTitle} at ${e.company} — ${e.description}`).join(" | ") || "N/A"}`
      : "No resume on file — ask general company-fit questions.";

    const prompt = `You are a real interviewer at "${company}", conducting a ${domainLabel} interview. The candidate has already answered three standard opening questions (tell me about yourself, strengths/weaknesses, why should we hire you). Now ask questions specific to THIS company: its business model, recent strategy/products/news, industry position, or culture — plus how the candidate's background (below) fits it.

Candidate's resume:
${resumeContext}

Step Number (company round): ${stepNumber} / 3.
Previous Transcript:
${previousQuestions ? previousQuestions.map((q: any) => `Q: ${q.question}\nA: ${q.userAnswer || "N/A"}`).join("\n") : "Company round starting."}

Candidate's last answer: "${userAnswer || ""}"

1. Provide constructive 1-2 sentence feedback on the candidate's last answer.
2. Generate the next question — it must be specific to "${company}" (not generic), sound like something a real interviewer at that company would ask, and reference the candidate's resume where relevant.
3. Indicate if this round is finished (isFinished = true if step > 3).`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            nextQuestion: { type: Type.STRING },
            isFinished: { type: Type.BOOLEAN },
          },
          required: ["nextQuestion", "isFinished"],
        },
      },
    }), 2, 600);

    const data = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      nextQuestion: data.nextQuestion,
      feedback: data.feedback,
      isFinished: data.isFinished,
    });
  } catch (error) {
    console.error("Error in company interview step:", error);
    return res.json({
      success: true,
      nextQuestion: `What draws you to ${company} specifically, beyond the role itself?`,
      feedback: `Good start — naming something concrete about ${company} (a product, a value, recent news) makes this stronger.`,
      isFinished: stepNumber > 3,
    });
  }
});

// API Endpoint 4: Comprehensive Final Interview Evaluation Report
app.post("/api/gemini/interview-evaluation", async (req, res) => {
  const { role, qaPairs } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      success: true,
      evaluation: {
        role: role || "Senior Software Engineer Role Simulation",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        readinessScore: 85,
        percentile: 15,
        metrics: {
          communication: { score: 92, note: "Exceptional articulation and clarity in explaining complex logic." },
          technicalAccuracy: { score: 78, note: "Solid fundamentals; minor inefficiency noted in system design task." },
          bodyLanguage: { score: 88, note: "Great eye contact and posture throughout the 45-minute session." },
          confidence: { score: 82, note: "Maintained composure even when faced with high-stress questions." }
        },
        transcript: qaPairs && qaPairs.length > 0 ? qaPairs.map((pair: any) => ({
          id: String(pair.id || Math.random()),
          question: pair.question,
          answer: pair.userAnswer || "I believe in data-driven decisions. I would ask both parties to present their POCs and evaluate them against scaling requirements.",
          aiInsight: "Great structure, but consider mentioning the human element. Adding a note about facilitating a healthy discussion would boost your Leadership score."
        })) : [
          {
            id: 't1',
            question: "How would you handle a conflict within your development team regarding architectural choices?",
            answer: "I believe in data-driven decisions. I would ask both parties to present their POCs, evaluate them against our scaling requirements, and then decide based on long-term maintainability.",
            aiInsight: "Great structure, but consider mentioning the human element. Adding a note about 'facilitating a healthy discussion to ensure everyone feels heard' would boost your 'Leadership' score by approximately 12%."
          },
          {
            id: 't2',
            question: "Describe your experience with Microservices architecture.",
            answer: "In my last role, we migrated from a monolith to microservices using Kubernetes. It helped us deploy faster and isolate faults across services.",
            aiInsight: "You hit the 'fault isolation' keyword. To make this answer stronger, quantify the results (e.g., 'Reduced deployment time by 40%')."
          }
        ],
        nextSteps: [
          { title: "Refine System Design", description: "Based on your tech accuracy, we recommend the 'Advanced System Design' module.", icon: "school" },
          { title: "Book Expert Mock", description: "You're ready for a live human peer review. Schedule for next Tuesday.", icon: "event_available" },
          { title: "Review Weak Keywords", description: "Study the feedback on 'CAP Theorem' and 'Database Normalization'.", icon: "assignment_turned_in" }
        ],
        recommendedResources: [
          { title: "Distributed Systems 101", url: "#" },
          { title: "STAR Method Cheat Sheet", url: "#" },
          { title: "Top 50 Backend Questions", url: "#" }
        ]
      }
    });
  }

  try {
    const prompt = `Conduct a complete post-interview evaluation report for a candidate who interviewed for "${role}".
Transcript QA Pairs:
${JSON.stringify(qaPairs)}

Generate a detailed evaluation report object with:
1. readinessScore (number 0-100, e.g. 85)
2. percentile (top percentile, e.g. 15)
3. metrics for communication, technicalAccuracy, bodyLanguage, confidence (scores 0-100 and brief diagnostic note)
4. transcript array with question, answer, and actionable "aiInsight" for each
5. 3 nextSteps recommendations
6. 3 recommendedResources titles`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readinessScore: { type: Type.INTEGER },
            percentile: { type: Type.INTEGER },
            metrics: {
              type: Type.OBJECT,
              properties: {
                communication: {
                  type: Type.OBJECT,
                  properties: { score: { type: Type.INTEGER }, note: { type: Type.STRING } },
                  required: ["score", "note"],
                },
                technicalAccuracy: {
                  type: Type.OBJECT,
                  properties: { score: { type: Type.INTEGER }, note: { type: Type.STRING } },
                  required: ["score", "note"],
                },
                bodyLanguage: {
                  type: Type.OBJECT,
                  properties: { score: { type: Type.INTEGER }, note: { type: Type.STRING } },
                  required: ["score", "note"],
                },
                confidence: {
                  type: Type.OBJECT,
                  properties: { score: { type: Type.INTEGER }, note: { type: Type.STRING } },
                  required: ["score", "note"],
                },
              },
              required: ["communication", "technicalAccuracy", "bodyLanguage", "confidence"],
            },
            transcript: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  aiInsight: { type: Type.STRING },
                },
                required: ["id", "question", "answer", "aiInsight"],
              },
            },
            nextSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  icon: { type: Type.STRING },
                },
                required: ["title", "description", "icon"],
              },
            },
            recommendedResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                },
                required: ["title", "url"],
              },
            },
          },
          required: ["readinessScore", "percentile", "metrics", "transcript", "nextSteps", "recommendedResources"],
        },
      },
    }));

    const evalData = JSON.parse(response.text || "{}");
    if (!evalData || typeof evalData.readinessScore !== "number") {
      throw new Error("Gemini returned an incomplete evaluation payload");
    }

    return res.json({
      success: true,
      evaluation: {
        role: role || "Senior Software Engineer Role Simulation",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        ...evalData,
      },
    });
  } catch (error) {
    // Previously this returned a bare 500, which the frontend's catch block
    // silently swaps for a hardcoded 0/100 "AI service did not respond"
    // report. We now log the real cause here (check server logs for this)
    // and hand back a real, non-zero estimate instead.
    console.error("Error generating evaluation report (falling back to heuristic score):", error);
    return res.json({
      success: true,
      evaluation: buildHeuristicEvaluation(role, qaPairs),
    });
  }
});

// ---------------------------------------------------------------------------
// Real-time Group Discussion rooms (Socket.IO)
// ---------------------------------------------------------------------------
// Previously the client faked "joining" a room by just creating a brand new
// local room and ignoring the room code entirely, so two friends on two
// devices never actually landed in the same session. Rooms now live here on
// the server; clients join by code and get kept in sync over sockets.

interface GDParticipantState {
  socketId: string;
  id: string;
  name: string;
  avatar: string;
  role: 'user' | 'ai' | 'peer';
}

interface GDRoomState {
  code: string;
  topic: string;
  category: string;
  mode: 'peer' | 'ai_assisted';
  participants: Map<string, GDParticipantState>;
  messages: any[];
  createdAt: number;
}

const gdRooms = new Map<string, GDRoomState>();

const AI_PARTICIPANTS = [
  { name: 'Alex (AI Engineer)', id: 'p_alex', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { name: 'Sophia (AI Policy Analyst)', id: 'p_sophia', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
  { name: 'David (AI Product Mgr)', id: 'p_david', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
];

function generateRoomCode(): string {
  let code: string;
  do {
    code = `GD-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (gdRooms.has(code));
  return code;
}

function roomToPayload(room: GDRoomState) {
  return {
    code: room.code,
    topic: room.topic,
    category: room.category,
    mode: room.mode,
    participants: Array.from(room.participants.values()),
    messages: room.messages,
  };
}

io.on("connection", (socket: Socket) => {
  // Create a brand-new room. Returns the room code so the host can share it.
  socket.on("gd:create", ({ topic, category, mode, user }, ack) => {
    const code = generateRoomCode();
    const room: GDRoomState = {
      code,
      topic: topic || 'General Discussion Topic',
      category: category || 'General Technical & Business Strategy',
      mode: mode === 'ai_assisted' ? 'ai_assisted' : 'peer',
      participants: new Map(),
      messages: [
        {
          id: 'm0',
          senderId: 'system',
          senderName: 'AI GD Moderator',
          senderAvatar: '',
          text: `Welcome to the Group Discussion Room! Topic: "${topic}". Each candidate has equal opportunity to present arguments. Share the room code so friends can join live.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      createdAt: Date.now(),
    };
    room.participants.set(socket.id, {
      socketId: socket.id,
      id: user?.id || `user_${socket.id.slice(0, 6)}`,
      name: user?.name || 'You (Candidate)',
      avatar: user?.avatar || '',
      role: 'user',
    });
    gdRooms.set(code, room);
    socket.join(code);
    if (typeof ack === 'function') ack({ success: true, room: roomToPayload(room), selfSocketId: socket.id });
  });

  // Join an existing room by code. This is the path that was completely
  // missing before — a friend entering a code now actually lands in the
  // same room state as the host instead of getting a fresh fake one.
  socket.on("gd:join", ({ code, user }, ack) => {
    const room = gdRooms.get(code);
    if (!room) {
      if (typeof ack === 'function') ack({ success: false, error: `Room ${code} was not found. Double-check the code with your friend — it's case-sensitive and only stays active while the host's room is open.` });
      return;
    }
    const participant: GDParticipantState = {
      socketId: socket.id,
      id: user?.id || `user_${socket.id.slice(0, 6)}`,
      name: user?.name || `Guest ${room.participants.size + 1}`,
      avatar: user?.avatar || '',
      role: 'peer',
    };
    room.participants.set(socket.id, participant);
    socket.join(code);

    const joinNotice = {
      id: `m_join_${Date.now()}`,
      senderId: 'system',
      senderName: 'AI GD Moderator',
      senderAvatar: '',
      text: `${participant.name} has joined the discussion.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    room.messages.push(joinNotice);

    if (typeof ack === 'function') ack({ success: true, room: roomToPayload(room), selfSocketId: socket.id });
    // Let existing members know someone new arrived (for chat + WebRTC offer initiation)
    socket.to(code).emit("gd:participant-joined", { participant, message: joinNotice });
  });

  // Relay a chat/spoken message to everyone else in the room, then — if the
  // room is AI-assisted — have the server (not each client) generate exactly
  // one AI reply so it's consistent for every participant.
  socket.on("gd:message", async ({ code, text }) => {
    const room = gdRooms.get(code);
    if (!room || !text?.trim()) return;
    const sender = room.participants.get(socket.id);
    const userMsg = {
      id: `m_${Date.now()}_${socket.id.slice(0, 4)}`,
      senderId: sender?.id || socket.id,
      senderName: sender?.name || 'Participant',
      senderAvatar: sender?.avatar || '',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    room.messages.push(userMsg);
    io.to(code).emit("gd:message", userMsg);

    if (room.mode === 'ai_assisted') {
      io.to(code).emit("gd:ai-typing", true);
      const responder = pickRandom(AI_PARTICIPANTS);
      try {
        const result = await generateGdTurn({
          roomTopic: room.topic,
          participantName: responder.name.split(' ')[0],
          participantRole: 'Candidate',
          transcript: room.messages.slice(-6),
          lastUserMessage: text,
        });
        const aiMsg = {
          id: `m_ai_${Date.now()}`,
          senderId: responder.id,
          senderName: responder.name.split(' ')[0],
          senderAvatar: responder.avatar,
          text: result.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          aiInsight: result.aiInsight,
        };
        room.messages.push(aiMsg);
        io.to(code).emit("gd:message", aiMsg);
      } finally {
        io.to(code).emit("gd:ai-typing", false);
      }
    }
  });

  // WebRTC signaling relay (offer / answer / ICE candidates) between two
  // specific participants in the same room — enables real camera/mic between
  // real friends, not just canned AI avatars.
  socket.on("gd:webrtc-signal", ({ code, to, signal }) => {
    if (!gdRooms.has(code)) return;
    io.to(to).emit("gd:webrtc-signal", { from: socket.id, signal });
  });

  socket.on("gd:leave", ({ code }) => {
    leaveGdRoom(socket, code);
  });

  socket.on("disconnect", () => {
    for (const code of Array.from(gdRooms.keys())) {
      if (gdRooms.get(code)?.participants.has(socket.id)) {
        leaveGdRoom(socket, code);
      }
    }
  });
});

function leaveGdRoom(socket: Socket, code: string) {
  const room = gdRooms.get(code);
  if (!room) return;
  const participant = room.participants.get(socket.id);
  room.participants.delete(socket.id);
  socket.leave(code);
  if (participant) {
    socket.to(code).emit("gd:participant-left", { socketId: socket.id, participant });
  }
  // Clean up empty rooms so codes can eventually be reused
  if (room.participants.size === 0) {
    gdRooms.delete(code);
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`MBA BJD server running on http://localhost:${PORT}`);
  });
}

startServer();
