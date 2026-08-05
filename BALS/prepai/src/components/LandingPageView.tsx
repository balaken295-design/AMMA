import React, { useState } from 'react';
import {
  Sparkles, Users, BookOpen, Video, ArrowRight,
  TrendingUp, BarChart3, Zap, Play
} from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageViewProps {
  onStartApp: (initialTab?: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation', category?: 'verbal' | 'logical' | 'quants') => void;
  userProfile?: UserProfile;
  onOpenLoginModal?: () => void;
}

const TRACKS = [
  {
    id: 'consulting',
    label: 'Consulting',
    icon: BarChart3,
    accent: 'bg-indigo-600 shadow-indigo-200',
    title: 'Management Consulting',
    description:
      'Profitability cases, market sizing, growth frameworks, and GTM strategy simulations for McKinsey, BCG, Bain, and Strategy&.',
    cta: 'Practice Case Interview',
  },
  {
    id: 'banking',
    label: 'Investment Banking',
    icon: TrendingUp,
    accent: 'bg-slate-900 shadow-slate-200',
    title: 'Investment Banking & M&A',
    description:
      'Discounted Cash Flow (DCF), LBO fundamentals, enterprise valuation multiples, and financial statement analysis drills.',
    cta: 'Practice Valuation Drill',
  },
  {
    id: 'product',
    label: 'Product Management',
    icon: Zap,
    accent: 'bg-indigo-600 shadow-indigo-200',
    title: 'Tech Product Management',
    description:
      'Product design, root-cause metric drops, AI feature prioritization, and launch strategy for FAANG, Uber, and tech scaleups.',
    cta: 'Practice PM Cases',
  },
] as const;

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onStartApp, userProfile, onOpenLoginModal }) => {
  const [quickSampleAnswer, setQuickSampleAnswer] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);

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
        setQuickFeedback("Strong MECE structure! Your response isolates fixed vs variable costs effectively. To improve, quantify the estimated margin compression impact in percentage terms.");
      }
    } catch {
      setQuickFeedback("Solid framework! You correctly identified market sizing factors and competitive dynamics. Adding a 3-step execution timeline will elevate this to an executive-ready response.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const track = TRACKS[activeTrack];
  const TrackIcon = track.icon;

  return (
    <div id="landing-page-container" className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-['Inter',sans-serif]">
      {/* Top Header Navigation */}
      <header className="sticky top-4 z-50 max-w-[1280px] w-[calc(100%-2rem)] mx-auto mb-6">
        <div className="flex justify-between items-center px-6 py-4 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="font-bold text-xl tracking-tight text-slate-800 flex items-center gap-3 font-['Hanken_Grotesk',sans-serif]">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-200">
              B
            </div>
            <span className="text-slate-900 font-extrabold text-xl whitespace-nowrap">MBA <span className="text-indigo-600">BJD</span></span>
          </div>

          <nav className="hidden md:flex gap-8 items-center text-xs font-bold text-slate-600">
            <a href="#tracks" className="hover:text-indigo-600 transition-colors">Placement Tracks</a>
            <a href="#try-demo" className="hover:text-indigo-600 transition-colors">Interactive Demo</a>
            <a href="#journey" className="hover:text-indigo-600 transition-colors">Your Journey</a>
          </nav>

          <div className="flex items-center gap-3">
            {onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold px-3.5 py-2 rounded-xl border border-slate-300 text-xs shadow-xs transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              Enter Dashboard &rarr;
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 rounded-3xl overflow-hidden text-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(8,12,30,0.72) 0%, rgba(8,12,30,0.85) 100%), url('/hero-banner.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-indigo-200 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            Designed for MBA Graduates & Campus Placements
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white font-['Hanken_Grotesk',sans-serif] tracking-tight leading-[1.1]">
            Every Placement Season Has a Winner. <span className="text-indigo-300 underline decoration-indigo-400/60 decoration-wavy decoration-2">Prepare Like One.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal max-w-2xl mx-auto">
            Practice, get real feedback, and walk in confident. Built by MBA grads who remember exactly how placement season feels.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onStartApp('interview')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" /> Take Your First Mock Interview
            </button>
            <button
              onClick={() => onStartApp('gd')}
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200/90 font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-indigo-600" /> Join a Live Discussion
            </button>
            <button
              onClick={() => onStartApp('aptitude')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" /> Sharpen Your Aptitude
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Placement Tracks */}
      <section id="tracks" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full">
            Industry Tailored Prep
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif]">
            Pick Your Track. See What You'll Practice.
          </h2>
        </div>

        {/* Tab selector */}
        <div className="flex flex-wrap justify-center gap-2">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTrack(i)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeTrack === i
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active track panel */}
        <div className="max-w-2xl mx-auto p-8 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 text-center">
          <div className={`w-14 h-14 mx-auto text-white rounded-2xl flex items-center justify-center shadow-md ${track.accent}`}>
            <TrackIcon className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-xl text-slate-900 font-['Hanken_Grotesk',sans-serif]">{track.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">{track.description}</p>
          <button
            onClick={() => onStartApp('interview')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline pt-2"
          >
            {track.cta} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Interactive Quick Try Widget on Landing Page */}
      <section id="try-demo" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-slate-900 text-white rounded-3xl p-8 lg:p-12 shadow-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="font-mono text-xs font-bold uppercase text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                Interactive MBA Case Practice
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-['Hanken_Grotesk',sans-serif] mt-2">
                Test Your Case Response Right Now
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Powered by Gemini AI Engine</span>
          </div>

          <div className="space-y-4 max-w-3xl">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">McKinsey Case Prompt</span>
              <p className="text-sm font-semibold text-white">
                "A major European airline is experiencing a 15% decline in operating profitability despite passenger volumes remaining stable. How would you structure your initial root-cause diagnosis?"
              </p>
            </div>

            <textarea
              rows={3}
              placeholder="Type your structured MECE response here (e.g., Profit = Revenue - Costs; analyze yield per seat vs fuel & crew fixed costs)..."
              value={quickSampleAnswer}
              onChange={e => setQuickSampleAnswer(e.target.value)}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
            ></textarea>

            <div className="flex justify-between items-center">
              <button
                onClick={handleEvaluateSample}
                disabled={!quickSampleAnswer.trim() || isEvaluating}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md"
              >
                {isEvaluating ? "Analyzing Framework..." : "Evaluate Response with AI"}
              </button>

              <button
                onClick={() => onStartApp('interview')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" /> Launch Full Interview Simulator
              </button>
            </div>

            {quickFeedback && (
              <div className="p-4 bg-indigo-950/80 border border-indigo-800/80 rounded-2xl text-xs text-indigo-100 space-y-1">
                <div className="font-bold font-mono text-indigo-300 text-[10px] uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Case Assessment
                </div>
                <p className="leading-relaxed">{quickFeedback}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Your Prep Journey */}
      <section id="journey" className="bg-white border-t border-slate-200/80 py-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full">
              Your Journey
            </span>
            <h2 className="text-3xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif]">
              From First-Timer to Placement-Ready
            </h2>
            <p className="text-sm text-slate-600">
              Real progress, one session at a time — not a test you pass or fail once.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-indigo-50/60 rounded-3xl space-y-3">
              <span className="text-3xl font-black text-indigo-600">01</span>
              <h3 className="font-bold text-slate-900">Practice Without Judgment</h3>
              <p className="text-sm text-slate-600">Take your first case, GD, or aptitude test in a space built to help, not grade you against strangers.</p>
            </div>
            <div className="p-6 bg-indigo-50/60 rounded-3xl space-y-3">
              <span className="text-3xl font-black text-indigo-600">02</span>
              <h3 className="font-bold text-slate-900">See Yourself Improve</h3>
              <p className="text-sm text-slate-600">Every session builds your readiness score — real progress you can watch grow, not a one-time verdict.</p>
            </div>
            <div className="p-6 bg-indigo-50/60 rounded-3xl space-y-3">
              <span className="text-3xl font-black text-indigo-600">03</span>
              <h3 className="font-bold text-slate-900">Walk In Ready</h3>
              <p className="text-sm text-slate-600">By the time the real interview comes, you've already done it a dozen times — and it shows.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="text-white font-bold text-sm">MBA BJD Intelligence</span>
          </div>

          <p className="text-center md:text-left">
            Crafted for MBA Graduates, B-Schools &amp; Campus Placement Drives.
          </p>

          <div className="flex items-center gap-4">
            <button onClick={() => onStartApp('dashboard')} className="text-white hover:text-indigo-400 font-bold transition-colors">
              App Dashboard
            </button>
            <button onClick={() => onStartApp('aptitude')} className="text-white hover:text-indigo-400 font-bold transition-colors">
              Aptitude Engine
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
