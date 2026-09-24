import React, { useEffect, useRef, useState } from 'react';
import { InterviewQuestion, InterviewEvaluation, MBADomain, ResumeSummary, InterviewFocusOption } from '../types';
import { Video, VideoOff, Mic, MicOff, Send, Sparkles, Award, Bot, CheckCircle2, Volume2, Activity, Play, Upload, Loader2 } from 'lucide-react';
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
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const ignoreSpeechResultsRef = useRef(false);
  const speechBaseRef = useRef('');
  const interimSpeechRef = useRef('');
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const eyeSamplesRef = useRef<boolean[]>([]);
  const lastDetectTimeRef = useRef(0);
  const lastHudRef = useRef({ eye: -1, posture: '' });
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechUiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSpeechTextRef = useRef<string | null>(null);
  const lastFinalChunkRef = useRef({ text: '', at: 0 });

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
    return () => window.clearTimeout(timer);
  }, [userAnswerInput]);

  // Low-latency browser speech recognition.
  // UI updates are frame-batched so frequent interim results do not cause a
  // React render for every partial word. Final fragments with very low browser
  // confidence are ignored to reduce obvious background-noise false positives.
  useEffect(() => {
    const SpeechRecognitionCtor: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      setSpeechError('Live voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMicEnabled(true);
      setSpeechError('Listening…');
    };

    recognition.onresult = (event: any) => {
      if (ignoreSpeechResultsRef.current) return;

      let finalChunk = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = String(result[0]?.transcript || '').trim();
        if (!transcript) continue;

        // Ignore very low-confidence final fragments when the browser exposes
        // confidence. This reduces accidental words caused by background noise
        // without blocking browsers that report confidence as 0.
        const confidence = Number(result[0]?.confidence || 0);
        if (result.isFinal && confidence > 0 && confidence < 0.35) continue;

        if (result.isFinal) finalChunk += transcript + ' ';
        else interim += transcript;
      }

      const normalizedFinal = finalChunk.trim().replace(/\s+/g, ' ');
      const now = performance.now();
      const repeatedFinal =
        normalizedFinal &&
        normalizedFinal.toLowerCase() === lastFinalChunkRef.current.text.toLowerCase() &&
        now - lastFinalChunkRef.current.at < 1800;

      // Chrome can occasionally emit the same final result again when a
      // continuous recognition session is restarted. Never append that
      // duplicate, otherwise one ambient word can flood the answer box.
      if (normalizedFinal && !repeatedFinal) {
        speechBaseRef.current = (speechBaseRef.current + ' ' + normalizedFinal).trim();
        lastFinalChunkRef.current = { text: normalizedFinal, at: now };
      }

      interimSpeechRef.current = interim;
      queueSpeechUi(speechBaseRef.current + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (event: any) => {
      console.warn('AI Interview speech recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
        setMicEnabled(false);
        setSpeechError('Microphone access was blocked. Allow microphone access for this site, then try again.');
      } else if (event.error === 'no-speech') {
        setSpeechError('Listening…');
      } else if (event.error === 'audio-capture') {
        setSpeechError('No microphone was found. Check your microphone and try again.');
      } else if (event.error === 'network') {
        setSpeechError('Speech recognition needs an internet connection.');
      } else {
        setSpeechError('Voice recognition encountered an error. Please try again.');
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        // Give the browser a short transition window before restarting. This
        // avoids start/stop race conditions that can add noticeable gaps.
        window.setTimeout(() => {
          if (!shouldListenRef.current) return;
          try { recognition.start(); } catch {}
        }, 25);
      } else {
        setIsListening(false);
        setMicEnabled(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      ignoreSpeechResultsRef.current = true;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch {}
      if (speechUiTimerRef.current !== null) clearTimeout(speechUiTimerRef.current);
      speechUiTimerRef.current = null;
      recognitionRef.current = null;
    };
  }, [selectedDomain, selectedFocus?.label, resumeSummary]);

  const prepareMicrophone = async () => {
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      // Request permission, then immediately release the temporary stream.
      // SpeechRecognition owns the actual microphone pipeline; keeping a second
      // stream open here can cause device contention and does not feed processed
      // audio into SpeechRecognition.
      permissionStream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.warn('Microphone permission check failed:', error);
      setSpeechError('Microphone access is required for voice input. Allow microphone access and try again.');
      return false;
    }
  };

  const toggleMic = async () => {
    if (!recognitionRef.current) return;

    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      ignoreSpeechResultsRef.current = true;
      try { recognitionRef.current?.abort(); } catch {}
      speechBaseRef.current = userAnswerInput.trim();
      interimSpeechRef.current = '';
      lastFinalChunkRef.current = { text: '', at: 0 };
      setUserAnswerInput(speechBaseRef.current);
      setIsListening(false);
      setMicEnabled(false);
      setSpeechError(null);
      return;
    }

    const micReady = await prepareMicrophone();
    if (!micReady) return;

    // Capture the current editable text as the base. Voice recognition only
    // appends new speech to this value, so deleting old words is never undone.
    speechBaseRef.current = userAnswerInput.trim();
    interimSpeechRef.current = '';
    lastFinalChunkRef.current = { text: '', at: 0 };
    ignoreSpeechResultsRef.current = false;
    shouldListenRef.current = true;
    setSpeechError('Listening…');

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setMicEnabled(true);
    } catch (error) {
      console.warn('Speech recognition start failed:', error);
      shouldListenRef.current = false;
      setIsListening(false);
      setMicEnabled(false);
      setSpeechError('Could not start voice recognition. Click Speak Answer again.');
    }
  };

  // Keep the speech base synchronized with manual edits while not actively
  // showing an interim recognition hypothesis. This preserves Backspace/editing.
  const handleAnswerChange = (value: string) => {
    // Manual typing, Backspace and Delete are authoritative even while
    // speech recognition is active.
    setUserAnswerInput(value);
    speechBaseRef.current = value;
    interimSpeechRef.current = '';
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;
    async function initTracking() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numFaces: 1, outputFacialTransformationMatrixes: true });
        if (cancelled) { landmarker.close(); return; }
        faceLandmarkerRef.current = landmarker;
        trackLoop();
      } catch (err) { console.warn('Face tracking failed to initialize:', err); setTrackingError(true); }
    }
    function trackLoop() {
      rafIdRef.current = requestAnimationFrame(trackLoop);
      const video = localVideoRef.current, landmarker = faceLandmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) return;
      const now = performance.now();
      if (now - lastDetectTimeRef.current < 320) return;
      lastDetectTimeRef.current = now;
      let result: FaceLandmarkerResult;
      try { result = landmarker.detectForVideo(video, now); } catch { return; }
      const matrix = result.facialTransformationMatrixes?.[0]?.data;
      if (!matrix) { if (lastHudRef.current.posture !== 'Face not detected') { lastHudRef.current.posture = 'Face not detected'; setPostureLabel('Face not detected'); } return; }
      const { yaw, pitch, roll } = matrixToEuler(matrix);
      const lookingAtCamera = Math.abs(yaw) < 15 && Math.abs(pitch) < 12;
      const samples = eyeSamplesRef.current;
      samples.push(lookingAtCamera); if (samples.length > EYE_CONTACT_WINDOW) samples.shift();
      const pct = Math.round(samples.filter(Boolean).length / samples.length * 100);
      let label = 'Optimal';
      if (Math.abs(roll) > 15) label = 'Tilted'; else if (pitch < -15) label = 'Slouching'; else if (pitch > 20) label = 'Leaning back';
      if (lastHudRef.current.eye !== pct) { lastHudRef.current.eye = pct; setEyeContactPct(pct); }
      if (lastHudRef.current.posture !== label) { lastHudRef.current.posture = label; setPostureLabel(label); }
    }
    async function initCam() {
      try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; } activeStream = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream; await initTracking(); }
      catch (err) { console.warn('Camera not accessible:', err); setTrackingError(true); }
    }
    if (sessionStarted) { eyeSamplesRef.current = []; lastHudRef.current = { eye: -1, posture: '' }; setEyeContactPct(null); setPostureLabel('Calibrating…'); setTrackingError(false); initCam(); }
    return () => { cancelled = true; if (activeStream) activeStream.getTracks().forEach(t => t.stop()); if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; if (faceLandmarkerRef.current) faceLandmarkerRef.current.close(); faceLandmarkerRef.current = null; };
  }, [sessionStarted]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Never let the candidate recorder remain active while the AI interviewer
    // is speaking. This prevents the interviewer's voice from being transcribed
    // as part of the candidate's answer.
    if (shouldListenRef.current) {
      shouldListenRef.current = false;
      ignoreSpeechResultsRef.current = true;
      try { recognitionRef.current?.abort(); } catch {}
      setIsListening(false);
      setMicEnabled(false);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file); setResumeSummary(null); setSelectedFocusId(''); setResumeParseError(null); setIsParsingResume(true); setResumeStatus('Checking file…');
    try {
      if (file.size > MAX_RESUME_SIZE) throw new Error('FILE_TOO_LARGE');
      const lowerName = file.name.toLowerCase();
      const supported = lowerName.endsWith('.pdf') || lowerName.endsWith('.docx') || file.type === 'application/pdf' || file.type.includes('wordprocessingml');
      if (!supported) throw new Error('UNSUPPORTED_FILE');
      setResumeStatus('Reading your resume…');
      const resumeText = await extractResumeText(file);
      if (!resumeText.trim()) throw new Error('EMPTY_RESUME');
      setResumeStatus('Analyzing your resume with AI…');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RESUME_API_TIMEOUT_MS);
      let res: Response;
      try { res = await fetch('/api/gemini/resume-parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ resumeText, domain: selectedDomain }) }); } finally { clearTimeout(timeoutId); }
      if (!res.ok) { const serverMessage = await res.text().catch(() => ''); console.error('Resume API error:', res.status, serverMessage); throw new Error(`API_${res.status}`); }
      const data = await res.json();
      if (!data.success || !data.resumeSummary) { console.error('Resume parse response:', data); throw new Error('AI_PARSE_FAILED'); }
      setResumeSummary(data.resumeSummary); const firstOption = data.resumeSummary.focusOptions?.[0]; if (firstOption) setSelectedFocusId(firstOption.id); setResumeStatus('Resume ready ✓');
    } catch (err: any) {
      console.error('Resume processing failed:', err);
      const message = err?.name === 'AbortError' ? 'Resume was read, but AI processing took too long. Please try again.' : err?.message === 'FILE_TOO_LARGE' ? 'Please upload a resume smaller than 5 MB.' : err?.message === 'UNSUPPORTED_FILE' ? 'Please upload a PDF or DOCX resume.' : err?.message === 'EMPTY_RESUME' ? 'No readable text was found in this resume.' : err?.message?.startsWith('API_') ? `Resume was read, but the AI service returned an error (${err.message.replace('API_', '')}).` : 'The resume could not be processed. Please try another text-based PDF or DOCX.';
      setResumeParseError(message); setResumeStatus('Resume processing failed');
    } finally { setIsParsingResume(false); }
  };

  const startInterview = async (withResume: boolean) => {
    if (withResume && !resumeSummary) return;

    setStartedWithResume(withResume);
    setSessionStarted(true);
    setCurrentStep(1);
    setQuestionsHistory([]);
    setUserAnswerInput('');
    speechBaseRef.current = '';
    interimSpeechRef.current = '';
    ignoreSpeechResultsRef.current = false;
    setCurrentFeedback(null);

    // Without a resume we keep the three standard opening questions.
    // With a resume, even the first question is generated from the candidate's
    // actual resume + selected MBA domain so the session does not begin with
    // generic Finance/HR/Marketing theory.
    if (!withResume) {
      const firstQuestion = STARTER_QUESTIONS[0];
      setCurrentQuestionText(firstQuestion);
      speakText(firstQuestion);
      return;
    }

    setIsGenerating(true);
    try {
      const endpoint = targetCompany.trim() ? '/api/gemini/interview-step' : '/api/gemini/interview-step';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          resumeSummary,
          focusLabel: selectedFocus?.label,
          focusInstruction: selectedFocus?.instruction,
          targetCompany: targetCompany.trim(),
          stepNumber: 1,
          previousQuestions: [],
          userAnswer: '',
        }),
      });
      const data = await res.json();
      if (!data.success || !data.nextQuestion) throw new Error('resume question generation failed');
      setCurrentQuestionText(data.nextQuestion);
      setCurrentFeedback(null);
      speakText(data.nextQuestion);
    } catch {
      const resumeProject = resumeSummary?.projects?.[0]?.name;
      const resumeExperience = resumeSummary?.experience?.[0];
      const fallbackQuestion = resumeProject
        ? `I can see ${resumeProject} on your resume. Walk me through what you personally worked on, the main challenge you faced, and the result.`
        : resumeExperience
          ? `You worked as ${resumeExperience.roleTitle} at ${resumeExperience.company}. What was your most important responsibility there, and how did you measure the outcome?`
          : `Looking at your resume, which experience or skill best demonstrates your ability in ${selectedDomain}, and what evidence can you give me?`;
      setCurrentQuestionText(fallbackQuestion);
      speakText(fallbackQuestion);
    } finally {
      setIsGenerating(false);
    }
  };

  const getFallbackEvaluation = (history: InterviewQuestion[] = []): InterviewEvaluation => ({ role: selectedRole, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), readinessScore: 0, metrics: { communication: { score: 0, note: 'Evaluation unavailable — AI service did not respond.' }, technicalAccuracy: { score: 0, note: 'Evaluation unavailable — AI service did not respond.' }, bodyLanguage: { score: 0, available: false, note: 'Not evaluated — AI service did not respond.' }, confidence: { score: 0, note: 'Evaluation unavailable — AI service did not respond.' } }, transcript: history.map((q, i) => ({ id: String(i + 1), question: q.question, answer: q.userAnswer || '', aiInsight: 'N/A' })), nextSteps: [], recommendedResources: [] });

  const handleNextStep = async () => {
    if (!userAnswerInput.trim() || isGenerating) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    shouldListenRef.current = false;
    ignoreSpeechResultsRef.current = true;
    speechBaseRef.current = '';
    interimSpeechRef.current = '';
    try { recognitionRef.current?.abort(); } catch {}
    setIsListening(false); setIsGenerating(true);
    const newHistoryItem: InterviewQuestion = { id: currentStep, question: currentQuestionText, category: 'technical', userAnswer: userAnswerInput.trim(), aiFeedback: currentFeedback || undefined };
    const updatedHistory = [...questionsHistory, newHistoryItem]; setQuestionsHistory(updatedHistory); setUserAnswerInput('');
    speechBaseRef.current = '';
    interimSpeechRef.current = '';
    if (currentStep >= TOTAL_STEPS) {
      try { const res = await fetch('/api/gemini/interview-evaluation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          role: selectedRole,
          domain: selectedDomain,
          resumeSummary: startedWithResume ? resumeSummary : null,
          qaPairs: updatedHistory,
          behaviorMetrics: {
            trackingAvailable: !trackingError && eyeContactPct !== null,
            eyeContactPct,
            postureLabel,
          },
        }) }); const data = await res.json(); const evaluation = data.success && data.evaluation ? data.evaluation : getFallbackEvaluation(updatedHistory); fetch('/api/db/save-interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateName: startedWithResume && resumeSummary?.candidateName ? resumeSummary.candidateName : 'MBA Candidate', role: selectedRole, evaluation }) }).catch(e => console.warn('Save interview score error:', e)); onCompleteInterview(evaluation); } catch { onCompleteInterview(getFallbackEvaluation(updatedHistory)); } finally { setIsGenerating(false); }
      return;
    }
    const nextStepNum = currentStep + 1;
    setCurrentStep(nextStepNum);

    // Resume sessions use the AI-generated interview path from step 1 onward.
    // Non-resume sessions retain the standard opening questions.
    if (!startedWithResume && nextStepNum <= STARTER_COUNT) {
      const fixedQ = STARTER_QUESTIONS[nextStepNum - 1];
      setCurrentQuestionText(fixedQ);
      setCurrentFeedback(null);
      speakText(fixedQ);
      setIsGenerating(false);
      return;
    }

    // If a target company was supplied, use company-specific questions only
    // after the first three resume/domain questions.
    const useCompanyRound = Boolean(targetCompany.trim()) && (!startedWithResume || nextStepNum > STARTER_COUNT);
    const endpoint = useCompanyRound ? '/api/gemini/company-interview-step' : '/api/gemini/interview-step';
    const stepForEndpoint = useCompanyRound && startedWithResume
      ? nextStepNum - STARTER_COUNT
      : nextStepNum;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          resumeSummary: startedWithResume ? resumeSummary : null,
          focusLabel: startedWithResume ? selectedFocus?.label : undefined,
          focusInstruction: startedWithResume ? selectedFocus?.instruction : undefined,
          targetCompany: targetCompany.trim(),
          stepNumber: stepForEndpoint,
          previousQuestions: updatedHistory,
          userAnswer: newHistoryItem.userAnswer,
        }),
      });
      const data = await res.json();
      if (data.success && data.nextQuestion) {
        setCurrentQuestionText(data.nextQuestion);
        setCurrentFeedback(data.feedback || null);
        speakText(data.nextQuestion);
      } else throw new Error('question generation failed');
    } catch {
      const resumeProject = resumeSummary?.projects?.[0]?.name;
      const resumeExperience = resumeSummary?.experience?.[0];
      const fallbackQ = startedWithResume
        ? resumeProject
          ? `Going deeper on ${resumeProject}: what technical or business decision did you personally make, and what was the result?`
          : resumeExperience
            ? `In your work at ${resumeExperience.company}, what was the hardest problem you handled and how did you solve it?`
            : `Which part of your resume best demonstrates your ${selectedDomain} skills, and what evidence supports that?`
        : targetCompany.trim()
          ? `What do you know about ${targetCompany.trim()}'s recent strategy or products, and why does it appeal to you?`
          : 'How would you handle a conflict within your team regarding an important business decision?';
      setCurrentQuestionText(fallbackQ);
      setCurrentFeedback(null);
      speakText(fallbackQ);
    } finally {
      setIsGenerating(false);
    }
  };

  // Voice recognition stays active until the user taps the mic button again.
  // We intentionally do not auto-submit after silence so a natural pause does not
  // prematurely end an interview answer.

  const cancelSession = () => {
    shouldListenRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsListening(false);
    setMicEnabled(false);
    setSessionStarted(false);
    setUserAnswerInput('');
    speechBaseRef.current = '';
    interimSpeechRef.current = '';
  };

  return (
    <div id="ai-interview-container" className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {!sessionStarted ? (
        <div className="max-w-xl mx-auto bg-white border border-ink-200/90 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2"><span className="font-mono text-xs text-accent-600 bg-accent-50 px-3.5 py-1 rounded-full uppercase font-bold tracking-wider">Step-by-Step AI Simulation</span><h1 className="text-3xl font-black text-ink-900 tracking-tight">1-on-1 AI Face Interviewer</h1><p className="text-sm text-ink-600">Engage with an interactive AI Interviewer who asks progressive role-based questions and evaluates technical accuracy and speech tone.</p></div>
          <div className="space-y-2"><label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Interview Domain</label><div className="flex flex-wrap gap-2">{DOMAIN_OPTIONS.map(domain => <button key={domain} type="button" onClick={() => setSelectedDomain(domain)} className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${selectedDomain === domain ? 'bg-accent-600 border-accent-600 text-white shadow-md shadow-accent-200' : 'bg-ink-50 border-ink-200/80 text-ink-700 hover:border-accent-400'}`}>{domain}</button>)}</div></div>
          <div className="space-y-2 p-4 bg-ink-50 border border-ink-200/80 rounded-2xl"><label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Target Company (optional)</label><p className="text-xs text-ink-500">Enter the company you're interviewing with — the AI will tailor later questions to it.</p><input type="text" placeholder="e.g. TCS, Infosys, Zomato, Deloitte" value={targetCompany} onChange={e => setTargetCompany(e.target.value)} className="w-full p-3.5 bg-white border border-ink-200/80 rounded-2xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs" /></div>
          <div className="space-y-2"><label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Upload Your Resume <span className="text-ink-400 font-normal">(optional)</span></label><p className="text-xs text-ink-500">Upload a PDF or DOCX to tailor questions to your experience, or start without one.</p><label htmlFor="resume-upload-input" className="w-full flex items-center gap-3 p-4 bg-ink-50 border border-dashed border-ink-300 rounded-2xl cursor-pointer hover:border-accent-500 transition-colors">{isParsingResume ? <Loader2 className="w-5 h-5 text-accent-600 animate-spin shrink-0" /> : resumeSummary ? <CheckCircle2 className="w-5 h-5 text-accent-600 shrink-0" /> : <Upload className="w-5 h-5 text-ink-400 shrink-0" />}<div className="min-w-0 flex-1"><div className="text-sm font-semibold text-ink-900 truncate">{isParsingResume ? resumeStatus : resumeFile ? resumeFile.name : 'Choose PDF or DOCX'}</div>{resumeSummary && !isParsingResume && <div className="text-xs text-ink-500 truncate">{resumeSummary.headline || `Parsed for ${resumeSummary.candidateName}`}</div>}</div><input id="resume-upload-input" type="file" accept=".pdf,.docx" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleResumeUpload(file); }} /></label>{resumeParseError && <p className="text-xs text-red-600 font-semibold">{resumeParseError}</p>}</div>
          <div className="space-y-2"><label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">What should the interviewer ask about?</label><select value={selectedFocusId} onChange={e => setSelectedFocusId(e.target.value)} disabled={!resumeSummary} className="w-full p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-sm font-semibold text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed">{!resumeSummary && <option value="">Upload a resume to enable resume-focused questions</option>}{resumeSummary?.focusOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
          <div className="p-4 bg-accent-50/70 border border-accent-200/80 rounded-2xl space-y-2 text-xs text-accent-950"><div className="font-bold flex items-center gap-1.5"><Activity className="w-4 h-4 text-accent-600" /> Real-time HUD Analytics Active</div><p>Camera monitors posture stability and eye-contact proxy during the session. Live voice recognition fills the answer box automatically when you tap Speak Answer.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><button onClick={() => startInterview(true)} disabled={!resumeSummary || isParsingResume} className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-accent-200"><Play className="w-4 h-4" /> Begin With Resume</button><button onClick={() => startInterview(false)} disabled={isParsingResume} className="bg-white hover:bg-ink-50 text-ink-800 border border-ink-300 font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Start Without Resume</button></div>
          <p className="text-center text-[10px] text-ink-400">You can start immediately without a resume; resume upload is only needed for resume-tailored questions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-ink-900 text-white p-5 px-7 rounded-3xl shadow-xl border border-ink-800"><div><span className="text-[10px] font-mono text-accent-300 font-bold uppercase tracking-wider">Step {currentStep} of {TOTAL_STEPS} • Progressive Interview</span><h2 className="text-lg font-bold">{selectedRole}</h2></div><button onClick={cancelSession} className="text-xs text-ink-400 hover:text-white transition-colors">Cancel Session</button></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-ink-950 rounded-3xl border border-ink-800 p-8 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden min-h-[380px] shadow-xl"><div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30 text-xs font-mono font-bold"><span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />AI Interviewer Face</div><div className="relative pt-4"><div className={`w-36 h-36 rounded-full bg-gradient-to-tr from-accent-950 to-ink-900 border-4 ${isAiSpeaking ? 'border-accent-400 scale-105 shadow-accent-500/30 shadow-2xl' : 'border-ink-800'} transition-all flex items-center justify-center shadow-2xl`}><Bot className={`w-16 h-16 ${isAiSpeaking ? 'text-accent-400 animate-pulse' : 'text-ink-400'}`} /></div>{isAiSpeaking && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent-600 text-white px-3.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 shadow-md"><Volume2 className="w-3 h-3 animate-bounce" /> Speaking</div>}</div><div className="space-y-2 max-w-md"><span className="text-[10px] font-mono font-bold text-ink-400 uppercase tracking-widest">Current Question</span><p className="text-base font-semibold text-white leading-relaxed">"{currentQuestionText}"</p></div></div>
            <div className="space-y-4 flex flex-col justify-between"><div className="relative aspect-video bg-ink-900 rounded-3xl overflow-hidden border border-ink-800 shadow-sm">{videoEnabled ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-ink-400"><VideoOff className="w-10 h-10" /></div>}<div className="absolute top-3 right-3 bg-ink-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono text-accent-300 space-y-0.5 border border-white/10">{trackingError ? <div className="text-ink-400">Tracking unavailable</div> : <><div>Eye Contact: <strong>{eyeContactPct === null ? '—' : `${eyeContactPct}%`}</strong></div><div>Posture: <strong>{postureLabel}</strong></div></>}</div><div className="absolute bottom-3 left-3 bg-ink-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">You (Candidate Camera)</div><button type="button" onClick={() => setVideoEnabled(v => !v)} className="absolute bottom-3 right-3 bg-ink-900/80 text-white p-2 rounded-xl">{videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}</button></div>
              <div className="bg-white border border-ink-200/90 rounded-3xl p-6 shadow-sm space-y-3"><div className="flex items-center justify-between gap-3"><label className="text-xs font-mono font-bold text-ink-700 uppercase tracking-wider">Your Spoken / Written Answer</label>{speechSupported && <button type="button" onClick={toggleMic} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isListening ? 'bg-danger-50 text-danger-600 border border-danger-200 animate-pulse' : 'bg-accent-50 text-accent-700 border border-accent-200 hover:border-accent-400'}`}>{isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}{isListening ? 'Stop Listening' : 'Speak Answer'}</button>}</div>{speechError && <p className={`text-[10px] font-semibold ${speechError === 'Listening…' ? 'text-accent-600' : 'text-red-600'}`}>{speechError}</p>}<textarea ref={answerBoxRef} rows={3} placeholder="Speak or type your response here. You can edit or use Backspace anytime…" value={userAnswerInput} onChange={e => handleAnswerChange(e.target.value)} className="w-full min-h-[96px] max-h-[360px] resize-none p-3.5 bg-ink-50 border border-ink-200/80 rounded-2xl text-xs text-ink-900 focus:outline-none focus:border-accent-600 shadow-xs leading-relaxed" /><div className="flex items-center justify-between text-[10px] text-ink-400"><span>{userAnswerInput.trim() ? `${userAnswerInput.trim().split(/\s+/).length} words` : 'Start speaking or typing'}</span>{isListening && <span className="text-accent-600 font-semibold">Listening live — your words appear here automatically</span>}</div>{!speechSupported && <p className="text-[10px] text-ink-400">Voice input isn't supported in this browser — try Chrome/Edge, or type your answer.</p>}{currentFeedback && <div className="p-3.5 bg-accent-50 border border-accent-200/80 rounded-2xl text-xs text-accent-950 flex items-start gap-2"><Sparkles className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" /><div><strong className="block text-[10px] font-mono text-accent-700 uppercase">AI Real-time Feedback</strong><span>{currentFeedback}</span></div></div>}<div className="flex justify-between items-center pt-2 gap-3"><span className="text-[10px] font-mono text-ink-400">Step {currentStep} / {TOTAL_STEPS}</span><button onClick={handleNextStep} disabled={!userAnswerInput.trim() || isGenerating} className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-md shadow-accent-200">{isGenerating ? 'Processing...' : currentStep >= TOTAL_STEPS ? 'Finish & View Evaluation Report' : 'Submit Answer & Next Question'}</button></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
