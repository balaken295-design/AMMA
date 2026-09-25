import React, { useEffect, useRef, useState } from 'react';
import { InterviewQuestion, InterviewEvaluation, MBADomain, ResumeSummary, InterviewFocusOption } from '../types';
import { Video, VideoOff, Mic, MicOff, Sparkles, Bot, CheckCircle2, Volume2, Play, Upload, Loader2 } from 'lucide-react';
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const DOMAIN_OPTIONS: MBADomain[] = ['Finance', 'HR', 'Marketing', 'Business Analytics', 'Operations', 'Strategy'];
const STARTER_QUESTIONS = [
  'Tell me about yourself.',
  'What are your key strengths and weaknesses?',
  'Why should we hire you for this role?',
];
const STARTER_COUNT = STARTER_QUESTIONS.length;
const TOTAL_STEPS = STARTER_COUNT + 3;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const RESUME_API_TIMEOUT_MS = 30000;
const EYE_CONTACT_WINDOW = 30;

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
  return file.text();
}

function matrixToEuler(m: Float32Array | number[]) {
  const r00 = m[0], r10 = m[1];
  const r02 = m[8], r12 = m[9], r22 = m[10];
  const yaw = Math.atan2(r02, r22) * (180 / Math.PI);
  const pitch = Math.atan2(-r12, Math.sqrt(r02 * r02 + r22 * r22)) * (180 / Math.PI);
  const roll = Math.atan2(r10, r00) * (180 / Math.PI);
  return { yaw, pitch, roll };
}

interface AIInterviewViewProps { onCompleteInterview: (evaluation: InterviewEvaluation) => void; }

export const AIInterviewView: React.FC<AIInterviewViewProps> = ({ onCompleteInterview }) => {
  const [selectedDomain, setSelectedDomain] = useState<MBADomain>('Strategy');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeStatus, setResumeStatus] = useState('');
  const [resumeParseError, setResumeParseError] = useState<string | null>(null);
  const [resumeSummary, setResumeSummary] = useState<ResumeSummary | null>(null);
  const [selectedFocusId, setSelectedFocusId] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startedWithResume, setStartedWithResume] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [questionsHistory, setQuestionsHistory] = useState<InterviewQuestion[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [userAnswerInput, setUserAnswerInput] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [eyeContactPct, setEyeContactPct] = useState<number | null>(null);
  const [postureLabel, setPostureLabel] = useState('Calibrating…');
  const [trackingError, setTrackingError] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const answerBoxRef = useRef<HTMLTextAreaElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const eyeSamplesRef = useRef<boolean[]>([]);
  const lastDetectTimeRef = useRef(0);
  const lastHudRef = useRef({ eye: -1, posture: '' });
  const liveSocketRef = useRef<WebSocket | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const liveAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveAudioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const liveTranscriptBaseRef = useRef('');
  const liveInterimRef = useRef('');
  const liveCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveReadyRef = useRef(false);
  const liveSessionIdRef = useRef(0);

  const selectedFocus: InterviewFocusOption | undefined = resumeSummary?.focusOptions.find(f => f.id === selectedFocusId);
  const selectedRole = startedWithResume && resumeSummary
    ? `${selectedDomain} Interview — ${resumeSummary.candidateName}${targetCompany.trim() ? ` @ ${targetCompany.trim()}` : ''}`
    : `${selectedDomain} Interview${targetCompany.trim() ? ` @ ${targetCompany.trim()}` : ''}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const el = answerBoxRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const nextHeight = Math.min(Math.max(el.scrollHeight, 96), 360);
      el.style.height = `${nextHeight}px`;
      el.style.overflowY = el.scrollHeight > 360 ? 'auto' : 'hidden';
    }, 100);
    return (
    <div id="ai-interview-container" className="max-w-[1180px] mx-auto px-4 md:px-8 py-7">
      {!sessionStarted ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-6 border-b border-ink-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-accent-700">
                <span className="w-2 h-2 rounded-full bg-accent-600" />
                AI Interview Assessment
              </div>
              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-ink-950">
                Structured Interview Setup
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
                Configure the assessment once. The interviewer will adapt questions to your selected domain,
                resume evidence and target company.
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">Assessment mode</div>
              <div className="mt-1 text-sm font-bold text-ink-900">1-on-1 • Progressive</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6 items-start">
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm">
              <div className="px-6 py-5 border-b border-ink-100">
                <h2 className="text-sm font-bold text-ink-950">Assessment configuration</h2>
                <p className="mt-1 text-xs text-ink-500">Complete the fields relevant to your interview.</p>
              </div>

              <div className="p-6 space-y-6">
                <section className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-700">01 · Interview domain</label>
                    <p className="mt-1 text-xs text-ink-500">Choose the business area you want the questions to reflect.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DOMAIN_OPTIONS.map(domain => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => setSelectedDomain(domain)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                          selectedDomain === domain
                            ? 'bg-ink-900 border-ink-900 text-white shadow-sm'
                            : 'bg-white border-ink-200 text-ink-700 hover:border-accent-400 hover:bg-accent-50/30'
                        }`}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-700">02 · Resume evidence</label>
                    <p className="mt-1 text-xs text-ink-500">Recommended for questions based on your actual projects, skills and experience.</p>
                  </div>
                  <label
                    htmlFor="resume-upload-input"
                    className="group flex items-center gap-4 p-4 border border-dashed border-ink-300 rounded-xl cursor-pointer hover:border-accent-500 hover:bg-accent-50/20 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                      {isParsingResume ? <Loader2 className="w-5 h-5 text-accent-600 animate-spin" /> : resumeSummary ? <CheckCircle2 className="w-5 h-5 text-accent-600" /> : <Upload className="w-5 h-5 text-ink-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-ink-900 truncate">
                        {isParsingResume ? resumeStatus : resumeFile ? resumeFile.name : 'Upload PDF or DOCX resume'}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-500 truncate">
                        {resumeSummary ? (resumeSummary.headline || `Resume parsed for ${resumeSummary.candidateName}`) : 'Up to 5 MB · Text-based files recommended'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-700">Browse</span>
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
                  {resumeParseError && <p className="text-xs text-red-600 font-semibold">{resumeParseError}</p>}
                </section>

                {resumeSummary && (
                  <section className="space-y-3">
                    <div>
                      <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-700">03 · Resume focus</label>
                      <p className="mt-1 text-xs text-ink-500">These options are generated from the uploaded resume.</p>
                    </div>
                    <select
                      value={selectedFocusId}
                      onChange={e => setSelectedFocusId(e.target.value)}
                      className="w-full p-3.5 bg-white border border-ink-200 rounded-xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600"
                    >
                      {resumeSummary.focusOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </section>
                )}

                <section className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-700">{resumeSummary ? '04' : '03'} · Target company</label>
                    <p className="mt-1 text-xs text-ink-500">Optional. Later questions can include company-specific scenarios.</p>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. TCS, Infosys, Deloitte"
                    value={targetCompany}
                    onChange={e => setTargetCompany(e.target.value)}
                    className="w-full p-3.5 bg-white border border-ink-200 rounded-xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600"
                  />
                </section>

                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-ink-100">
                  <button
                    onClick={() => startInterview(true)}
                    disabled={!resumeSummary || isParsingResume}
                    className="flex-1 bg-ink-900 hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Begin with resume
                  </button>
                  <button
                    onClick={() => startInterview(false)}
                    disabled={isParsingResume}
                    className="flex-1 bg-white hover:bg-ink-50 text-ink-900 border border-ink-300 font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Start without resume
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="bg-ink-950 text-white rounded-2xl p-6 shadow-sm">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent-300">Assessment profile</div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">Domain</div>
                    <div className="mt-1 text-sm font-bold">{selectedDomain}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">Question source</div>
                    <div className="mt-1 text-sm font-bold">{resumeSummary ? 'Resume + domain + follow-ups' : 'Domain + progressive interview'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">Evaluation</div>
                    <div className="mt-1 text-sm font-bold">Technical · Communication · Confidence</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-400 uppercase tracking-wider">Camera analysis</div>
                    <div className="mt-1 text-sm font-bold">Eye contact · Posture</div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-ink-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-ink-900">
                  <CheckCircle2 className="w-4 h-4 text-accent-600" /> Before you begin
                </div>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-ink-600">
                  <li>• Allow microphone and camera access.</li>
                  <li>• Use a quiet room and, if possible, headphones.</li>
                  <li>• Speak naturally; the transcript appears live in the answer area.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink-200 pb-5">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-accent-700">
                AI Interview · Step {currentStep} of {TOTAL_STEPS}
              </div>
              <h1 className="mt-1 text-xl font-black text-ink-950">{selectedRole}</h1>
            </div>
            <button
              onClick={cancelSession}
              className="self-start md:self-auto px-4 py-2 rounded-xl border border-ink-200 bg-white text-xs font-bold text-ink-700 hover:bg-ink-50 transition-all"
            >
              Exit interview
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <section className="lg:col-span-2 bg-ink-950 rounded-2xl p-7 text-white min-h-[360px] flex flex-col justify-between border border-ink-800">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent-300">Interviewer</span>
                  {isAiSpeaking && <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-accent-300"><Volume2 className="w-3 h-3 animate-pulse" /> Speaking</span>}
                </div>
                <div className="mt-7 w-20 h-20 rounded-2xl bg-ink-900 border border-ink-700 flex items-center justify-center">
                  <Bot className={`w-10 h-10 ${isAiSpeaking ? 'text-accent-400' : 'text-ink-400'}`} />
                </div>
              </div>
              <div className="pt-8">
                <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">Current question</div>
                <p className="mt-2 text-lg font-semibold leading-7 text-white">“{currentQuestionText}”</p>
              </div>
            </section>

            <section className="lg:col-span-3">
              <div className="relative aspect-video bg-ink-950 rounded-2xl overflow-hidden border border-ink-800 shadow-sm">
                {videoEnabled ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-500"><VideoOff className="w-10 h-10" /></div>
                )}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-ink-950/85 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                  Candidate camera
                </div>
                <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-ink-950/85 text-[10px] font-mono text-accent-300 border border-white/10">
                  {trackingError ? 'Camera analysis unavailable' : `Eye contact ${eyeContactPct === null ? '—' : `${eyeContactPct}%`} · ${postureLabel}`}
                </div>
                <button type="button" onClick={() => setVideoEnabled(v => !v)} className="absolute bottom-3 right-3 bg-ink-950/85 text-white p-2.5 rounded-lg border border-white/10">
                  {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </section>
          </div>

          <section className="bg-white border border-ink-200 rounded-2xl shadow-sm">
            <div className="px-6 py-4 border-b border-ink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-700">Candidate response</div>
                <div className="mt-1 text-xs text-ink-500">Type or use live voice transcription. You remain in control of the text.</div>
              </div>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isListening
                      ? 'bg-danger-50 text-danger-700 border border-danger-200'
                      : 'bg-ink-900 text-white hover:bg-ink-800'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening ? 'Stop voice input' : 'Speak answer'}
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {speechError && (
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  speechError.includes('Listening') || speechError.includes('connected') || speechError.includes('Finalizing')
                    ? 'bg-accent-50 text-accent-800 border border-accent-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <Mic className="w-3.5 h-3.5 shrink-0" /> {speechError}
                </div>
              )}

              <textarea
                ref={answerBoxRef}
                rows={7}
                placeholder="Type your answer here, or select “Speak answer” to dictate naturally…"
                value={userAnswerInput}
                onChange={e => handleAnswerChange(e.target.value)}
                className="w-full min-h-[190px] max-h-[380px] resize-y p-5 bg-ink-50/70 border border-ink-200 rounded-xl text-sm text-ink-900 focus:outline-none focus:border-accent-600 leading-6"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-ink-400">
                  {userAnswerInput.trim() ? `${userAnswerInput.trim().split(/\s+/).length} words captured` : 'No response captured yet'}
                  {isListening && <span className="ml-2 text-accent-700 font-bold">· Live transcription</span>}
                </div>
                {currentFeedback && (
                  <div className="flex items-start gap-2 text-xs text-ink-600 max-w-xl">
                    <Sparkles className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
                    <span><strong className="text-ink-900">Feedback:</strong> {currentFeedback}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-ink-100">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-400">
                  Step {currentStep} / {TOTAL_STEPS}
                </span>
                <button
                  onClick={handleNextStep}
                  disabled={!userAnswerInput.trim() || isGenerating}
                  className="w-full sm:w-auto bg-accent-600 hover:bg-accent-500 disabled:opacity-40 text-white font-bold px-6 py-3.5 rounded-xl text-xs transition-all"
                >
                  {isGenerating ? 'Processing response…' : currentStep >= TOTAL_STEPS ? 'Finish & view evaluation' : 'Submit response & continue'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};