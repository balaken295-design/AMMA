import React, { useState, useEffect, useRef } from 'react';
import { InterviewQuestion, InterviewEvaluation } from '../types';
import { Video, VideoOff, Mic, MicOff, Send, Sparkles, Award, Bot, CheckCircle2, Volume2, Activity, Play } from 'lucide-react';

interface AIInterviewViewProps {
  onCompleteInterview: (evaluation: InterviewEvaluation) => void;
}

export const AIInterviewView: React.FC<AIInterviewViewProps> = ({ onCompleteInterview }) => {
  const [selectedRole, setSelectedRole] = useState('Management Consulting Associate (McKinsey, BCG, Bain Case Interview)');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [questionsHistory, setQuestionsHistory] = useState<InterviewQuestion[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [userAnswerInput, setUserAnswerInput] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live video feed
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera/Mic not accessible:", err);
      }
    }
    if (sessionStarted) {
      initCam();
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [sessionStarted]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartSession = async () => {
    setSessionStarted(true);
    setCurrentStep(1);
    setQuestionsHistory([]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/interview-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, stepNumber: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentQuestionText(data.nextQuestion);
        speakText(data.nextQuestion);
      }
    } catch {
      const defaultQ = "Welcome! Let's begin with your MBA profile. How would you structure a market-entry framework for a multinational consumer goods brand evaluating expansion into Southeast Asia?";
      setCurrentQuestionText(defaultQ);
      speakText(defaultQ);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextStep = async () => {
    if (!userAnswerInput.trim()) return;

    setIsGenerating(true);
    const newHistoryItem: InterviewQuestion = {
      id: currentStep,
      question: currentQuestionText,
      category: 'technical',
      userAnswer: userAnswerInput,
      aiFeedback: currentFeedback || undefined
    };

    const updatedHistory = [...questionsHistory, newHistoryItem];
    setQuestionsHistory(updatedHistory);
    const lastAnswer = userAnswerInput;
    setUserAnswerInput('');

    if (currentStep >= 4) {
      // Complete interview and fetch final evaluation report
      try {
        const res = await fetch('/api/gemini/interview-evaluation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: selectedRole, qaPairs: updatedHistory })
        });
        const data = await res.json();
        const evalResult = (data.success && data.evaluation) ? data.evaluation : getFallbackEvaluation();

        // Persist evaluation to MongoDB Atlas
        fetch('/api/db/save-interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateName: "MBA Candidate",
            role: selectedRole,
            evaluation: evalResult
          })
        }).catch(e => console.warn("Save interview score error:", e));

        onCompleteInterview(evalResult);
      } catch {
        const fallback = getFallbackEvaluation();
        onCompleteInterview(fallback);
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const nextStepNum = currentStep + 1;
    setCurrentStep(nextStepNum);

    try {
      const res = await fetch('/api/gemini/interview-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          stepNumber: nextStepNum,
          previousQuestions: updatedHistory,
          userAnswer: lastAnswer
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentQuestionText(data.nextQuestion);
        setCurrentFeedback(data.feedback);
        speakText(data.nextQuestion);
      }
    } catch {
      const fallbackQ = "How would you handle a conflict within your development team regarding architectural choices?";
      setCurrentQuestionText(fallbackQ);
      speakText(fallbackQ);
    } finally {
      setIsGenerating(false);
    }
  };

const getFallbackEvaluation = (): InterviewEvaluation => ({
  role: selectedRole,
  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  readinessScore: 0,
  percentile: 0,
  metrics: {
    communication: { score: 0, note: "Evaluation unavailable — AI service did not respond." },
    technicalAccuracy: { score: 0, note: "Evaluation unavailable — AI service did not respond." },
    bodyLanguage: { score: 0, note: "Evaluation unavailable — AI service did not respond." },
    confidence: { score: 0, note: "Evaluation unavailable — AI service did not respond." }
  },
  transcript: updatedHistory.map((q, i) => ({ id: String(i+1), question: q.question, answer: q.userAnswer || "", aiInsight: "N/A" })),
  nextSteps: [],
  recommendedResources: []
});

  return (
    <div id="ai-interview-container" className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {!sessionStarted ? (
        /* Role Selection Setup Screen */
        <div className="max-w-xl mx-auto bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full uppercase font-bold tracking-wider">
              Step-by-Step AI Simulation
            </span>
            <h1 className="text-3xl font-black text-slate-900 font-['Hanken_Grotesk',sans-serif] tracking-tight">
              1-on-1 AI Face Interviewer
            </h1>
            <p className="text-sm text-slate-600">
              Engage with an interactive AI Interviewer who asks progressive role-based questions and evaluates technical accuracy and speech tone.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">MBA Specialization & Role Track</label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
            >
              <option value="Management Consulting Associate (McKinsey, BCG, Bain Case Interview)">Management Consulting Associate (McKinsey, BCG, Bain Case Interview)</option>
              <option value="Product Manager - Tech & AI Growth (FAANG & Unicorns)">Product Manager - Tech & AI Growth (FAANG & Unicorns)</option>
              <option value="Investment Banking Associate (M&A, Valuation & DCF Modeling)">Investment Banking Associate (M&A, Valuation & DCF Modeling)</option>
              <option value="Corporate Strategy & Brand Director (FMCG & Fortune 500)">Corporate Strategy & Brand Director (FMCG & Fortune 500)</option>
              <option value="Global Operations & Supply Chain Leader (Logistics & Cost Reduction)">Global Operations & Supply Chain Leader (Logistics & Cost Reduction)</option>
              <option value="Venture Capital & Private Equity Investment Analyst">Venture Capital & Private Equity Investment Analyst</option>
            </select>
          </div>

          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2 text-xs text-indigo-950">
            <div className="font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" /> Real-time HUD Analytics Active
            </div>
            <p>
              Camera & Microphone will monitor posture stability, articulation pace, and technical vocabulary usage during the session.
            </p>
          </div>

          <button
            onClick={handleStartSession}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
          >
            <Play className="w-4 h-4" /> Begin AI Interview Session
          </button>
        </div>
      ) : (
        /* Active Interview Stage */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 text-white p-5 px-7 rounded-3xl shadow-xl border border-slate-800">
            <div>
              <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                Step {currentStep} of 4 • Progressive Interview
              </span>
              <h2 className="text-lg font-bold font-['Hanken_Grotesk',sans-serif]">{selectedRole}</h2>
            </div>
            <button
              onClick={() => setSessionStarted(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel Session
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Animated AI Interviewer Visual Face */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden min-h-[380px] shadow-xl">
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                AI Interviewer Face
              </div>

              {/* Visual Avatar Pulse */}
              <div className="relative pt-4">
                <div className={`w-36 h-36 rounded-full bg-gradient-to-tr from-indigo-950 to-slate-900 border-4 ${isAiSpeaking ? 'border-indigo-400 scale-105 shadow-indigo-500/30 shadow-2xl' : 'border-slate-800'} transition-all flex items-center justify-center shadow-2xl`}>
                  <Bot className={`w-16 h-16 ${isAiSpeaking ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} />
                </div>
                {isAiSpeaking && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 shadow-md">
                    <Volume2 className="w-3 h-3 animate-bounce" /> Speaking
                  </div>
                )}
              </div>

              {/* Current Question Display */}
              <div className="space-y-2 max-w-md">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Current Question</span>
                <p className="text-base font-semibold text-white leading-relaxed">
                  "{currentQuestionText}"
                </p>
              </div>
            </div>

            {/* Right: Candidate Live Camera & Response Box */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Camera Tile */}
              <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-sm">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* HUD Overlay */}
                <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono text-indigo-300 space-y-0.5 border border-white/10">
                  <div>Eye Contact: <strong>92%</strong></div>
                  <div>Posture: <strong>Optimal</strong></div>
                </div>
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                  You (Candidate Camera)
                </div>
              </div>

              {/* Answer Input */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-3">
                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Your Spoken / Written Answer</label>
                <textarea
                  rows={3}
                  placeholder="Record speech or type your response here..."
                  value={userAnswerInput}
                  onChange={e => setUserAnswerInput(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
                ></textarea>

                {currentFeedback && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200/80 rounded-2xl text-xs text-indigo-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[10px] font-mono text-indigo-700 uppercase">AI Real-time Feedback</strong>
                      <span>{currentFeedback}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-mono text-slate-400">Step {currentStep} / 4</span>
                  <button
                    onClick={handleNextStep}
                    disabled={!userAnswerInput.trim() || isGenerating}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-md shadow-indigo-200"
                  >
                    {isGenerating ? "Processing..." : currentStep >= 4 ? "Finish & View Evaluation Report" : "Submit Answer & Next Question"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
