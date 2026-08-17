import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, LogOut, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onGoogleProfile: (profile: UserProfile) => void;
  onLogout: () => void;
  onResetProgress: () => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onGoogleProfile,
  onLogout,
  onResetProgress,
}) => {
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // Render the real Google Identity Services button once the modal is open
  // and the script has loaded. The callback only ever receives a signed
  // credential — the actual email is verified server-side before we trust it.
  useEffect(() => {
    if (!isOpen || userProfile.isLoggedIn) return;
    if (!clientId) return;

    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setTimeout(tryInit, 150);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      if (buttonHostRef.current) {
        buttonHostRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonHostRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
        });
      }
    };
    tryInit();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userProfile.isLoggedIn, clientId]);

  const handleCredentialResponse = async (response: { credential: string }) => {
    setAuthError('');
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        onGoogleProfile(data.profile);
        onClose();
      } else {
        setAuthError(data.error || 'Could not verify your Google account. Please try again.');
      }
    } catch (e) {
      setAuthError('Could not reach the server to verify sign-in. Check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-ink-100 relative space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-ink-400 hover:text-ink-600 p-1.5 rounded-full hover:bg-ink-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-ink-50 border border-ink-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            {/* Official Google G Logo */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
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
          </div>
          <h2 className="text-xl font-bold text-ink-900">
            {userProfile.isLoggedIn ? 'Google account connected' : 'Sign in with Google'}
          </h2>
          <p className="text-xs text-ink-500">
            {userProfile.isLoggedIn
              ? 'Your MBA candidate progress and test scores are automatically saved to MongoDB Atlas cloud storage.'
              : 'Save your live XP, level progress, aptitude scores, and interview analytics to your Google account.'}
          </p>
        </div>

        {userProfile.isLoggedIn ? (
          /* Logged In Account State */
          <div className="space-y-4">
            <div className="bg-ink-50 p-4 rounded-2xl border border-ink-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userProfile.avatar ? (
                  <img src={userProfile.avatar} alt="" className="w-10 h-10 rounded-full object-cover shadow-xs" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {userProfile.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-ink-800">{userProfile.name}</p>
                    <CheckCircle className="w-4 h-4 text-success-500" />
                  </div>
                  <p className="text-xs text-ink-500 font-mono">{userProfile.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-success-100 text-success-800 px-2 py-0.5 rounded-md">
                Active
              </span>
            </div>

            {/* Current Account Stats */}
            <div className="grid grid-cols-3 gap-2 bg-ink-900 text-white p-3.5 rounded-2xl text-center">
              <div>
                <span className="text-[10px] text-ink-400 uppercase tracking-wide">Tests</span>
                <p className="text-sm font-bold text-ink-100">{userProfile.completedTests}</p>
              </div>
              <div>
                <span className="text-[10px] text-ink-400 uppercase tracking-wide">Interviews</span>
                <p className="text-sm font-bold text-ink-100">{userProfile.completedInterviews}</p>
              </div>
              <div>
                <span className="text-[10px] text-ink-400 uppercase tracking-wide">Readiness</span>
                <p className="text-sm font-bold text-success-400">{userProfile.readinessScore}%</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  onResetProgress();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-highlight-50 hover:bg-highlight-100 text-highlight-800 border border-highlight-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-highlight-600" /> Reset progress to 0 XP (start fresh)
              </button>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-ink-500" /> Sign out of Google
              </button>
            </div>
          </div>
        ) : (
          /* Not Logged In - Real Google Sign-In */
          <div className="space-y-4">
            {!clientId ? (
              <div className="bg-highlight-50 border border-highlight-200 rounded-2xl p-4 text-xs text-highlight-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-highlight-600" />
                <span>
                  Google sign-in isn't configured yet — set <code className="font-mono bg-highlight-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> (and the matching <code className="font-mono bg-highlight-100 px-1 rounded">GOOGLE_CLIENT_ID</code> on the server) in your environment.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div ref={buttonHostRef} />
                {isVerifying && (
                  <p className="text-xs text-ink-500 flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-ink-300 border-t-accent-600 rounded-full animate-spin"></span>
                    Verifying your Google account...
                  </p>
                )}
                {authError && (
                  <p className="text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2 text-center">
                    {authError}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-ink-50 hover:bg-ink-100 text-ink-600 rounded-xl text-xs font-semibold transition-colors border border-ink-200/80"
            >
              Continue without signing in (progress stays on this device only)
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-ink-400 justify-center font-mono pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success-500" /> Verified via Google &bull; cloud sync via MongoDB Atlas
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
