export type AptitudeCategory = 'verbal' | 'logical' | 'quants';

export type MBADomain = 'Finance' | 'HR' | 'Marketing' | 'Business Analytics' | 'Operations' | 'Strategy';

export interface UserProfile {
  email: string;
  name: string;
  avatar: string;
  isLoggedIn: boolean;
  xp: number;
  level: number;
  levelTitle: string;
  streakDays: number;
  readinessScore: number; // 0 to 100%
  completedTests: number;
  completedInterviews: number;
  completedGDs: number;
  domainScores: {
    Finance: number;
    HR: number;
    Marketing: number;
    'Business Analytics': number;
    Operations: number;
    Strategy: number;
  };
}

export const INITIAL_USER_PROFILE: UserProfile = {
  email: '',
  name: 'MBA Candidate',
  avatar: '',
  isLoggedIn: false,
  xp: 0,
  level: 1,
  levelTitle: 'Intern Quest',
  streakDays: 0,
  readinessScore: 0,
  completedTests: 0,
  completedInterviews: 0,
  completedGDs: 0,
  domainScores: {
    Finance: 0,
    HR: 0,
    Marketing: 0,
    'Business Analytics': 0,
    Operations: 0,
    Strategy: 0
  }
};

export interface TopicItem {
  id: string;
  title: string;
  category: AptitudeCategory;
  description: string;
  concepts: string[];
  keyFormulas?: string[];
  examples: {
    question: string;
    solution: string;
    tip: string;
  }[];
}

export interface Question {
  id: string;
  topicId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TestResult {
  topicId: string;
  category: AptitudeCategory;
  score: number;
  totalQuestions: number;
  passed: boolean;
  timestamp: string;
}

export interface GDParticipant {
  id: string;
  socketId?: string;
  name: string;
  avatar: string;
  role: 'user' | 'ai' | 'peer';
  isSpeaking: boolean;
  micEnabled: boolean;
  videoEnabled: boolean;
}

export interface GDMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  aiInsight?: string;
}

export interface GDRoom {
  code: string;
  topic: string;
  category: string;
  mode: 'peer' | 'ai_assisted';
  participants: GDParticipant[];
  messages: GDMessage[];
  status: 'lobby' | 'active' | 'ended';
  timeRemaining: number;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'problem_solving';
  userAnswer?: string;
  aiFeedback?: string;
  metrics?: {
    communication: number;
    accuracy: number;
    confidence: number;
  };
}

export interface InterviewEvaluation {
  role: string;
  date: string;
  readinessScore: number;
  percentile: number;
  metrics: {
    communication: { score: number; note: string };
    technicalAccuracy: { score: number; note: string };
    bodyLanguage: { score: number; note: string };
    confidence: { score: number; note: string };
  };
  transcript: {
    id: string;
    question: string;
    answer: string;
    aiInsight: string;
  }[];
  nextSteps: {
    title: string;
    description: string;
    icon: string;
  }[];
  recommendedResources: {
    title: string;
    url: string;
  }[];
}
