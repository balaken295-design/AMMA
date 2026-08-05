import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { LandingPageView } from './components/LandingPageView';
import { DashboardView } from './components/DashboardView';
import { AptitudeView } from './components/AptitudeView';
import { GroupDiscussionView } from './components/GroupDiscussionView';
import { AIInterviewView } from './components/AIInterviewView';
import { EvaluationSummaryView } from './components/EvaluationSummaryView';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { InterviewEvaluation, UserProfile, INITIAL_USER_PROFILE, MBADomain } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation'>('landing');
  const [selectedCategory, setSelectedCategory] = useState<'verbal' | 'logical' | 'quants'>('verbal');
  const [lastEvaluation, setLastEvaluation] = useState<InterviewEvaluation | undefined>(undefined);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('prepai_user_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_USER_PROFILE;
  });

  // Sync profile to localStorage & MongoDB Atlas
  useEffect(() => {
    try {
      localStorage.setItem('prepai_user_profile', JSON.stringify(userProfile));
      if (userProfile.isLoggedIn && userProfile.email) {
        fetch('/api/db/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: userProfile }),
        }).catch((err) => console.warn('Sync profile error:', err));
      }
    } catch {
      // ignore
    }
  }, [userProfile]);

  const calculateLevel = (xp: number) => {
    if (xp < 500) return { level: 1, title: 'Intern Quest' };
    if (xp < 1500) return { level: 2, title: 'Associate Sprint' };
    if (xp < 3000) return { level: 3, title: 'VP Strategy' };
    return { level: 4, title: 'MD Boss Battle' };
  };

  const handleAddXP = (xpAmount: number, domain?: string, scorePercent?: number) => {
    setUserProfile((prev) => {
      const newXp = prev.xp + xpAmount;
      const { level, title } = calculateLevel(newXp);
      const newCompletedTests = prev.completedTests + 1;

      const updatedDomainScores = { ...prev.domainScores };
      if (domain && domain in updatedDomainScores) {
        const currentDomainScore = updatedDomainScores[domain as MBADomain];
        updatedDomainScores[domain as MBADomain] = currentDomainScore === 0 ? (scorePercent || 80) : Math.round((currentDomainScore + (scorePercent || 80)) / 2);
      }

      // Dynamic readiness score calculation from zero upwards
      const totalTestsAndInterviews = newCompletedTests + prev.completedInterviews + prev.completedGDs;
      const baseReadiness = Math.min(100, Math.round((newXp / 3000) * 85 + totalTestsAndInterviews * 5));

      return {
        ...prev,
        xp: newXp,
        level,
        levelTitle: title,
        completedTests: newCompletedTests,
        readinessScore: Math.min(100, Math.max(15, baseReadiness)),
        streakDays: prev.streakDays === 0 ? 1 : prev.streakDays,
        domainScores: updatedDomainScores,
      };
    });
  };

  // Called once the backend has verified the real Google ID token — the
  // profile it returns is already resolved (existing or freshly created),
  // so we just adopt it directly rather than re-deriving anything client-side.
  const handleGoogleVerifiedProfile = (profile: UserProfile) => {
    setUserProfile({ ...profile, isLoggedIn: true });
  };

  const handleGoogleLogout = () => {
    setUserProfile(INITIAL_USER_PROFILE);
    localStorage.removeItem('prepai_user_profile');
  };

  const handleResetProgress = () => {
    setUserProfile((prev) => ({
      ...INITIAL_USER_PROFILE,
      email: prev.email,
      name: prev.name,
      isLoggedIn: prev.isLoggedIn,
    }));
    localStorage.removeItem('prepai_user_profile');
  };

  const handleCompleteInterview = (evaluation: InterviewEvaluation) => {
    setLastEvaluation(evaluation);
    setUserProfile((prev) => {
      const newXp = prev.xp + 300;
      const { level, title } = calculateLevel(newXp);
      const newInterviews = prev.completedInterviews + 1;
      const readiness = Math.min(100, Math.max(20, Math.round((newXp / 3000) * 70 + evaluation.readinessScore * 0.3)));
      return {
        ...prev,
        xp: newXp,
        level,
        levelTitle: title,
        completedInterviews: newInterviews,
        readinessScore: readiness,
        streakDays: prev.streakDays === 0 ? 1 : prev.streakDays,
      };
    });
    setActiveTab('evaluation');
  };

  const handleCompleteGD = (evaluation: any) => {
    setUserProfile((prev) => {
      const newXp = prev.xp + 200;
      const { level, title } = calculateLevel(newXp);
      const newGDs = prev.completedGDs + 1;
      const readiness = Math.min(100, Math.max(10, Math.round((newXp / 3000) * 70 + (evaluation.readinessScore || 0) * 0.3)));
      return {
        ...prev,
        xp: newXp,
        level,
        levelTitle: title,
        completedGDs: newGDs,
        readinessScore: readiness,
        streakDays: prev.streakDays === 0 ? 1 : prev.streakDays,
      };
    });
  };

  const handleStartAppFromLanding = (targetTab: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation' = 'dashboard', category?: 'verbal' | 'logical' | 'quants') => {
    if (category) {
      setSelectedCategory(category);
    }
    setActiveTab(targetTab);
  };

  // Dedicated "go home" handler, wired to a control rendered directly by
  // App itself (not by Header). Previously the only way back to the
  // landing page was a "Home" tab inside <Header>, and if that tab's
  // click handler wasn't wired to setActiveTab('landing') it would look
  // "stuck" — present but unresponsive. This button always works,
  // regardless of what Header does internally.
  const handleGoHome = () => setActiveTab('landing');

  return (
    <div id="app-root" className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-['Inter',sans-serif]">
      {/* Top Header Navigation */}
      {activeTab !== 'landing' && (
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />
      )}

      {/* Always-available Back button. Rendered outside of Header so it
          keeps working even if the Header component's own Home tab has a
          wiring bug. Safe to remove once Header's Home tab is confirmed
          fixed. */}
      {activeTab !== 'landing' && (
        <button
          onClick={handleGoHome}
          aria-label="Back to home"
          className="fixed top-4 left-4 z-[60] flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold px-3.5 py-2 rounded-xl border border-slate-300 text-xs shadow-md transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      )}

      {/* Main Content Stage */}
      <main id="app-main" className="flex-1">
        {activeTab === 'landing' && (
          <LandingPageView
            onStartApp={handleStartAppFromLanding}
            userProfile={userProfile}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            setActiveTab={setActiveTab}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setActiveTab('aptitude');
            }}
            userProfile={userProfile}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'aptitude' && (
          <AptitudeView
            initialCategory={selectedCategory}
            userProfile={userProfile}
            onAddXP={handleAddXP}
          />
        )}

        {activeTab === 'gd' && (
          <GroupDiscussionView onCompleteGD={handleCompleteGD} />
        )}

        {activeTab === 'interview' && (
          <AIInterviewView onCompleteInterview={handleCompleteInterview} />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationSummaryView
            evaluation={lastEvaluation}
            onStartNextPath={() => setActiveTab('aptitude')}
          />
        )}
      </main>

      {/* Google Sign In & Account Management Modal */}
      <GoogleLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        userProfile={userProfile}
        onGoogleProfile={handleGoogleVerifiedProfile}
        onLogout={handleGoogleLogout}
        onResetProgress={handleResetProgress}
      />
    </div>
  );
}
