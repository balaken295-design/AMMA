import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Users, BookOpen, Video, ArrowRight,
  TrendingUp, BarChart3, Zap, Play, Swords, Trophy, Target,
  ChevronUp, Menu, X, Feather
} from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageViewProps {
  onStartApp: (initialTab?: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation', category?: 'verbal' | 'logical' | 'quants') => void;
  userProfile?: UserProfile;
  onOpenLoginModal?: () => void;
}

/* -----------------------------------------------------------------------
 * DESIGN TOKENS — this page now uses the SAME shared token system as the
 * rest of the app (defined in src/index.css and used throughout
 * DashboardView.tsx / AptitudeView.tsx), instead of its own one-off
 * ivory/forest/brass palette. That keeps Home and Dashboard visually
 * consistent.
 *
 *   bg-paper            page background (site-wide off-white)
 *   ink-100              light card / panel fill, light text on dark bg
 *   ink-900              headlines, high-contrast text
 *   ink-600               body copy, secondary text
 *   accent-600            primary accent — buttons, icon fills
 *   accent-700            hover state for accent-600
 *   highlight-600         secondary accent — labels, CTA text
 *   highlight-200         hover states, subtle fills
 * ------------------------------------------------------------------- */

const ROUNDS = [
  {
    round: '01',
    tab: 'aptitude' as const,
    icon: Target,
    name: 'Aptitude Arena',
    tagline: 'Quants · Logical · Verbal',
    description:
      'Timed drills across 32+ topic modules, scored the way placement cells actually score you — accuracy, speed, and consistency.',
    cta: 'Start a drill',
  },
  {
    round: '02',
    tab: 'gd' as const,
    icon: Users,
    name: 'Discussion Duel',
    tagline: 'Live group discussion practice',
    description:
      'Real camera and mic sessions on live case topics, with feedback on airtime, structure, and how you hold ground under pressure.',
    cta: 'Join a session',
  },
  {
    round: '03',
    tab: 'interview' as const,
    icon: Swords,
    name: 'Interview Forge',
    tagline: 'AI-evaluated mock interviews',
    description:
      'Full-length mock interviews evaluated turn by turn, closing with a readiness score you can watch climb, session over session.',
    cta: 'Book a mock',
  },
];

const TRACKS = [
  {
    id: 'consulting',
    label: 'Consulting',
    icon: BarChart3,
    title: 'Management Consulting',
    description:
      'Profitability cases, market sizing, growth frameworks, and GTM strategy simulations for McKinsey, BCG, Bain, and Strategy&.',
  },
  {
    id: 'banking',
    label: 'Investment Banking',
    icon: TrendingUp,
    title: 'Investment Banking & M&A',
    description:
      'Discounted cash flow, LBO fundamentals, enterprise valuation multiples, and financial statement analysis drills.',
  },
  {
    id: 'product',
    label: 'Product Management',
    icon: Zap,
    title: 'Tech Product Management',
    description:
      'Product design, root-cause metric drops, AI feature prioritization, and launch strategy for FAANG, Uber, and tech scaleups.',
  },
] as const;

const NAV_LINKS = [
  { href: '#rounds', label: 'The Rounds' },
  { href: '#tracks', label: 'Your Track' },
  { href: '#try-demo', label: 'Try It Live' },
  { href: '#journey', label: 'Your Progress' },
];

/** Small folded-corner accent used consistently on every card — the page's
 *  one recurring signature, standing in for a well-worn study folder. */
const CornerFold: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    aria-hidden
    className={`absolute top-0 right-0 w-5 h-5 ${className}`}
    style={{
      clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
      background: 'linear-gradient(135deg, #e5d29e, #96741f)',
    }}
  />
);

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onStartApp, userProfile, onOpenLoginModal }) => {
  const [quickSampleAnswer, setQuickSampleAnswer] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavClick = (href: string) => {
    setMobileNavOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEvaluateSample = async () => {
    if (!quickSampleAnswer.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/gemini/interview-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: "Management Consulting Associate (McKinsey Case Interview)",
          stepNumber: 1,
          userAnswer: quickSampleAnswer
        })
      });
      const data = await res.json();
      if (data.success && data.feedback) {
        setQuickFeedback(data.feedback);
      } else {
        setQuickFeedback("Strong MECE structure. Your response isolates fixed vs. variable costs effectively — quantify the margin compression impact in percentage terms next.");
      }
    } catch {
      setQuickFeedback("Solid framework. You correctly identified market sizing factors and competitive dynamics — add a 3-step execution timeline to make this executive-ready.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const track = TRACKS[activeTrack];
  const TrackIcon = track.icon;

  // Faint ledger-line texture, reused on the ivory sections to tie the
  // "study companion" feel together without competing with content.
  const ledgerLines: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(32,30,27,0.05) 28px)',
  };

  return (
    <div
      id="landing-page-container"
      className="min-h-screen bg-paper text-ink-900 flex flex-col selection:bg-highlight-200 selection:text-ink-900"
    >
      {/* ============================= HEADER ============================= */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-ink-900/10 bg-paper/92 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <button onClick={scrollToTop} className="flex items-center gap-2.5 group" aria-label="Back to top">
            <span className="w-9 h-9 rounded-full bg-accent-600 flex items-center justify-center text-ink-100 font-bold text-sm group-hover:scale-105 transition-transform">
              B
            </span>
            <span className=" font-semibold text-lg tracking-tight text-ink-900">
              MBA <span className="text-highlight-600">BJD</span>
              <span className="block -mt-1 text-[9px] font-mono font-normal tracking-[0.22em] text-ink-600">
                PLACEMENT PREP STUDIO
              </span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-ink-600">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="px-3.5 py-2 rounded-full hover:text-ink-900 hover:bg-ink-900/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 bg-white hover:bg-ink-100 text-ink-900 font-semibold px-3.5 py-2 rounded-full border border-ink-900/12 text-xs transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {userProfile?.isLoggedIn ? userProfile.name : 'Sign in'}
              </button>
            )}
            <button
              onClick={() => onStartApp('dashboard')}
              className="bg-accent-600 hover:bg-accent-700 text-ink-100 text-xs font-bold px-5 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-sm"
            >
              Enter Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            className="md:hidden p-2 text-ink-900"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-ink-900/10 bg-paper px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-900 hover:bg-ink-900/5"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 flex gap-2">
              {onOpenLoginModal && (
                <button
                  onClick={onOpenLoginModal}
                  className="flex-1 bg-white border border-ink-900/12 text-ink-900 font-semibold px-4 py-2.5 rounded-full text-xs"
                >
                  {userProfile?.isLoggedIn ? userProfile.name : 'Sign in'}
                </button>
              )}
              <button
                onClick={() => onStartApp('dashboard')}
                className="flex-1 bg-accent-600 text-ink-100 font-bold px-4 py-2.5 rounded-full text-xs"
              >
                Enter Dashboard
              </button>
            </div>
          </div>
        )}
      </header>
      <div className="h-[72px]" />

      {/* ============================== HERO =============================== */}
      <section className="relative overflow-hidden" style={ledgerLines}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 18% -8%, rgba(150,116,31,0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 15%, rgba(57,90,121,0.10), transparent 60%)',
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink-900/10 text-highlight-600 text-[10px] font-mono font-bold tracking-[0.18em] uppercase shadow-sm">
              <Feather className="w-3.5 h-3.5" />
              Built for MBA & Engineering Placement Season
            </div>

            <h1 className="mt-6 font-semibold text-[2.5rem] sm:text-6xl lg:text-[4.5rem] leading-[1.05] tracking-tight text-ink-900">
              Placement season has a rhythm.
              <br />
              <span className="text-highlight-600 italic">Practice it until it's yours.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-ink-600 leading-relaxed max-w-xl">
              Three rounds, real feedback, and a quiet place to get it wrong before it counts.
              Built by MBA grads who remember exactly what this season feels like.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onStartApp('interview')}
                className="bg-accent-600 hover:bg-accent-700 text-ink-100 font-bold px-7 py-3.5 rounded-full text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Video className="w-4 h-4" /> Take your first mock interview
              </button>
              <button
                onClick={() => onStartApp('aptitude')}
                className="bg-white hover:bg-ink-100 border border-ink-900/12 text-ink-900 font-bold px-7 py-3.5 rounded-full text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <BookOpen className="w-4 h-4 text-highlight-600" /> Start an aptitude drill
              </button>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px bg-ink-900/10 rounded-2xl overflow-hidden border border-ink-900/10">
            {[
              { label: 'Rounds', value: '03' },
              { label: 'Topic modules', value: '32+' },
              { label: 'Mock test', value: '90Q / 90m' },
              { label: 'Camera + mic', value: 'Live' },
            ].map((stat) => (
              <div key={stat.label} className="bg-paper px-5 py-4">
                <div className="font-mono text-2xl font-bold text-accent-600">{stat.value}</div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-ink-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== ROUNDS ============================== */}
      <section id="rounds" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-highlight-600">
            The Format
          </span>
          <h2 className="mt-3 font-semibold text-3xl sm:text-4xl text-ink-900">
            Three rounds. One placement season.
          </h2>
          <p className="mt-3 text-sm text-ink-600 leading-relaxed">
            Every campus process comes down to these three tests. Work through all of them,
            on repeat, until they stop feeling like tests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROUNDS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.tab}
                className="group relative rounded-2xl border border-ink-900/10 bg-white p-6 hover:border-highlight-600/50 hover:shadow-md transition-all overflow-hidden"
              >
                <CornerFold />
                <div className="flex items-start justify-between">
                  <span className=" text-4xl font-semibold text-ink-900/10">{r.round}</span>
                  <span className="w-11 h-11 rounded-full bg-accent-600/10 border border-accent-600/20 flex items-center justify-center text-accent-600">
                    <Icon className="w-5 h-5" />
                  </span>
                </div>

                <h3 className="mt-5 font-semibold text-xl text-ink-900">{r.name}</h3>
                <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-highlight-600">{r.tagline}</p>
                <p className="mt-3 text-sm text-ink-600 leading-relaxed">{r.description}</p>

                <button
                  onClick={() => onStartApp(r.tab)}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-accent-600 hover:text-highlight-600 transition-colors"
                >
                  {r.cta} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================= DOMAIN TRACK SELECTOR ===================== */}
      <section id="tracks" className="border-y border-ink-900/10 bg-ink-100" style={ledgerLines}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-highlight-600">
              Pick Your Track
            </span>
            <h2 className="mt-3 font-semibold text-3xl sm:text-4xl text-ink-900">
              Every round, tailored to your target role
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {TRACKS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveTrack(i)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
                  activeTrack === i
                    ? 'bg-accent-600 text-ink-100 border-accent-600'
                    : 'bg-white text-ink-600 border-ink-900/12 hover:border-highlight-600/50 hover:text-ink-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-w-2xl mx-auto p-8 rounded-2xl border border-ink-900/10 bg-white text-center relative overflow-hidden shadow-sm">
            <CornerFold />
            <div className="w-14 h-14 mx-auto rounded-full bg-accent-600/10 border border-accent-600/20 flex items-center justify-center text-accent-600">
              <TrackIcon className="w-7 h-7" />
            </div>
            <h3 className="mt-4 font-semibold text-xl text-ink-900">{track.title}</h3>
            <p className="mt-3 text-sm text-ink-600 leading-relaxed max-w-lg mx-auto">{track.description}</p>
            <button
              onClick={() => onStartApp('interview')}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-highlight-600 hover:underline"
            >
              Practice this track <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================== LIVE TRIAL PANEL ======================= */}
      <section id="try-demo" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-2xl border border-ink-900/10 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-900/10 px-6 py-4 bg-ink-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-highlight-600" />
              <span className="font-mono text-[11px] text-ink-600 uppercase tracking-wider">
                Practice notebook — page 1
              </span>
            </div>
            <span className="text-[10px] font-mono text-ink-600 hidden sm:inline">AI Evaluation Engine</span>
          </div>

          <div className="p-6 lg:p-10 space-y-6">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-highlight-600">
                Test your case response, right now
              </span>
              <h2 className="mt-2 font-semibold text-2xl sm:text-3xl text-ink-900">
                No sign-up needed for round one.
              </h2>
            </div>

            <div className="max-w-3xl space-y-4">
              <div className="p-4 rounded-xl bg-paper border border-ink-900/10 space-y-2">
                <span className="text-[10px] font-mono font-bold text-highlight-600 uppercase tracking-wider">
                  McKinsey case prompt
                </span>
                <p className="text-sm text-ink-900 leading-relaxed">
                  A major European airline is seeing a 15% decline in operating profitability
                  despite passenger volumes staying stable. How would you structure your initial
                  root-cause diagnosis?
                </p>
              </div>

              <textarea
                rows={3}
                placeholder="Type your structured response here (e.g., Profit = Revenue − Costs; analyze yield per seat vs. fuel & crew fixed costs)…"
                value={quickSampleAnswer}
                onChange={(e) => setQuickSampleAnswer(e.target.value)}
                className="w-full p-4 bg-paper border border-ink-900/12 rounded-xl text-sm text-ink-900 placeholder:text-ink-600/60 focus:outline-none focus:border-highlight-600 transition-colors"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={handleEvaluateSample}
                  disabled={!quickSampleAnswer.trim() || isEvaluating}
                  className="bg-accent-600 hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-ink-100 font-bold px-6 py-3 rounded-full text-xs transition-all flex items-center justify-center gap-2"
                >
                  {isEvaluating ? 'Analyzing framework…' : 'Evaluate my response'}
                </button>

                <button
                  onClick={() => onStartApp('interview')}
                  className="text-xs font-bold text-highlight-600 hover:text-highlight-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Launch the full Interview Forge
                </button>
              </div>

              {quickFeedback && (
                <div className="p-4 rounded-xl bg-highlight-200/25 border border-highlight-600/40 text-sm text-ink-900 space-y-1.5">
                  <div className="font-bold font-mono text-highlight-600 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI case assessment
                  </div>
                  <p className="leading-relaxed">{quickFeedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== JOURNEY ============================== */}
      <section id="journey" className="border-t border-ink-900/10 bg-ink-100 py-20" style={ledgerLines}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-highlight-600">
              Your Progress
            </span>
            <h2 className="mt-3 font-semibold text-3xl sm:text-4xl text-ink-900">
              From first-timer to placement-ready
            </h2>
            <p className="mt-3 text-sm text-ink-600 leading-relaxed">
              Real progress, one session at a time — not a single test you pass or fail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Target,
                title: 'Practice without judgment',
                copy: 'Take your first case, GD, or aptitude test in a space built to help — not to grade you against strangers.',
              },
              {
                icon: Trophy,
                title: 'Watch your readiness climb',
                copy: 'Every session moves your readiness score. Real progress you can see grow, not a one-time verdict.',
              },
              {
                icon: Swords,
                title: 'Walk in ready',
                copy: "By the time the real interview arrives, you've already done it a dozen times — and it shows.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="relative p-6 rounded-2xl border border-ink-900/10 bg-white overflow-hidden shadow-sm">
                  <CornerFold />
                  <span className="w-11 h-11 rounded-full bg-accent-600/10 border border-accent-600/20 flex items-center justify-center text-accent-600">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-lg text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-ink-600 leading-relaxed">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="bg-ink-900 text-ink-300 py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-highlight-600 flex items-center justify-center text-ink-900 font-bold text-sm">
              B
            </span>
            <span className="text-ink-100 font-semibold text-sm">MBA <span className="text-highlight-600">BJD</span></span>
          </div>

          <p className="text-center md:text-left">
            Built for MBA graduates, B-schools &amp; campus placement drives.
          </p>

          <div className="flex items-center gap-5">
            <button onClick={() => onStartApp('dashboard')} className="text-ink-100 hover:text-highlight-200 font-semibold transition-colors">
              Dashboard
            </button>
            <button onClick={() => onStartApp('aptitude')} className="text-ink-100 hover:text-highlight-200 font-semibold transition-colors">
              Aptitude Engine
            </button>
          </div>
        </div>
      </footer>

      {/* ========================= FLOATING BACK-TO-TOP ======================= */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-accent-600 hover:bg-accent-700 text-ink-100 flex items-center justify-center shadow-lg transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
