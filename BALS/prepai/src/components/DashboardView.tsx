import React from 'react';
import { BookOpen, Users, Video, Award, ArrowRight, CheckCircle2, Circle, LogIn, ClipboardCheck, TrendingUp } from 'lucide-react';
import { UserProfile } from '../types';

interface DashboardViewProps {
  setActiveTab: (tab: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation') => void;
  onSelectCategory: (category: 'verbal' | 'logical' | 'quants') => void;
  userProfile: UserProfile;
  onOpenLoginModal: () => void;
}

const ProgressBar: React.FC<{ value: number; compact?: boolean }> = ({ value, compact = false }) => (
  <div className={`w-full bg-[#e8e2d9] overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full bg-[#7f2f2a] transition-all duration-500" style={{ width: `${value}%` }} />
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab, onSelectCategory, userProfile, onOpenLoginModal }) => {
  const completedCategories = userProfile.completedAptitudeCategories || [];
  const verbalDone = completedCategories.includes('verbal');
  const logicalDone = completedCategories.includes('logical');
  const quantsDone = completedCategories.includes('quants');
  const aptitudeProgress = Math.round((Number(verbalDone) + Number(logicalDone) + Number(quantsDone)) / 3 * 100);
  const gdProgress = userProfile.completedGDs > 0 ? 100 : 0;
  const interviewProgress = userProfile.completedInterviews > 0 ? 100 : 0;
  const overallProgress = Math.round((aptitudeProgress + gdProgress + interviewProgress) / 3);
  const completedAreas = Number(aptitudeProgress === 100) + Number(gdProgress === 100) + Number(interviewProgress === 100);
  const sections = [
    { id: 'aptitude' as const, title: 'Placement Aptitude', description: 'Verbal ability, logical reasoning and quantitative aptitude.', progress: aptitudeProgress, detail: `${[verbalDone, logicalDone, quantsDone].filter(Boolean).length} of 3 categories assessed`, icon: BookOpen, action: 'Start aptitude practice' },
    { id: 'gd' as const, title: 'Group Discussion', description: 'Practise structured discussions and review your contribution feedback.', progress: gdProgress, detail: userProfile.completedGDs ? `${userProfile.completedGDs} assessment${userProfile.completedGDs === 1 ? '' : 's'} completed` : 'Assessment not completed yet', icon: Users, action: userProfile.completedGDs ? 'Practise again' : 'Start group discussion' },
    { id: 'interview' as const, title: 'AI Interview', description: 'Answer role-based questions and review your interview evaluation.', progress: interviewProgress, detail: userProfile.completedInterviews ? `${userProfile.completedInterviews} interview${userProfile.completedInterviews === 1 ? '' : 's'} completed` : 'Assessment not completed yet', icon: Video, action: userProfile.completedInterviews ? 'Practise again' : 'Start AI interview' },
  ];
  const categoryItems = [
    { id: 'verbal' as const, title: 'Verbal Ability', done: verbalDone },
    { id: 'logical' as const, title: 'Logical Reasoning', done: logicalDone },
    { id: 'quants' as const, title: 'Quantitative Aptitude', done: quantsDone },
  ];

  return (
    <div id="dashboard-container" className="max-w-[1180px] mx-auto w-full px-4 md:px-8 py-8 space-y-8">
      <header className="border-b border-[#ddd4c8] pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-[#7f2f2a] font-bold mb-2">Candidate dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1b1714]">Welcome, {userProfile.name || 'MBA Candidate'}</h1>
          <p className="text-sm md:text-base text-[#625951] mt-2 max-w-2xl">Track your placement preparation, complete assessments and review your progress in one place.</p>
        </div>
        {!userProfile.isLoggedIn && <button onClick={onOpenLoginModal} className="inline-flex items-center gap-2 self-start border border-[#cfc3b5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1b1714] hover:bg-[#f8f4ee]"><LogIn size={16} /> Sign in with Google</button>}
      </header>

      <section aria-label="Overall completion" className="grid grid-cols-1 lg:grid-cols-[1.4fr_.8fr] gap-5">
        <div className="border border-[#ded5ca] bg-white p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#625951]">Overall preparation completion</p>
              <div className="flex items-baseline gap-2 mt-2"><span className="text-5xl font-bold text-[#1b1714] tabular-nums">{overallProgress}%</span><span className="text-sm text-[#74695f]">completed</span></div>
            </div>
            <div className="hidden sm:flex w-12 h-12 items-center justify-center bg-[#f5f1e8] text-[#7f2f2a]"><TrendingUp size={23} /></div>
          </div>
          <div className="mt-5"><ProgressBar value={overallProgress} /></div>
          <p className="mt-3 text-sm text-[#625951]">{completedAreas} of 3 preparation areas fully completed. Your percentage updates after you finish an assessment.</p>
        </div>
        <div className="border border-[#ded5ca] bg-[#f8f5ef] p-6">
          <p className="text-sm font-semibold text-[#625951]">Placement readiness</p>
          <div className="flex items-baseline gap-2 mt-2"><span className="text-4xl font-bold text-[#7f2f2a] tabular-nums">{Math.max(0, Math.min(100, userProfile.readinessScore || 0))}%</span><span className="text-sm text-[#74695f]">score</span></div>
          <ProgressBar value={Math.max(0, Math.min(100, userProfile.readinessScore || 0))} compact />
          <p className="mt-3 text-xs leading-relaxed text-[#625951]">Readiness reflects your latest evaluation. Completion measures which preparation areas you have practised.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div><h2 className="text-xl font-bold text-[#1b1714]">Preparation progress</h2><p className="text-sm text-[#74695f] mt-1">Select an area to continue. Progress is based on completed assessments, not time spent.</p></div>
          <button onClick={() => setActiveTab('evaluation')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#7f2f2a] hover:underline self-start">View evaluation reports <ArrowRight size={15} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map(section => {
            const Icon = section.icon;
            return <article key={section.id} className="border border-[#ded5ca] bg-white p-5 flex flex-col min-h-[238px]">
              <div className="flex items-start justify-between gap-3"><div className="w-10 h-10 flex items-center justify-center bg-[#f5f1e8] text-[#7f2f2a]"><Icon size={20} /></div><span className="text-lg font-bold text-[#1b1714] tabular-nums">{section.progress}%</span></div>
              <h3 className="text-lg font-bold text-[#1b1714] mt-4">{section.title}</h3>
              <p className="text-sm text-[#625951] leading-relaxed mt-1 flex-1">{section.description}</p>
              <div className="mt-4"><ProgressBar value={section.progress} compact /><p className="text-xs text-[#74695f] mt-2">{section.detail}</p></div>
              <button onClick={() => setActiveTab(section.id)} className="mt-4 w-full border border-[#bfb2a4] px-3 py-2.5 text-sm font-semibold text-[#1b1714] hover:bg-[#f8f4ee] flex items-center justify-between">{section.action}<ArrowRight size={15} /></button>
            </article>;
          })}
        </div>
      </section>

      <section className="border border-[#ded5ca] bg-white">
        <div className="px-5 py-4 border-b border-[#e8e0d6]"><h2 className="font-bold text-[#1b1714]">Aptitude category checklist</h2><p className="text-sm text-[#74695f] mt-1">Complete at least one test in each category to finish the aptitude section.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#e8e0d6]">
          {categoryItems.map(item => <button key={item.id} onClick={() => { onSelectCategory(item.id); setActiveTab('aptitude'); }} className="p-5 text-left hover:bg-[#fbf8f3] flex items-center gap-3"><span className={item.done ? 'text-[#47704b]' : 'text-[#a59a8e'}>{item.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span><span className="flex-1"><span className="block text-sm font-semibold text-[#1b1714]">{item.title}</span><span className="block text-xs text-[#74695f] mt-1">{item.done ? 'Assessment completed' : 'Not completed'}</span></span><ArrowRight size={15} className="text-[#8a7e72]" /></button>)}
        </div>
      </section>

      <section className="border-t border-[#ddd4c8] pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3"><ClipboardCheck size={20} className="text-[#7f2f2a]" /><div><p className="text-sm font-semibold text-[#1b1714]">Assessment summary</p><p className="text-xs text-[#74695f] mt-1">{userProfile.completedTests} aptitude tests · {userProfile.completedGDs} group discussions · {userProfile.completedInterviews} interviews completed</p></div></div>
        <button onClick={() => setActiveTab('evaluation')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#7f2f2a] hover:underline">Open reports <ArrowRight size={15} /></button>
      </section>
    </div>
  );
};
