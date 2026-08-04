import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { MongoClient, Db } from "mongodb";
import { Server as SocketIOServer, Socket } from "socket.io";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
const httpServer = createHttpServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory fallback database for candidate results when MONGODB_URI is absent
const inMemoryStore = {
  scores: [] as any[],
  interviews: [] as any[]
};

// Lazy MongoDB Atlas client connection
let mongoDbInstance: Db | null = null;
const getMongoDb = async (): Promise<Db | null> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (mongoDbInstance) return mongoDbInstance;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    mongoDbInstance = client.db('prepai_mba');
    console.log('Successfully connected to MongoDB Atlas cluster');
    return mongoDbInstance;
  } catch (err) {
    console.warn('MongoDB Atlas connection attempt failed:', err);
    return null;
  }
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
  const db = await getMongoDb();
  if (db) {
    return res.json({ connected: true, mode: "MongoDB Atlas Cloud", database: "prepai_mba" });
  }
  return res.json({ connected: false, mode: "In-Memory Local Fallback", note: "Add MONGODB_URI in .env to connect MongoDB Atlas" });
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

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection("aptitude_scores").insertOne(scoreRecord);
      return res.json({ success: true, storage: "MongoDB Atlas", record: scoreRecord });
    } catch (e) {
      console.error("MongoDB Atlas insert error:", e);
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

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection("interview_evaluations").insertOne(interviewRecord);
      return res.json({ success: true, storage: "MongoDB Atlas", record: interviewRecord });
    } catch (e) {
      console.error("MongoDB Atlas insert error:", e);
    }
  }

  inMemoryStore.interviews.push(interviewRecord);
  return res.json({ success: true, storage: "In-Memory Fallback", record: interviewRecord });
});

// Save or Update User Profile Route (MongoDB Atlas)
app.post("/api/db/user-profile", async (req, res) => {
  const { profile } = req.body;
  if (!profile || !profile.email) {
    return res.status(400).json({ success: false, error: "Missing profile or email" });
  }

  const db = await getMongoDb();
  if (db) {
    try {
      await db.collection("user_profiles").updateOne(
        { email: profile.email },
        { $set: { ...profile, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return res.json({ success: true, storage: "MongoDB Atlas", profile });
    } catch (e) {
      console.error("MongoDB Atlas profile upsert error:", e);
    }
  }

  return res.json({ success: true, storage: "In-Memory Local", profile });
});

// Get User Profile by email Route
app.get("/api/db/user-profile", async (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    return res.status(400).json({ success: false, error: "Missing email parameter" });
  }

  const db = await getMongoDb();
  if (db) {
    try {
      const doc = await db.collection("user_profiles").findOne({ email });
      if (doc) {
        return res.json({ success: true, profile: doc });
      }
    } catch (e) {
      console.error("MongoDB Atlas profile get error:", e);
    }
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

  const db = await getMongoDb();
  if (db) {
    try {
      const existing = await db.collection("user_profiles").findOne({ email });
      if (existing) {
        return res.json({ success: true, profile: existing });
      }
    } catch (e) {
      console.error("MongoDB Atlas profile lookup error:", e);
    }
  }

  // First-time sign-in: start fresh at 0 XP.
  const freshProfile = {
    email, name, avatar, isLoggedIn: true,
    xp: 0, level: 1, levelTitle: "Intern Quest", streakDays: 0, readinessScore: 0,
    completedTests: 0, completedInterviews: 0, completedGDs: 0,
    domainScores: { Finance: 0, HR: 0, Marketing: 0, "Business Analytics": 0, Operations: 0, Strategy: 0 },
  };

  if (db) {
    try {
      await db.collection("user_profiles").updateOne(
        { email },
        { $set: { ...freshProfile, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    } catch (e) {
      console.error("MongoDB Atlas profile create error:", e);
    }
  }

  return res.json({ success: true, profile: freshProfile });
});

// Get Candidate History Route
app.get("/api/db/history", async (req, res) => {
  const db = await getMongoDb();
  if (db) {
    try {
      const scores = await db.collection("aptitude_scores").find().sort({ createdAt: -1 }).limit(20).toArray();
      const interviews = await db.collection("interview_evaluations").find().sort({ createdAt: -1 }).limit(20).toArray();
      return res.json({ success: true, storage: "MongoDB Atlas", scores, interviews });
    } catch (e) {
      console.error("MongoDB Atlas query error:", e);
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
  ];

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
  ];

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
  ];

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
  ];

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
  ];

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

// API Endpoint 3: Interactive Step-by-Step AI Interviewer Turn
app.post("/api/gemini/interview-step", async (req, res) => {
  const { role, stepNumber, previousQuestions, userAnswer } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    const questionsByStep: Record<number, string> = {
      1: `Welcome! Let's examine your strategic background for ${role}. How would you structure a 30-second elevator synthesis summarizing your executive value proposition and core domain framework?`,
      2: `Excellent start. Now let's dive into a core business case: In your role as a ${role}, how would you approach a situation where gross profit margins are compressing despite a 20% increase in top-line revenue?`,
      3: `Suppose your executive team is debating an acquisition or market entry. How do you apply MECE structuring and sensitivity analysis to mitigate downside financial risk?`,
      4: `Behavioral leadership check: Describe a high-stakes cross-functional disagreement you navigated between Finance, Marketing, and Operations. How did you align key executive stakeholders?`
    };

    return res.json({
      success: true,
      nextQuestion: questionsByStep[stepNumber] || `Thank you for those comprehensive insights. Do you have any questions for the boardroom panel regarding strategic growth targets for the ${role} position?`,
      feedback: userAnswer ? `Excellent executive tone! Using the MECE framework and quantifying financial impact (e.g., 'Targeted a 15% EBITDA expansion') significantly elevated your response.` : null,
      isFinished: stepNumber > 4
    });
  }

  try {
    const prompt = `You are an expert AI Technical Interviewer conducting a multi-step interview for the position of "${role}".
Step Number: ${stepNumber} / 5.
Previous Transcript:
${previousQuestions ? previousQuestions.map((q: any) => `Q: ${q.question}\nA: ${q.userAnswer || "N/A"}`).join("\n") : "Interview starting."}

Candidate's last answer: "${userAnswer || ""}"

1. Provide constructive 1-2 sentence real-time feedback on the candidate's last answer (highlighting strengths like STAR method, technical keywords, and areas to improve).
2. Generate the next progressive interview question appropriate for step ${stepNumber}.
3. Indicate if the interview is finished (isFinished = true if step > 4).`;

    const response = await ai.models.generateContent({
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
    });

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
      nextQuestion: `Describe your experience with microservices architecture and container orchestration in high-traffic environments.`,
      feedback: `Solid fundamentals! Mentioning fault isolation and Kubernetes metrics strengthens this response.`,
      isFinished: stepNumber > 4
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

    const response = await ai.models.generateContent({
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
    });

    const evalData = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      evaluation: {
        role: role || "Senior Software Engineer Role Simulation",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        ...evalData,
      },
    });
  } catch (error) {
    console.error("Error generating evaluation report:", error);
    return res.status(500).json({ error: "Failed to generate evaluation" });
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
