import React from 'react';
import { Home, LayoutDashboard, BookOpen, Users, Video, Award, Bell } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: 'landing' | 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation';
  setActiveTab: (tab: 'landing' | 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation') => void;
  userProfile: UserProfile;
  onOpenLoginModal: () => void;
}

const NAV = [
  ['dashboard','Dashboard',LayoutDashboard],
  ['aptitude','Aptitude',BookOpen],
  ['gd','Group Discussion',Users],
  ['interview','AI Interview',Video],
  ['evaluation','Reports',Award],
] as const;

export const Header: React.FC<HeaderProps> = ({activeTab,setActiveTab,userProfile,onOpenLoginModal}) => (
  <header id="main-header" className="sticky top-0 z-50 w-full border-b">
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between gap-6">
      <button id="header-brand" onClick={()=>setActiveTab('landing')} className="flex items-center gap-3 shrink-0">
        <span className="w-9 h-9 flex items-center justify-center border border-highlight-300 text-highlight-300 font-bold text-lg">B</span>
        <span className="hidden sm:block text-lg font-bold tracking-wide">
          MBA <span className="text-highlight-300">BJD</span>
          <small className="block text-[9px] uppercase tracking-[.22em] text-ink-300 font-normal">Placement Preparation</small>
        </span>
      </button>

      <nav id="header-nav" className="flex-1 hidden md:flex items-center justify-center gap-1">
        <button onClick={()=>setActiveTab('landing')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${activeTab==='landing'?'text-highlight-300 bg-white/5':'text-ink-300 hover:text-white'}`}>
          <Home className="w-4 h-4"/> Home
        </button>
        {NAV.map(([tab,label,Icon])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${activeTab===tab?'text-highlight-300 bg-white/5':'text-ink-300 hover:text-white'}`}>
            <Icon className="w-4 h-4"/> {label}
          </button>
        ))}
      </nav>

      <div id="header-actions" className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-ink-700 text-sm text-ink-200">
          <span>Readiness</span><strong className="text-highlight-300">{userProfile.readinessScore}%</strong>
        </div>
        <button id="btn-notifications" className="hidden sm:block p-2 text-ink-300 hover:text-white" aria-label="Notifications">
          <Bell className="w-4 h-4"/>
        </button>
        <button onClick={onOpenLoginModal} className="px-3 py-2 border border-ink-600 text-white text-sm hover:border-highlight-400">
          {userProfile.isLoggedIn ? userProfile.name : 'Sign in'}
        </button>
      </div>
    </div>
  </header>
);
