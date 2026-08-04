import React from 'react';
import { VERBAL_TOPICS, LOGICAL_TOPICS, QUANTS_TOPICS } from '../data/aptitudeData';
import { BookOpen, Users, Video, Award, CheckCircle2, ArrowRight, Sparkles, TrendingUp, ShieldCheck, Zap, LogIn, RefreshCw } from 'lucide-react';
import { UserProfile, MBADomain } from '../types';

interface DashboardViewProps {
  setActiveTab: (tab: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation') => void;
  onSelectCategory: (category: 'verbal' | 'logical' | 'quants') => void;
  userProfile: UserProfile;
  onOpenLoginModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab, onSelectCategory, userProfile, onOpenLoginModal }) => {
  const readiness = userProfile.readinessScore || 0;
  const dashOffset = 301.59 * (1 - readiness / 100);

  return (
    <div id="dashboard-container" className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Welcome & Readiness Hero Section in Bento style */}
      <div id="hero-readiness" className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Level {userProfile.level} • {userProfile.levelTitle}
              </span>
              {!userProfile.isLoggedIn && (
                <button
                  onClick={onOpenLoginModal}
                  className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center gap-1 transition-colors"
                >
                  <LogIn className="w-3 h-3" /> Connect Gmail
                </button>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold font-['Hanken_Grotesk',sans-serif] tracking-tight">
              Welcome, {userProfile.name}!
            </h1>
            
            <p className="text-slate-300 text-base leading-relaxed">
              {readiness === 0 ? (
                <>Your placement readiness score is currently <span className="text-amber-400 font-bold">0%</span>. Complete your first 20-question Aptitude Quest or 1-on-1 AI Interview to begin building your index!</>
              ) : (
                <>Your placement readiness index stands at <span className="text-indigo-400 font-bold">{readiness}%</span> with <span className="text-amber-400 font-bold">{userProfile.xp} XP</span> earned. Complete more level quests to reach Boardroom MD rank!</>
              )}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                id="btn-quick-interview"
                onClick={() => setActiveTab('interview')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <Video className="w-4 h-4" />
                Launch 1-on-1 AI Interviewer
              </button>
              <button
                id="btn-quick-gd"
                onClick={() => setActiveTab('gd')}
                className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 rounded-xl text-sm transition-all border border-white/20 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Join Group Discussion Room
              </button>
            </div>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-2xl p-5 flex items-center gap-6 backdrop-blur-md self-start lg:self-center shadow-inner">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-white/10" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8" />
                <circle 
                  className="text-indigo-400 transition-all duration-1000 ease-out" 
                  cx="56" 
                  cy="56" 
                  fill="transparent" 
                  r="48" 
                  stroke="currentColor" 
                  strokeDasharray="301.59" 
                  strokeDashoffset={dashOffset} 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-white font-['Hanken_Grotesk',sans-serif]">{readiness}</span>
                <span className="text-[10px] text-slate-300 font-mono">/ 100</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-indigo-300 font-mono uppercase font-bold tracking-wider">Readiness Index</span>
              <p className="text-sm font-bold text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> 
                {readiness === 0 ? 'Starting Fresh' : readiness >= 80 ? 'Market Ready' : 'In Progress'}
              </p>
              <p className="text-xs text-slate-300 max-w-[160px]">
                {readiness === 0 
                  ? 'Complete Aptitude & Interview tests to grow.'
                  : `${userProfile.completedTests} Tests • ${userProfile.completedInterviews} Interviews completed.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Aptitude Modules Grid */}
      <div id="section-modules" className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif] tracking-tight">Aptitude Mastery Modules</h2>
            <p className="text-slate-600 text-sm">Learn concepts topic-by-topic, complete 20Q topic tests, and unlock 30Q module evaluations.</p>
          </div>
          <button
            onClick={() => setActiveTab('aptitude')}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 transition-colors"
          >
            View All Topics <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Verbal Aptitude Card */}
          <div 
            id="card-module-verbal"
            className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-full">
                  10 Topics
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verbal Aptitude</h3>
              <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                Reading comprehension, error spotting, vocabulary, para jumbles, idioms, and critical reasoning.
              </p>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-medium">Topic Completion</span>
                  <span className="font-bold text-slate-900">
                    {userProfile.completedTests > 0 ? `${Math.min(10, userProfile.completedTests)} / 10` : '0 / 10 (0%)'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${userProfile.completedTests > 0 ? Math.min(100, userProfile.completedTests * 10) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  onSelectCategory('verbal');
                  setActiveTab('aptitude');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Learn Topics
              </button>
              <button
                onClick={() => {
                  onSelectCategory('verbal');
                  setActiveTab('aptitude');
                }}
                className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Test (20 Qs)
              </button>
            </div>
          </div>

          {/* Logical Aptitude Card */}
          <div 
            id="card-module-logical"
            className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-full">
                  10 Topics
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Logical Reasoning</h3>
              <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                Coding-decoding, syllogisms, blood relations, seating arrangements, and data sufficiency.
              </p>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-medium">Topic Completion</span>
                  <span className="font-bold text-slate-900">
                    {userProfile.completedTests > 1 ? `${Math.min(10, userProfile.completedTests - 1)} / 10` : '0 / 10 (0%)'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${userProfile.completedTests > 1 ? Math.min(100, (userProfile.completedTests - 1) * 10) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  onSelectCategory('logical');
                  setActiveTab('aptitude');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Learn Topics
              </button>
              <button
                onClick={() => {
                  onSelectCategory('logical');
                  setActiveTab('aptitude');
                }}
                className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Test (20 Qs)
              </button>
            </div>
          </div>

          {/* Quants Aptitude Card */}
          <div 
            id="card-module-quants"
            className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between space-y-5 group"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-full">
                  10 Topics
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Quantitative Aptitude</h3>
              <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                Profit & loss, percentages, time & distance, probability, data interpretation, and modern algebra.
              </p>
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-medium">Topic Completion</span>
                  <span className="font-bold text-slate-900">
                    {userProfile.completedTests > 2 ? `${Math.min(10, userProfile.completedTests - 2)} / 10` : '0 / 10 (0%)'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${userProfile.completedTests > 2 ? Math.min(100, (userProfile.completedTests - 2) * 10) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  onSelectCategory('quants');
                  setActiveTab('aptitude');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Learn Topics
              </button>
              <button
                onClick={() => {
                  onSelectCategory('quants');
                  setActiveTab('aptitude');
                }}
                className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold py-2.5 rounded-xl transition-colors"
              >
                Test (20 Qs)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MBA Specialization Domain Readiness Matrix */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-['Hanken_Grotesk',sans-serif]">MBA Domain Mastery & Level Progression</h2>
            <p className="text-xs text-slate-500">Benchmark performance across Finance, HR, Marketing, Analytics, Operations & Strategy.</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-200/60 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            MongoDB Atlas Connected
          </div>
        </div>

        {/* Dynamic Gaming Level Career Track Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800">
          <div className={`p-3 rounded-xl border space-y-1 transition-all ${userProfile.level === 1 ? 'bg-indigo-950/90 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-slate-800/70 border-slate-700'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${userProfile.level === 1 ? 'text-indigo-300' : 'text-slate-400'}`}>
              Level 1 • {userProfile.level === 1 ? 'CURRENT' : 'UNLOCKED'}
            </span>
            <p className="text-xs font-bold">MBA Intern Quest</p>
            <p className="text-[10px] text-slate-400">0 - 499 XP • Foundational</p>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 transition-all ${userProfile.level === 2 ? 'bg-indigo-950/90 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-slate-800/70 border-slate-700'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${userProfile.level === 2 ? 'text-amber-300' : 'text-slate-400'}`}>
              Level 2 • {userProfile.level === 2 ? 'CURRENT' : userProfile.level > 2 ? 'UNLOCKED' : 'LOCKED'}
            </span>
            <p className="text-xs font-bold">Associate Sprint</p>
            <p className="text-[10px] text-slate-400">500 - 1,499 XP • CAC & Metrics</p>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 transition-all ${userProfile.level === 3 ? 'bg-indigo-950/90 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-slate-800/70 border-slate-700'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${userProfile.level === 3 ? 'text-indigo-300' : userProfile.level > 3 ? 'UNLOCKED' : 'LOCKED'}`}>
              Level 3 • {userProfile.level === 3 ? 'CURRENT' : userProfile.level > 3 ? 'UNLOCKED' : 'LOCKED'}
            </span>
            <p className="text-xs font-bold">VP Strategy Campaign</p>
            <p className="text-[10px] text-slate-400">1,500 - 2,999 XP • M&A Cases</p>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 transition-all ${userProfile.level === 4 ? 'bg-rose-950/90 border-rose-500 shadow-md ring-1 ring-rose-500' : 'bg-slate-800/50 border-slate-800 opacity-80'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${userProfile.level === 4 ? 'text-rose-300' : 'text-slate-400'}`}>
              Level 4 • {userProfile.level === 4 ? 'CURRENT BOSS' : 'BOSS LOCK'}
            </span>
            <p className="text-xs font-bold">MD Boardroom Challenge</p>
            <p className="text-[10px] text-slate-400">3,000+ XP • Executive Final</p>
          </div>
        </div>

        {/* Dynamic Domain Scores */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { domain: 'Finance', label: 'M&A & Valuation' },
            { domain: 'HR', label: 'Talent & Culture' },
            { domain: 'Marketing', label: 'CAC/LTV & Brands' },
            { domain: 'Business Analytics', label: 'Data & Regression' },
            { domain: 'Operations', label: 'Supply Chain & EOQ' },
            { domain: 'Strategy', label: 'MECE & GTM Cases' },
          ].map((item) => {
            const domainScore = userProfile.domainScores ? userProfile.domainScores[item.domain as MBADomain] || 0 : 0;
            return (
              <div key={item.domain} className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs font-mono font-bold">
                  <span className="truncate max-w-[90px]">{item.domain}</span>
                  <span className={domainScore > 0 ? "text-indigo-600 font-bold" : "text-slate-400 font-normal"}>
                    {domainScore > 0 ? `${domainScore}%` : '0%'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${domainScore}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GD Feature Spotlight */}
        <div className="bg-slate-900 text-white rounded-3xl p-7 shadow-lg flex flex-col justify-between relative overflow-hidden border border-slate-800">
          <div className="space-y-3 z-10">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 font-mono text-xs font-extrabold rounded-full border border-indigo-500/30">
              CAMERA & MIC PIPELINE
            </span>
            <h3 className="text-2xl font-bold font-['Hanken_Grotesk',sans-serif]">Realtime Group Discussion</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Connect with peers via room codes or practice with simulated AI candidates (Alex, Sophia, David) with real-time camera feeds and speech recognition.
            </p>
          </div>
          <div className="pt-6 z-10">
            <button
              onClick={() => setActiveTab('gd')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md"
            >
              <Users className="w-4 h-4" /> Start GD Room Session
            </button>
          </div>
        </div>

        {/* AI Face Interview Spotlight */}
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-3xl p-7 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-mono text-xs font-extrabold rounded-full">
              STEP-BY-STEP SIMULATION
            </span>
            <h3 className="text-2xl font-bold text-slate-900 font-['Hanken_Grotesk',sans-serif]">1-on-1 AI Face Interviewer</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Interview face-to-face with an interactive AI interviewer. Answer technical and situational questions while receiving instant posture, tone, and technical accuracy insights.
            </p>
          </div>
          <div className="pt-6 flex gap-3">
            <button
              onClick={() => setActiveTab('interview')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <Video className="w-4 h-4" /> Begin AI Interview
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2"
            >
              <Award className="w-4 h-4 text-indigo-600" /> Past Evaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
