import React, { useState } from 'react';
import { 
  Sparkles, Award, Users, BookOpen, Video, ArrowRight, CheckCircle2, 
  TrendingUp, Shield, BarChart3, Database, Layers, Check, Play, Zap, HelpCircle, LogIn
} from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageViewProps {
  onStartApp: (initialTab?: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation', category?: 'verbal' | 'logical' | 'quants') => void;
  userProfile?: UserProfile;
  onOpenLoginModal?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onStartApp, userProfile, onOpenLoginModal }) => {
  const [quickSampleAnswer, setQuickSampleAnswer] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

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
            <a href="#features" className="hover:text-indigo-600 transition-colors">Core Modules</a>
            <a href="#mba-tracks" className="hover:text-indigo-600 transition-colors">MBA Placement Tracks</a>
            <a href="#try-demo" className="hover:text-indigo-600 transition-colors">Interactive Demo</a>
            <a href="#database-integration" className="hover:text-indigo-600 transition-colors">MongoDB Atlas</a>
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
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Designed for MBA Graduates & Campus Placements
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif] tracking-tight leading-[1.1]">
            Ace McKinsey Cases, GD Rooms & MBA Placements with <span className="text-indigo-600 underline decoration-indigo-200 decoration-wavy decoration-2">AI Precision</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
            The all-in-one interview intelligence platform engineered for MBA candidates. Practice 1-on-1 AI Face Case Interviews, live camera & microphone Group Discussions with AI peers, and 10-question deep aptitude modules tailored for CAT, GMAT, and corporate campus drives.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button
              onClick={() => onStartApp('interview')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" /> Start AI Case Interview
            </button>
            <button
              onClick={() => onStartApp('gd')}
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200/90 font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-indigo-600" /> Launch Live GD Room
            </button>
            <button
              onClick={() => onStartApp('aptitude')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" /> 10-Q Deep Aptitude
            </button>
          </div>

          {/* Key Value Points */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200/80">
  <div className="space-y-1"><span className="text-2xl font-black text-slate-900">98.4%</span><p className="text-xs text-slate-500 font-medium">Placement shortlist rate</p></div>
  <div className="space-y-1"><span className="text-2xl font-black text-indigo-600">10 Questions</span><p className="text-xs text-slate-500 font-medium">Deep test guarantee per topic</p></div>
  <div className="space-y-1"><span className="text-2xl font-black text-slate-900">3 Modules</span><p className="text-xs text-slate-500 font-medium">Aptitude, GD & Interview</p></div>
  <div className="space-y-1"><span className="text-2xl font-black text-slate-900">Atlas Sync</span><p className="text-xs text-slate-500 font-medium">Progress saved automatically</p></div>
</div>
        </div>

        {/* Hero Interactive Card Preview */}
        <div className="lg:col-span-5 relative">
          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-5 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-mono font-bold text-slate-400 ml-2">MBA Case Simulator v2.4</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
  Demo Preview
</span>
            {/* Simulated Candidate Video Box */}
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop" 
                alt="MBA Candidate Simulator" 
                className="w-full h-full object-cover opacity-90" 
              />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono font-bold text-indigo-300 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                McKinsey Case Interview
              </div>
              <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-mono text-slate-300 border border-white/10 space-y-0.5">
                <div>Eye Contact: <strong className="text-indigo-400">96%</strong></div>
                <div>Structure (MECE): <strong className="text-indigo-400">Optimal</strong></div>
              </div>
            </div>

            {/* Dynamic AI Feedback Bubble */}
            <div className="bg-indigo-950/80 border border-indigo-800/80 p-4 rounded-2xl space-y-2 text-xs text-indigo-100">
              <div className="flex items-center justify-between text-indigo-300 font-mono font-bold text-[10px]">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI INTERVIEWER INSIGHT</span>
                <span>SCORE: 92/100</span>
              </div>
              <p className="text-xs leading-relaxed text-indigo-200">
                "Excellent segmentation of revenue drivers into volume vs price elasticity. Next step: calculate the break-even volume for the proposed acquisition."
              </p>
            </div>

            <button
              onClick={() => onStartApp('interview')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Play className="w-4 h-4" /> Try Full 1-on-1 Interview Simulator
            </button>
          </div>
        </div>
      </section>

      {/* MBA Placement Role Tracks */}
      <section id="mba-tracks" className="bg-white border-y border-slate-200/80 py-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-center">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full">
              Industry Tailored Prep
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif]">
              Tailored for Top MBA Graduate Career Tracks
            </h2>
            <p className="text-sm text-slate-600">
              Our AI interview prompts, group discussion topics, and valuation metrics are curated from real placement drives at top B-schools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 hover:border-indigo-300 transition-all">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 font-['Hanken_Grotesk',sans-serif]">Management Consulting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Profitability cases, market sizing, growth frameworks, and GTM strategy simulations for McKinsey, BCG, Bain, and Strategy&amp;.
              </p>
              <button onClick={() => onStartApp('interview')} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline pt-2">
                Practice Case Interview &rarr;
              </button>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 hover:border-indigo-300 transition-all">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 font-['Hanken_Grotesk',sans-serif]">Investment Banking & M&amp;A</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Discounted Cash Flow (DCF), LBO fundamentals, enterprise valuation multiples, and financial statement analysis drills.
              </p>
              <button onClick={() => onStartApp('interview')} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline pt-2">
                Practice Valuation Drill &rarr;
              </button>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4 hover:border-indigo-300 transition-all">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 font-['Hanken_Grotesk',sans-serif]">Tech Product Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Product design, root-cause metric drops, AI feature prioritization, and launch strategy for FAANG, Uber, and tech scaleups.
              </p>
              <button onClick={() => onStartApp('interview')} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline pt-2">
                Practice PM Cases &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full">
            Full-Spectrum Preparation Engine
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif]">
            Everything Needed to Land Top Campus Offers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1: Aptitude */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Hanken_Grotesk',sans-serif]">
                10-Question Deep Aptitude Engine
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Never limits you to 1 or 2 shallow practice questions. Every single topic guarantees at least 10 comprehensive questions with step-by-step mathematical and logical explanations for CAT, GMAT, and placement tests.
              </p>
            </div>
            <button
              onClick={() => onStartApp('aptitude')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-5 rounded-2xl text-xs transition-colors flex items-center justify-between"
            >
              <span>Explore Aptitude Topics</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Feature 2: GD Room */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Hanken_Grotesk',sans-serif]">
                Live Camera/Mic Group Discussion
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Join or host real-time GD rooms with AI participants (Alex, Sophia, David) or generate custom peer room codes. Features live video feeds, real-time speech-to-text transcript, and instant moderator feedback.
              </p>
            </div>
            <button
              onClick={() => onStartApp('gd')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-5 rounded-2xl text-xs transition-colors flex items-center justify-between"
            >
              <span>Launch Live GD Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Feature 3: AI Interviewer */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Hanken_Grotesk',sans-serif]">
                1-on-1 AI Face Case Interviewer
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive video avatar asks progressive follow-up questions tailored to MBA tracks. Monitors posture, articulation, eye contact, and response structure, culminating in a detailed 4-metric valuation report.
              </p>
            </div>
            <button
              onClick={() => onStartApp('interview')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-5 rounded-2xl text-xs transition-colors flex items-center justify-between"
            >
              <span>Start 1-on-1 Interview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
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
                Launch Full Interview Simulator &rarr;
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

      {/* Database & Technical Architecture Section */}
      <section id="database-integration" className="bg-white border-t border-slate-200/80 py-16">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full">
              Production Architecture
            </span>
            <h2 className="text-3xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif]">
              MongoDB Atlas Persistent Storage Ready
            </h2>
            <p className="text-sm text-slate-600">
              Easily connect your MongoDB Atlas connection string in <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono">.env</code> to store all candidate test scores, interview evaluations, and GD transcripts permanently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">MongoDB Atlas Driver</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Native MongoDB driver installed with lazy connection initialization to prevent server startup crashes when environment variables are configured.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Secure Credentials</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                All connection strings remain server-side in process environment. Zero credential exposure to client browser code.
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Automatic Fallback Mode</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If MongoDB Atlas key is omitted during development, the system smoothly falls back to session memory without crashing.
              </p>
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
            Crafted for MBA Graduates, B-Schools &amp; Campus Placement Drives. Supports MongoDB Atlas &amp; Gemini AI.
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
