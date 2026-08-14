import React from 'react';
import { Bell, Settings, BookOpen, Users, Video, Award, LayoutDashboard, Home, LogIn } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  activeTab: 'landing' | 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation';
  setActiveTab: (tab: 'landing' | 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation') => void;
  userProfile: UserProfile;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, userProfile, onOpenLoginModal }) => {
  return (
    <header id="main-header" className="sticky top-4 z-50 max-w-[1280px] w-[calc(100%-2rem)] mx-auto mb-2">
      <div className="flex justify-between items-center px-6 py-3.5 bg-white/90 backdrop-blur-md border border-ink-200/80 rounded-2xl shadow-sm">
        <div 
          id="header-brand" 
          onClick={() => setActiveTab('landing')} 
          className="font-bold text-xl tracking-tight text-ink-800 cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-accent-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-accent-200">
            B
          </div>
          <span className="text-ink-900 font-extrabold text-xl whitespace-nowrap">MBA <span className="text-accent-600">BJD</span></span>
        </div>

        <nav id="header-nav" className="hidden lg:flex gap-6 items-center">
          <button
            id="nav-tab-landing"
            onClick={() => setActiveTab('landing')}
            className={`font-semibold text-sm transition-all flex items-center gap-2 pb-1 ${
              activeTab === 'landing'
                ? 'text-accent-600 border-b-2 border-accent-600'
                : 'text-ink-500 hover:text-accent-600'
            }`}
          >
            <Home className="w-4 h-4" />
            Home
          </button>

          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`font-semibold text-sm transition-all flex items-center gap-2 pb-1 ${
              activeTab === 'dashboard'
                ? 'text-accent-600 border-b-2 border-accent-600'
                : 'text-ink-500 hover:text-accent-600'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            id="nav-tab-aptitude"
            onClick={() => setActiveTab('aptitude')}
            className={`font-semibold text-sm transition-all flex items-center gap-2 pb-1 ${
              activeTab === 'aptitude'
                ? 'text-accent-600 border-b-2 border-accent-600'
                : 'text-ink-500 hover:text-accent-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Learning Path
          </button>

          <button
            id="nav-tab-gd"
            onClick={() => setActiveTab('gd')}
            className={`font-semibold text-sm transition-all flex items-center gap-2 pb-1 ${
              activeTab === 'gd'
                ? 'text-accent-600 border-b-2 border-accent-600'
                : 'text-ink-500 hover:text-accent-600'
            }`}
          >
            <Users className="w-4 h-4" />
            Simulations (GD)
          </button>

          <button
            id="nav-tab-interview"
            onClick={() => setActiveTab('interview')}
            className={`font-semibold text-sm transition-all flex items-center gap-2 pb-1 ${
              activeTab === 'interview'
                ? 'text-accent-600 border-b-2 border-accent-600'
                : 'text-ink-500 hover:text-accent-600'
            }`}
          >
            <Video className="w-4 h-4" />
            AI Interviewer
          </button>

          <button
            id="nav-tab-evaluation"
            onClick={() => setActiveTab('evaluation')}
            className={`font-semibold text-sm transition-all flex items-center gap-2 pb-1 ${
              activeTab === 'evaluation'
                ? 'text-accent-600 border-b-2 border-accent-600'
                : 'text-ink-500 hover:text-accent-600'
            }`}
          >
            <Award className="w-4 h-4" />
            Valuation Report
          </button>
        </nav>

        <div id="header-actions" className="flex items-center gap-3">
          {/* Readiness indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-ink-50 text-ink-700 px-3 py-1.5 rounded-xl border border-ink-200 text-xs">
            <span className="font-semibold">Readiness</span>
            <span className="font-bold text-accent-700">{userProfile.readinessScore}%</span>
          </div>

          <button id="btn-notifications" className="p-2 text-ink-500 hover:text-accent-600 transition-colors rounded-xl hover:bg-accent-50">
            <Bell className="w-4 h-4" />
          </button>

          {/* User Profile / Google Login trigger */}
          {userProfile.isLoggedIn ? (
            <div
              onClick={onOpenLoginModal}
              className="flex items-center gap-2.5 pl-2 border-l border-ink-200 cursor-pointer group"
            >
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-semibold text-accent-700 uppercase tracking-widest">
                  Candidate Profile
                </p>
                <p className="text-xs font-bold text-ink-800 truncate max-w-[120px]">
                  {userProfile.name}
                </p>
              </div>
              <div
                id="user-profile-avatar"
                className="w-9 h-9 rounded-full bg-accent-600 text-white font-black text-xs flex items-center justify-center border-2 border-accent-200 shadow-xs group-hover:scale-105 transition-transform"
              >
                {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'G'}
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 bg-white hover:bg-ink-50 text-ink-800 font-bold px-3.5 py-1.5 rounded-xl border border-ink-300 text-xs shadow-xs transition-all"
            >
              {/* Official Google Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
