import React from 'react';
import { ArrowRight, BookOpen, Users, Video, BarChart3, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageViewProps {
  onStartApp: (initialTab?: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation', category?: 'verbal' | 'logical' | 'quants') => void;
  userProfile?: UserProfile;
  onOpenLoginModal?: () => void;
}

const FEATURES = [
  {tab:'aptitude' as const, icon:BookOpen, title:'Aptitude Practice', text:'Verbal, logical and quantitative practice with topic tests and progress tracking.'},
  {tab:'gd' as const, icon:Users, title:'Group Discussion', text:'Timed discussion simulations with structured contribution feedback.'},
  {tab:'interview' as const, icon:Video, title:'AI Interview', text:'Resume-based mock interviews with domain-specific questions and answer feedback.'},
  {tab:'evaluation' as const, icon:BarChart3, title:'Evaluation Reports', text:'Review readiness, strengths, gaps and practical next steps after each assessment.'},
];

export const LandingPageView: React.FC<LandingPageViewProps> = ({onStartApp,userProfile,onOpenLoginModal}) => (
  <div id="landing-page-container" className="min-h-screen">
    <section className="interactive-card border-b border-ink-200 bg-[#f5f1e8]">
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-20 md:py-28 grid lg:grid-cols-[1.35fr_.65fr] gap-14 items-end">
        <div>
          <p className="text-sm uppercase tracking-[.18em] text-accent-600 font-bold mb-5">MBA Placement Preparation</p>
          <h1 className="text-5xl md:text-7xl font-bold leading-[.98] text-ink-950 max-w-4xl">
            Prepare with purpose.<br/>
            <em className="text-accent-600 font-normal">Perform with confidence.</em>
          </h1>
          <p className="mt-7 text-lg md:text-xl leading-relaxed text-ink-600 max-w-2xl">
            One focused workspace for aptitude, group discussion, AI interviews and performance evaluation.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={()=>onStartApp('dashboard')} className="bg-accent-600 text-white px-6 py-3.5 text-base font-bold inline-flex items-center gap-2 hover:bg-accent-700">
              Open Dashboard <ArrowRight className="w-4 h-4"/>
            </button>
            <button onClick={()=>onStartApp('interview')} className="interactive-card bg-white border border-ink-300 text-ink-900 px-6 py-3.5 text-base font-bold inline-flex items-center gap-2 hover:border-accent-600">
              Start AI Interview
            </button>
          </div>
        </div>

        <aside className="interactive-card border-l-4 border-highlight-500 pl-6 py-2">
          <p className="text-xs uppercase tracking-[.16em] text-ink-500 font-bold">Candidate status</p>
          <p className="mt-3 text-4xl font-bold text-ink-950">{userProfile?.readinessScore ?? 0}%</p>
          <p className="text-sm text-ink-600 mt-1">Current readiness</p>
          <div className="interactive-card mt-6 pt-5 border-t border-ink-200 grid grid-cols-2 gap-4 text-sm">
            <div><strong className="block text-xl text-ink-950">{userProfile?.completedTests ?? 0}</strong><span className="text-ink-500">Tests</span></div>
            <div><strong className="block text-xl text-ink-950">{userProfile?.completedInterviews ?? 0}</strong><span className="text-ink-500">Interviews</span></div>
          </div>
        </aside>
      </div>
    </section>

    <section className="interactive-card bg-white border-b border-ink-200">
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-9">
          <div>
            <p className="text-sm uppercase tracking-[.16em] text-accent-600 font-bold">Core modules</p>
            <h2 className="text-3xl md:text-4xl font-bold text-ink-950 mt-2">Everything you need. Nothing unnecessary.</h2>
          </div>
          <button onClick={()=>onStartApp('dashboard')} className="text-accent-600 font-bold inline-flex items-center gap-2">View dashboard <ArrowRight className="w-4 h-4"/></button>
        </div>

        <div className="interactive-card grid md:grid-cols-2 border-t border-l border-ink-200">
          {FEATURES.map(({tab,icon:Icon,title,text})=>(
            <button key={tab} onClick={()=>onStartApp(tab)} className="interactive-card text-left p-7 border-r border-b border-ink-200 hover:bg-[#fbfaf7] group">
              <div className="flex items-start justify-between gap-6">
                <span className="ui-3d-stage ui-3d-stage-sm" aria-hidden="true"><span className="ui-3d-tile"><Icon className="w-5 h-5"/></span></span>
                <ArrowRight className="w-4 h-4 text-ink-400 group-hover:text-accent-600"/>
              </div>
              <h3 className="mt-6 text-xl font-bold text-ink-950">{title}</h3>
              <p className="mt-2 text-base leading-relaxed text-ink-600">{text}</p>
            </button>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-[#241d19] text-white">
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm uppercase tracking-[.16em] text-highlight-300 font-bold">How it works</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold">Practice → Evaluate → Improve</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-300 max-w-xl">Complete an assessment, review the evidence-based feedback, then return to the weakest area. Your preparation stays focused on measurable improvement.</p>
        </div>
        <div className="grid gap-4">
          {['Choose a preparation module','Complete the assessment','Review your report and next steps'].map((item,i)=>(
            <div key={item} className="interactive-card flex items-center gap-4 border-b border-ink-700 pb-4">
              <span className="text-highlight-300 font-bold text-lg">0{i+1}</span>
              <span className="text-base">{item}</span>
              <CheckCircle2 className="w-4 h-4 ml-auto text-ink-500"/>
            </div>
          ))}
        </div>
      </div>
    </section>

    <footer className="interactive-card bg-[#1b1714] text-ink-400 border-t border-ink-700">
      <div className="max-w-[1180px] mx-auto px-5 md:px-8 py-7 flex flex-col md:flex-row justify-between gap-3 text-sm">
        <span className="text-white font-bold">MBA <span className="text-highlight-300">BJD</span></span>
        <span>Professional placement preparation workspace</span>
        {onOpenLoginModal && <button onClick={onOpenLoginModal} className="text-highlight-300 hover:text-white">{userProfile?.isLoggedIn ? 'Candidate Profile' : 'Sign in'}</button>}
      </div>
    </footer>
  </div>
);
