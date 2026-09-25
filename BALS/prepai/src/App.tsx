import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { LandingPageView } from './components/LandingPageView';
import { DashboardView } from './components/DashboardView';
import { AptitudeView } from './components/AptitudeView';
import { GroupDiscussionView } from './components/GroupDiscussionView';
import { AIInterviewView } from './components/AIInterviewView';
import { EvaluationSummaryView } from './components/EvaluationSummaryView';
import { GDEvaluationSummaryView } from './components/GDEvaluationSummaryView';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { InterviewEvaluation, GDEvaluation, UserProfile, INITIAL_USER_PROFILE, MBADomain } from './types';

type Tab = 'landing' | 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation';
type Category = 'verbal' | 'logical' | 'quants';

// Fixed app hierarchy: Back always goes to a screen's logical parent, not
// "wherever the browser history happens to say you came from." This matters
// because Landing has shortcut buttons that jump straight into Aptitude/
// Interview/GD, skipping Dashboard — with plain browser-history back, that
// path would send Back to Landing while the normal Dashboard-first path
// sends Back to Dashboard, which is inconsistent. This map makes it the
// same either way: every leaf screen's parent is Dashboard, and Dashboard's
// parent is Landing.
const PARENT_TAB: Partial<Record<Tab, Tab>> = {
  dashboard: 'landing',
  aptitude: 'dashboard',
  gd: 'dashboard',
  interview: 'dashboard',
  evaluation: 'dashboard',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [selectedCategory, setSelectedCategory] = useState<Category>('verbal');
  const [lastEvaluation, setLastEvaluation] = useState<InterviewEvaluation | undefined>(undefined);
  const [lastGDEvaluation, setLastGDEvaluation] = useState<GDEvaluation | undefined>(undefined);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // The app previously never touched browser history, so every screen
  // change was invisible to the Back button — pressing Back had nowhere
  // real to go and just dumped the user onto the landing page. `navigate`
  // pushes a real history entry per screen; a popstate listener below
  // reads it back out when the user presses Back/Forward, so Back now
  // returns to the ACTUAL previous screen instead of jumping home.
  const navigate = (tab: Tab, category?: Category) => {
    if (category) setSelectedCategory(category);
    setActiveTab(tab);
    window.history.pushState({ tab, category }, '', window.location.pathname);
  };

  useEffect(() => {
    // Give the initial screen a real history entry to land on.
    window.history.replaceState({ tab: activeTab, category: selectedCategory }, '', window.location.pathname);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { tab?: Tab; category?: Category } | null;
      if (state?.category) setSelectedCategory(state.category);
      setActiveTab(state?.tab ?? 'landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setLastGDEvaluation(undefined);
    setUserProfile((prev) => {
      const newXp = prev.xp + 300;
      const { level, title } = calculateLevel(newXp);
      const newInterviews = prev.completedInterviews + 1;
      // The dashboard readiness for an interview is the same evaluated
      // readiness score shown in the report. XP is progression, not interview quality.
      const readiness = Math.max(0, Math.min(100, Math.round(evaluation.readinessScore)));
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
    navigate('evaluation');
  };

  const handleCompleteGD = (evaluation: GDEvaluation) => {
    setLastGDEvaluation(evaluation);
    setLastEvaluation(undefined);
    setUserProfile((prev) => {
      const newXp = prev.xp + 200;
      const { level, title } = calculateLevel(newXp);
      const newGDs = prev.completedGDs + 1;
      // Keep the dashboard and GD report on the exact same readiness score.
      const readiness = Math.max(0, Math.min(100, Math.round(evaluation.readinessScore)));
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
    navigate('evaluation');
  };

  const handleStartAppFromLanding = (targetTab: 'dashboard' | 'aptitude' | 'gd' | 'interview' | 'evaluation' = 'dashboard', category?: Category) => {
    navigate(targetTab, category);
  };

  // Back means the actual previous app screen. Each navigate() call creates
  // a history entry, so this returns Evaluation -> Interview/GD, Interview/GD
  // -> Dashboard (or Landing if that was the real previous screen), etc.
  // It no longer forces every Back click through a fixed parent/home route.
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    const fallback = PARENT_TAB[activeTab];
    if (fallback) navigate(fallback);
  };

  return (
    <div id="app-root" className="min-h-screen bg-paper text-ink-900 flex flex-col">
      {/* Top Header Navigation */}
      {activeTab !== 'landing' && (
        <Header
          activeTab={activeTab}
          setActiveTab={navigate}
          userProfile={userProfile}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />
      )}

      {/* Always-available Back button. Goes to the actual previous screen
          (via browser history), not straight to landing. */}
      {activeTab !== 'landing' && (
        <button
          onClick={handleGoBack}
          aria-label="Go back"
          className="fixed top-[76px] left-4 z-[45] flex items-center gap-1.5 bg-white/95 hover:bg-ink-50 text-ink-800 font-bold px-3 py-2 rounded-lg border border-ink-200 text-xs shadow-sm backdrop-blur transition-all"
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
            setActiveTab={navigate}
            onSelectCategory={(cat) => navigate('aptitude', cat)}
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
          lastGDEvaluation ? (
            <GDEvaluationSummaryView
              evaluation={lastGDEvaluation}
              onStartNextPath={() => navigate('gd')}
            />
          ) : (
            <EvaluationSummaryView
              evaluation={lastEvaluation}
              onStartNextPath={() => navigate('aptitude')}
            />
          )
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
