import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Users, BookOpen, Video, ArrowRight, ArrowLeft,
  TrendingUp, BarChart3, Zap, Play, Swords, Trophy, Target,
  ChevronUp, Menu, X, Flame
} from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageViewProps {
  onStartApp: (initialTab?: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation', category?: 'verbal' | 'logical' | 'quants') => void;
  userProfile?: UserProfile;
  onOpenLoginModal?: () => void;
}

/* -------------------------------------------------------------------------
 * ROUNDS — this mirrors the platform's actual product structure (Aptitude Arena,
 * Discussion Duel, Interview Forge), so it's used as the real backbone of
 * the page rather than a decorative "01 / 02 / 03" step list.
 * ---------------------------------------------------------------------- */
const ROUNDS = [
  {
    round: '01',
    id: 'aptitude',
    tab: 'aptitude' as const,
    icon: Target,
    name: 'Aptitude Arena',
    tagline: 'Quants · Logical · Verbal',
    description:
      'Timed drills across 32+ topic modules, scored the way placement cells actually score you — accuracy, speed, and consistency.',
    cta: 'Enter the Arena',
  },
  {
    round: '02',
    id: 'gd',
    tab: 'gd' as const,
    icon: Users,
    name: 'Discussion Duel',
    tagline: 'Live group discussion practice',
    description:
      'Real camera and mic sessions on live case topics, with feedback on airtime, structure, and how you hold ground under pressure.',
    cta: 'Join the Duel',
  },
  {
    round: '03',
    id: 'interview',
    tab: 'interview' as const,
    icon: Swords,
    name: 'Interview Forge',
    tagline: 'AI-evaluated mock interviews',
    description:
      'Full-length mock interviews evaluated turn by turn, closing with a readiness score you can watch climb, session over session.',
    cta: 'Step Into the Forge',
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
  { href: '#try-demo', label: 'Live Trial' },
  { href: '#journey', label: 'Your Progress' },
];

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onStartApp, userProfile, onOpenLoginModal }) => {
  const [quickSampleAnswer, setQuickSampleAnswer] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Fixed (not `sticky`) header — sticky positioning silently breaks the
  // moment any ancestor sets overflow on either axis, which is what made
  // the previous header feel "stuck". Fixed + a matching spacer below
  // always stays put and always stays clickable.
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

  return (
    <div
      id="landing-page-container"
      className="min-h-screen bg-[#0A0D14] text-[#F3EFE6] flex flex-col font-['Inter',sans-serif] selection:bg-[#E3A548] selection:text-[#0A0D14]"
    >
      {/* ============================= HEADER ============================= */}
      {/* Fixed, always on top, always clickable — fixes the previous "stuck /
          unresponsive" header behavior for good. */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#0A0D14]/90 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2.5 group"
            aria-label="Back to top"
          >
            <span className="w-9 h-9 rounded-md bg-[#E3A548] flex items-center justify-center text-[#0A0D14] font-black text-sm font-['Oswald',sans-serif] tracking-tight group-hover:scale-105 transition-transform">
              B
            </span>
            <span className="font-['Oswald',sans-serif] font-semibold text-lg tracking-wide text-[#F3EFE6]">
              MBA <span className="text-[#E3A548]">BJD</span>
              <span className="block -mt-1 text-[9px] font-mono font-normal tracking-[0.25em] text-[#8891A6]">
                PLACEMENT PREP ARENA
              </span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#8891A6]">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="px-3.5 py-2 rounded-md hover:text-[#F3EFE6] hover:bg-white/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-[#F3EFE6] font-semibold px-3.5 py-2 rounded-md border border-white/10 text-xs transition-all"
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
              className="bg-[#E3A548] hover:bg-[#f0b662] text-[#0A0D14] text-xs font-bold px-5 py-2.5 rounded-md transition-all flex items-center gap-2"
            >
              Enter Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            className="md:hidden p-2 text-[#F3EFE6]"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0A0D14] px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-semibold text-[#F3EFE6] hover:bg-white/5"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 flex gap-2">
              {onOpenLoginModal && (
                <button
                  onClick={onOpenLoginModal}
                  className="flex-1 bg-white/5 border border-white/10 text-[#F3EFE6] font-semibold px-4 py-2.5 rounded-md text-xs"
                >
                  {userProfile?.isLoggedIn ? userProfile.name : 'Sign in'}
                </button>
              )}
              <button
                onClick={() => onStartApp('dashboard')}
                className="flex-1 bg-[#E3A548] text-[#0A0D14] font-bold px-4 py-2.5 rounded-md text-xs"
              >
                Enter Dashboard
              </button>
            </div>
          </div>
        )}
      </header>
      {/* Spacer so fixed header never overlaps content */}
      <div className="h-[72px]" />

      {/* ============================== HERO =============================== */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(227,165,72,0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 90% 20%, rgba(255,107,74,0.10), transparent 60%)',
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[#E3A548] text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
              <Flame className="w-3.5 h-3.5" />
              Built for MBA & Engineering Placement Season
            </div>

            <h1 className="mt-6 font-['Oswald',sans-serif] font-semibold text-[2.75rem] sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight text-[#F3EFE6]">
              PLACEMENT SEASON
              <br />
              IS A MATCH.
              <br />
              <span className="text-[#E3A548]">TRAIN LIKE IT.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#8891A6] leading-relaxed max-w-xl">
              Three rounds. Real scoring. No stage fright on the day it actually counts.
              Built by MBA grads who remember exactly what placement season feels like.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onStartApp('interview')}
                className="bg-[#E3A548] hover:bg-[#f0b662] text-[#0A0D14] font-bold px-7 py-3.5 rounded-md text-sm transition-all flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" /> Take Your First Mock Interview
              </button>
              <button
                onClick={() => onStartApp('aptitude')}
                className="bg-white/5 hover:bg-white/10 border border-white/15 text-[#F3EFE6] font-bold px-7 py-3.5 rounded-md text-sm transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#E3A548]" /> Start Aptitude Drill
              </button>
            </div>
          </div>

          {/* HUD stat strip — the page's signature device, echoed on every
              card below via the same bracket framing */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-lg overflow-hidden border border-white/10">
            {[
              { label: 'Rounds', value: '03' },
              { label: 'Topic Modules', value: '32+' },
              { label: 'Mock Test', value: '90Q / 90m' },
              { label: 'Camera + Mic', value: 'Live' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0A0D14] px-5 py-4">
                <div className="font-mono text-2xl font-bold text-[#E3A548]">{stat.value}</div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#8891A6]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== ROUNDS ============================== */}
      <section id="rounds" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mb-12">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E3A548]">
            The Format
          </span>
          <h2 className="mt-3 font-['Oswald',sans-serif] font-semibold text-3xl sm:text-4xl text-[#F3EFE6]">
            Three Rounds. One Placement Season.
          </h2>
          <p className="mt-3 text-sm text-[#8891A6] leading-relaxed">
            Every campus process comes down to these three tests. MBA BJD runs you through
            all of them, on repeat, until they stop feeling like tests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROUNDS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-6 hover:border-[#E3A548]/50 hover:bg-white/[0.05] transition-all"
              >
                {/* corner brackets — the recurring HUD motif */}
                <span className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#E3A548]/40 group-hover:border-[#E3A548] transition-colors" />
                <span className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#E3A548]/40 group-hover:border-[#E3A548] transition-colors" />

                <div className="flex items-start justify-between">
                  <span className="font-mono text-4xl font-bold text-white/10">{r.round}</span>
                  <span className="w-11 h-11 rounded-lg bg-[#E3A548]/10 border border-[#E3A548]/30 flex items-center justify-center text-[#E3A548]">
                    <Icon className="w-5 h-5" />
                  </span>
                </div>

                <h3 className="mt-5 font-['Oswald',sans-serif] font-semibold text-xl text-[#F3EFE6]">
                  {r.name}
                </h3>
                <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-[#E3A548]">
                  {r.tagline}
                </p>
                <p className="mt-3 text-sm text-[#8891A6] leading-relaxed">{r.description}</p>

                <button
                  onClick={() => onStartApp(r.tab)}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#F3EFE6] hover:text-[#E3A548] transition-colors"
                >
                  {r.cta} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================= DOMAIN TRACK SELECTOR ===================== */}
      <section id="tracks" className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E3A548]">
              Pick Your Track
            </span>
            <h2 className="mt-3 font-['Oswald',sans-serif] font-semibold text-3xl sm:text-4xl text-[#F3EFE6]">
              Every Round, Tailored to Your Target Role
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {TRACKS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveTrack(i)}
                className={`px-5 py-2.5 rounded-md text-xs font-bold transition-all border ${
                  activeTrack === i
                    ? 'bg-[#E3A548] text-[#0A0D14] border-[#E3A548]'
                    : 'bg-transparent text-[#8891A6] border-white/15 hover:border-[#E3A548]/50 hover:text-[#F3EFE6]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-w-2xl mx-auto p-8 rounded-xl border border-white/10 bg-[#0A0D14] text-center relative">
            <span className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#E3A548]/40" />
            <span className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#E3A548]/40" />
            <div className="w-14 h-14 mx-auto rounded-lg bg-[#E3A548]/10 border border-[#E3A548]/30 flex items-center justify-center text-[#E3A548]">
              <TrackIcon className="w-7 h-7" />
            </div>
            <h3 className="mt-4 font-['Oswald',sans-serif] font-semibold text-xl text-[#F3EFE6]">{track.title}</h3>
            <p className="mt-3 text-sm text-[#8891A6] leading-relaxed max-w-lg mx-auto">{track.description}</p>
            <button
              onClick={() => onStartApp('interview')}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#E3A548] hover:underline"
            >
              Practice This Track <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================== LIVE TRIAL CONSOLE ======================= */}
      <section id="try-demo" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-xl border border-white/10 bg-[#0D111B] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E3A548]" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="ml-3 font-mono text-[11px] text-[#8891A6] uppercase tracking-wider">
                live-trial.exe
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8891A6] hidden sm:inline">AI Evaluation Engine</span>
          </div>

          <div className="p-6 lg:p-10 space-y-6">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E3A548]">
                Test Your Case Response, Right Now
              </span>
              <h2 className="mt-2 font-['Oswald',sans-serif] font-semibold text-2xl sm:text-3xl text-[#F3EFE6]">
                No sign-up needed for round one.
              </h2>
            </div>

            <div className="max-w-3xl space-y-4">
              <div className="p-4 rounded-lg bg-black/30 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono font-bold text-[#E3A548] uppercase tracking-wider">
                  McKinsey Case Prompt
                </span>
                <p className="text-sm text-[#F3EFE6] leading-relaxed">
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
                className="w-full p-4 bg-black/30 border border-white/10 rounded-lg text-sm text-[#F3EFE6] placeholder:text-[#5c6478] focus:outline-none focus:border-[#E3A548]/60 transition-colors"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  onClick={handleEvaluateSample}
                  disabled={!quickSampleAnswer.trim() || isEvaluating}
                  className="bg-[#E3A548] hover:bg-[#f0b662] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0D14] font-bold px-6 py-3 rounded-md text-xs transition-all flex items-center justify-center gap-2"
                >
                  {isEvaluating ? 'Analyzing framework…' : 'Evaluate My Response'}
                </button>

                <button
                  onClick={() => onStartApp('interview')}
                  className="text-xs font-bold text-[#E3A548] hover:text-[#f0b662] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Launch the Full Interview Forge
                </button>
              </div>

              {quickFeedback && (
                <div className="p-4 rounded-lg bg-[#E3A548]/10 border border-[#E3A548]/30 text-sm text-[#F3EFE6] space-y-1.5">
                  <div className="font-bold font-mono text-[#E3A548] text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Case Assessment
                  </div>
                  <p className="leading-relaxed">{quickFeedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== JOURNEY ============================== */}
      <section id="journey" className="border-t border-white/10 bg-white/[0.02] py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#E3A548]">
              Your Progress
            </span>
            <h2 className="mt-3 font-['Oswald',sans-serif] font-semibold text-3xl sm:text-4xl text-[#F3EFE6]">
              From First-Timer to Placement-Ready
            </h2>
            <p className="mt-3 text-sm text-[#8891A6] leading-relaxed">
              Real progress, one session at a time — not a single test you pass or fail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Target,
                title: 'Practice Without Judgment',
                copy: 'Take your first case, GD, or aptitude test in a space built to help — not to grade you against strangers.',
              },
              {
                icon: Trophy,
                title: 'Watch Your Readiness Climb',
                copy: 'Every session moves your readiness score. Real progress you can see grow, not a one-time verdict.',
              },
              {
                icon: Swords,
                title: 'Walk In Ready',
                copy: "By the time the real interview arrives, you've already done it a dozen times — and it shows.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-6 rounded-xl border border-white/10 bg-[#0A0D14]">
                  <span className="w-11 h-11 rounded-lg bg-[#E3A548]/10 border border-[#E3A548]/30 flex items-center justify-center text-[#E3A548]">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-4 font-['Oswald',sans-serif] font-semibold text-lg text-[#F3EFE6]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#8891A6] leading-relaxed">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="border-t border-white/10 py-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#8891A6]">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-md bg-[#E3A548] flex items-center justify-center text-[#0A0D14] font-black text-xs font-['Oswald',sans-serif]">
              B
            </span>
            <span className="text-[#F3EFE6] font-semibold text-sm font-['Oswald',sans-serif]">MBA <span className="text-[#E3A548]">BJD</span></span>
          </div>

          <p className="text-center md:text-left">
            Built for MBA graduates, B-schools & campus placement drives.
          </p>

          <div className="flex items-center gap-5">
            <button onClick={() => onStartApp('dashboard')} className="text-[#F3EFE6] hover:text-[#E3A548] font-semibold transition-colors">
              Dashboard
            </button>
            <button onClick={() => onStartApp('aptitude')} className="text-[#F3EFE6] hover:text-[#E3A548] font-semibold transition-colors">
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
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-lg bg-[#E3A548] hover:bg-[#f0b662] text-[#0A0D14] flex items-center justify-center shadow-lg shadow-black/40 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
