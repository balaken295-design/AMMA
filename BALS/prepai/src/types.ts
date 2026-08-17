import React, { useState, useEffect, useRef } from 'react';
import { InterviewQuestion, InterviewEvaluation, MBADomain, ResumeSummary, InterviewFocusOption } from '../types';
import { Video, VideoOff, Mic, MicOff, Send, Sparkles, Award, Bot, CheckCircle2, Volume2, Activity, Play, Upload, FileText, Loader2 } from 'lucide-react';
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const DOMAIN_OPTIONS: MBADomain[] = ['Finance', 'HR', 'Marketing', 'Business Analytics', 'Operations', 'Strategy'];

// Extracts raw text from an uploaded resume file, client-side, so the
// backend only ever has to deal with plain text regardless of whether the
// candidate uploaded a PDF or a Word doc.
async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }
  if (name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }
  // Plain text / fallback
  return file.text();
}

interface AIInterviewViewProps {
  onCompleteInterview: (evaluation: InterviewEvaluation) => void;
}

// Decomposes MediaPipe's column-major 4x4 facial transformation matrix into
// approximate yaw/pitch/roll (degrees). This is a head-pose proxy, not true
// eyeball gaze tracking, but it's a real, live signal computed from the
// camera feed rather than a fixed placeholder value.
function matrixToEuler(m: Float32Array | number[]) {
  const r00 = m[0], r10 = m[1], r20 = m[2];
  const r01 = m[4], r11 = m[5], r21 = m[6];
  const r02 = m[8], r12 = m[9], r22 = m[10];
  const yaw = Math.atan2(r02, r22) * (180 / Math.PI);
  const pitch = Math.atan2(-r12, Math.sqrt(r02 * r02 + r22 * r22)) * (180 / Math.PI);
  const roll = Math.atan2(r10, r00) * (180 / Math.PI);
  return { yaw, pitch, roll };
}

// How many recent frames to average eye-contact over (~ a few seconds at the
// throttled sampling rate below).
const EYE_CONTACT_WINDOW = 30;

export const AIInterviewView: React.FC<AIInterviewViewProps> = ({ onCompleteInterview }) => {
  // Domain tab (replaces the old fixed case-study role list)
  const [selectedDomain, setSelectedDomain] = useState<MBADomain>('Strategy');

  // Resume upload + parsing
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);
  const [resumeSummary, setResumeSummary] = useState<ResumeSummary | null>(null);
  const [selectedFocusId, setSelectedFocusId] = useState<string>('');

  const selectedFocus: InterviewFocusOption | undefined = resumeSummary?.focusOptions.find(f => f.id === selectedFocusId);
  // Display label used in the HUD / evaluation title — combines domain + candidate name once resume is parsed
  const selectedRole = resumeSummary
    ? `${selectedDomain} Interview — ${resumeSummary.candidateName}`
    : `${selectedDomain} Interview`;

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

  // Live posture / eye-contact HUD, computed from the actual camera feed
  // via MediaPipe FaceLandmarker instead of being hardcoded.
  const [eyeContactPct, setEyeContactPct] = useState<number | null>(null);
  const [postureLabel, setPostureLabel] = useState<string>('Calibrating…');
  const [trackingError, setTrackingError] = useState(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const eyeSamplesRef = useRef<boolean[]>([]);
  const lastDetectTimeRef = useRef(0);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        await initTracking();
      } catch (err) {
        console.warn("Camera/Mic not accessible:", err);
        setTrackingError(true);
      }
    }

    async function initTracking() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        faceLandmarkerRef.current = landmarker;
        trackLoop();
      } catch (err) {
        console.warn("Face tracking failed to initialize:", err);
        setTrackingError(true);
      }
    }

    // Runs on every animation frame but only actually calls the model at a
    // throttled ~6fps, which is plenty for a stability/HUD signal and keeps
    // CPU usage low during a long interview session.
    function trackLoop() {
      rafIdRef.current = requestAnimationFrame(trackLoop);
      const video = localVideoRef.current;
      const landmarker = faceLandmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) return;

      const now = performance.now();
      if (now - lastDetectTimeRef.current < 160) return;
      lastDetectTimeRef.current = now;

      let result: FaceLandmarkerResult;
      try {
        result = landmarker.detectForVideo(video, now);
      } catch {
        return;
      }

      const matrix = result.facialTransformationMatrixes?.[0]?.data;
      if (!matrix) {
        // No face detected this frame — don't count it either way, but
        // let the person know tracking has lost them.
        setPostureLabel(prev => (prev === 'Calibrating…' ? prev : 'Face not detected'));
        return;
      }

      const { yaw, pitch, roll } = matrixToEuler(matrix);

      // Eye-contact proxy: is the head roughly facing the camera?
      const lookingAtCamera = Math.abs(yaw) < 15 && Math.abs(pitch) < 12;
      const samples = eyeSamplesRef.current;
      samples.push(lookingAtCamera);
      if (samples.length > EYE_CONTACT_WINDOW) samples.shift();
      const pct = Math.round((samples.filter(Boolean).length / samples.length) * 100);
      setEyeContactPct(pct);

      // Posture proxy: head tilt / lean, derived from the same pose.
      let label = 'Optimal';
      if (Math.abs(roll) > 15) label = 'Tilted';
      else if (pitch < -15) label = 'Slouching';
      else if (pitch > 20) label = 'Leaning back';
      setPostureLabel(label);
    }

    if (sessionStarted) {
      eyeSamplesRef.current = [];
      setEyeContactPct(null);
      setPostureLabel('Calibrating…');
      setTrackingError(false);
      initCam();
    }

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
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

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file);
    setResumeSummary(null);
    setSelectedFocusId('');
    setResumeParseError(null);
    setIsParsingResume(true);
    try {
      const resumeText = await extractResumeText(file);
      if (!resumeText.trim()) throw new Error('empty');

      const res = await fetch('/api/gemini/resume-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, domain: selectedDomain }),
      });
      const data = await res.json();
      if (data.success && data.resumeSummary) {
        setResumeSummary(data.resumeSummary);
        const firstOption = data.resumeSummary.focusOptions?.[0];
        if (firstOption) setSelectedFocusId(firstOption.id);
      } else {
        throw new Error(data.error || 'parse failed');
      }
    } catch (err) {
      console.warn('Resume parsing failed:', err);
      setResumeParseError("Couldn't read that resume. Try a text-based PDF or DOCX (not a scanned image).");
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleStartSession = async () => {
    if (!resumeSummary) return;
    setSessionStarted(true);
    setCurrentStep(1);
    setQuestionsHistory([]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/interview-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          resumeSummary,
          focusLabel: selectedFocus?.label,
          focusInstruction: selectedFocus?.instruction,
          stepNumber: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentQuestionText(data.nextQuestion);
        speakText(data.nextQuestion);
      }
    } catch {
      const defaultQ = `Hi ${resumeSummary.candidateName}, thanks for joining — walk me through your background and what drew you to ${selectedDomain}.`;
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
        const evalResult = (data.success && data.evaluation) ? data.evaluation : getFallbackEvaluation(updatedHistory);

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
        const fallback = getFallbackEvaluation(updatedHistory);
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
          domain: selectedDomain,
          resumeSummary,
          focusLabel: selectedFocus?.label,
          focusInstruction: selectedFocus?.instruction,
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

const getFallbackEvaluation = (history: InterviewQuestion[] = []): InterviewEvaluation => ({
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
  transcript: history.map((q, i) => ({ id: String(i+1), question: q.question, answer: q.userAnswer || "", aiInsight: "N/A" })),
  nextSteps: [],
  recommendedResources: []
});

  return (
    <div id="ai-interview-container" className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {!sessionStarted ? (
        /* Role Selection Setup Screen */
        <div className="max-w-xl mx-auto bg-white border border-ink-200/90 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-accent-600 bg-accent-50 px-3.5 py-1 rounded-full uppercase font-bold tracking-wider">
              Step-by-Step AI Simulation
            </span>
            <h1 className="text-3xl font-black text-ink-900 tracking-tight">
              1-on-1 AI Face Interviewer
            </h1>
            <p className="text-sm text-ink-600">
              Engage with an interactive AI Interviewer who asks progressive role-based questions and evaluates technical accuracy and speech tone.
            </p>
          </div>

          {/* Domain Tab */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Interview Domain</label>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_OPTIONS.map(domain => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    selectedDomain === domain
                      ? 'bg-accent-600 border-accent-600 text-white shadow-md shadow-accent-200'
                      : 'bg-ink-50 border-ink-200/80 text-ink-700 hover:border-accent-400'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          {/* Resume Upload */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Upload Your Resume</label>
            <p className="text-xs text-ink-500">
              Questions are generated from your actual resume — no case studies, just what a real interviewer would ask you.
            </p>
            <label
              htmlFor="resume-upload-input"
              className="w-full flex items-center gap-3 p-4 bg-ink-50 border border-dashed border-ink-300 rounded-2xl cursor-pointer hover:border-accent-500 transition-colors"
            >
              {isParsingResume ? (
                <Loader2 className="w-5 h-5 text-accent-600 animate-spin shrink-0" />
              ) : resumeSummary ? (
                <CheckCircle2 className="w-5 h-5 text-accent-600 shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-ink-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink-900 truncate">
                  {isParsingResume ? 'Reading your resume…' : resumeFile ? resumeFile.name : 'Choose PDF or DOCX'}
                </div>
                {resumeSummary && !isParsingResume && (
                  <div className="text-xs text-ink-500 truncate">{resumeSummary.headline || `Parsed for ${resumeSummary.candidateName}`}</div>
                )}
              </div>
              <input
                id="resume-upload-input"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleResumeUpload(file);
                }}
              />
            </label>
            {resumeParseError && (
              <p className="text-xs text-red-600 font-semibold">{resumeParseError}</p>
            )}
          </div>

          {/* Focus Dropdown — populated once resume is parsed */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">What should the interviewer ask about?</label>
            <select
              value={selectedFocusId}
              onChange={e => setSelectedFocusId(e.target.value)}
              disabled={!resumeSummary}
              className="w-full p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!resumeSummary && <option value="">Upload a resume first</option>}
              {resumeSummary?.focusOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-accent-50/70 border border-accent-200/80 rounded-2xl space-y-2 text-xs text-accent-950">
            <div className="font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-accent-600" /> Real-time HUD Analytics Active
            </div>
            <p>
              Camera & Microphone will monitor posture stability, articulation pace, and technical vocabulary usage during the session.
            </p>
          </div>

          <button
            onClick={handleStartSession}
            disabled={!resumeSummary || isParsingResume}
            className="w-full bg-accent-600 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-accent-200"
          >
            <Play className="w-4 h-4" /> Begin AI Interview Session
          </button>
        </div>
      ) : (
        /* Active Interview Stage */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-ink-900 text-white p-5 px-7 rounded-3xl shadow-xl border border-ink-800">
            <div>
              <span className="text-[10px] font-mono text-accent-300 font-bold uppercase tracking-wider">
                Step {currentStep} of 4 • Progressive Interview
              </span>
              <h2 className="text-lg font-bold">{selectedRole}</h2>
            </div>
            <button
              onClick={() => setSessionStarted(false)}
              className="text-xs text-ink-400 hover:text-white transition-colors"
            >
              Cancel Session
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Animated AI Interviewer Visual Face */}
            <div className="bg-ink-950 rounded-3xl border border-ink-800 p-8 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden min-h-[380px] shadow-xl">
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse"></span>
                AI Interviewer Face
              </div>

              {/* Visual Avatar Pulse */}
              <div className="relative pt-4">
                <div className={`w-36 h-36 rounded-full bg-gradient-to-tr from-accent-950 to-ink-900 border-4 ${isAiSpeaking ? 'border-accent-400 scale-105 shadow-accent-500/30 shadow-2xl' : 'border-ink-800'} transition-all flex items-center justify-center shadow-2xl`}>
                  <Bot className={`w-16 h-16 ${isAiSpeaking ? 'text-accent-400 animate-pulse' : 'text-ink-400'}`} />
                </div>
                {isAiSpeaking && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent-600 text-white px-3.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 shadow-md">
                    <Volume2 className="w-3 h-3 animate-bounce" /> Speaking
                  </div>
                )}
              </div>

              {/* Current Question Display */}
              <div className="space-y-2 max-w-md">
                <span className="text-[10px] font-mono font-bold text-ink-400 uppercase tracking-widest">Current Question</span>
                <p className="text-base font-semibold text-white leading-relaxed">
                  "{currentQuestionText}"
                </p>
              </div>
            </div>

            {/* Right: Candidate Live Camera & Response Box */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Camera Tile */}
              <div className="relative aspect-video bg-ink-900 rounded-3xl overflow-hidden border border-ink-800 shadow-sm">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* HUD Overlay */}
                <div className="absolute top-3 right-3 bg-ink-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono text-accent-300 space-y-0.5 border border-white/10">
                  {trackingError ? (
                    <div className="text-ink-400">Tracking unavailable</div>
                  ) : (
                    <>
                      <div>Eye Contact: <strong>{eyeContactPct === null ? '—' : `${eyeContactPct}%`}</strong></div>
                      <div>Posture: <strong>{postureLabel}</strong></div>
                    </>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 bg-ink-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                  You (Candidate Camera)
                </div>
              </div>

              {/* Answer Input */}
              <div className="bg-white border border-ink-200/90 rounded-3xl p-6 shadow-sm space-y-3">
                <label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Your Spoken / Written Answer</label>
                <textarea
                  rows={3}
                  placeholder="Record speech or type your response here..."
                  value={userAnswerInput}
                  onChange={e => setUserAnswerInput(e.target.value)}
                  className="w-full p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-xs text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs"
                ></textarea>

                {currentFeedback && (
                  <div className="p-3.5 bg-accent-50 border border-accent-200/80 rounded-2xl text-xs text-accent-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[10px] font-mono text-accent-700 uppercase">AI Real-time Feedback</strong>
                      <span>{currentFeedback}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-mono text-ink-400">Step {currentStep} / 4</span>
                  <button
                    onClick={handleNextStep}
                    disabled={!userAnswerInput.trim() || isGenerating}
                    className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-md shadow-accent-200"
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
