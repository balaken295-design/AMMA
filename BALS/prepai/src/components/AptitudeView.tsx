import React, { useState } from 'react';
import { VERBAL_TOPICS, LOGICAL_TOPICS, QUANTS_TOPICS, SAMPLE_QUESTIONS, getTopicQuestions } from '../data/aptitudeData';
import { TopicItem, Question, UserProfile } from '../types';
import { BookOpen, CheckCircle, Clock, Play, HelpCircle, ArrowLeft, Award, Sparkles, Search, ChevronRight, FileText } from 'lucide-react';

interface AptitudeViewProps {
  initialCategory?: 'verbal' | 'logical' | 'quants';
  userProfile?: UserProfile;
  onAddXP?: (xpAmount: number, domain?: string, scorePercent?: number) => void;
}

export const AptitudeView: React.FC<AptitudeViewProps> = ({ 
  initialCategory = 'verbal', 
  userProfile, 
  onAddXP 
}) => {
  const [activeCategory, setActiveCategory] = useState<'verbal' | 'logical' | 'quants'>(initialCategory);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const [viewMode, setViewMode] = useState<'learn' | 'test' | 'module_test'>('learn');
  const [searchQuery, setSearchQuery] = useState('');

  // Test state
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Category topics mapping
  const categoryTopicsMap = {
    verbal: VERBAL_TOPICS,
    logical: LOGICAL_TOPICS,
    quants: QUANTS_TOPICS,
  };

  const currentTopics = categoryTopicsMap[activeCategory].filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startTopicTest = async (topic: TopicItem) => {
    setSelectedTopic(topic);
    setViewMode('test');
    setTestSubmitted(false);
    setUserAnswers({});
    setIsLoadingQuestions(true);

    // Topic test generates 20 deep gaming questions
    try {
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle: topic.title, category: topic.category, count: 20, domain: selectedDomain }),
      });
      const data = await res.json();
      if (data.success && data.questions && data.questions.length >= 20) {
        setCurrentQuestions(data.questions);
      } else if (data.success && data.questions && data.questions.length > 0) {
        const filled = [...data.questions];
        const extra = getTopicQuestions(topic.id, topic.title, 20, selectedDomain);
        extra.forEach(q => {
          if (filled.length < 20 && !filled.some(f => f.question === q.question)) {
            filled.push(q);
          }
        });
        setCurrentQuestions(filled);
      } else {
        const fallbacks = getTopicQuestions(topic.id, topic.title, 20, selectedDomain);
        setCurrentQuestions(fallbacks);
      }
    } catch {
      const fallbacks = getTopicQuestions(topic.id, topic.title, 20, selectedDomain);
      setCurrentQuestions(fallbacks);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const startModuleTest = async () => {
    setSelectedTopic(null);
    setViewMode('module_test');
    setTestSubmitted(false);
    setUserAnswers({});
    setIsLoadingQuestions(true);

    const categoryTitle = activeCategory === 'verbal' ? 'Verbal Aptitude Overall' : activeCategory === 'logical' ? 'Logical Aptitude Overall' : 'Quantitative Aptitude Overall';

    // Overall Topic Module Test generates 30 deep gaming questions
    try {
      const res = await fetch('/api/gemini/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle: categoryTitle, category: activeCategory, count: 30, domain: selectedDomain }),
      });
      const data = await res.json();
      if (data.success && data.questions && data.questions.length >= 30) {
        setCurrentQuestions(data.questions);
      } else {
        setCurrentQuestions(getTopicQuestions('module_test', categoryTitle, 30, selectedDomain));
      }
    } catch {
      setCurrentQuestions(getTopicQuestions('module_test', categoryTitle, 30, selectedDomain));
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (testSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }));
  };

  const [selectedDomain, setSelectedDomain] = useState<'All' | 'Finance' | 'HR' | 'Marketing' | 'Business Analytics' | 'Operations' | 'Strategy'>('All');

  const handleSubmitTest = async () => {
    let score = 0;
    currentQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        score += 1;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);

    const scorePercent = Math.round((score / currentQuestions.length) * 100);
    const xpEarned = score * 50;

    if (onAddXP) {
      onAddXP(xpEarned, selectedDomain !== 'All' ? selectedDomain : undefined, scorePercent);
    }

    // Save score to MongoDB Atlas / Backend
    try {
      await fetch('/api/db/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: userProfile ? userProfile.name : "MBA Candidate",
          topicId: selectedTopic ? selectedTopic.id : 'module_test',
          topicTitle: selectedTopic ? selectedTopic.title : `${activeCategory.toUpperCase()} Module Test`,
          score: score,
          totalQuestions: currentQuestions.length,
          category: activeCategory,
          domain: selectedDomain
        })
      });
    } catch (err) {
      console.warn("Failed to save score to MongoDB Atlas:", err);
    }
  };

  return (
    <div id="aptitude-module-container" className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Gaming Model Player HUD Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-xl font-black font-mono shadow-md shadow-indigo-500/30">
            LVL {userProfile ? userProfile.level : 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                Player Rank: {userProfile ? userProfile.levelTitle : 'Intern Quest'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">⚡ 2x XP Combo</span>
            </div>
            <h2 className="text-lg font-black font-['Hanken_Grotesk',sans-serif] tracking-tight">MBA Executive Placement Quests</h2>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div className="text-center">
            <span className="text-slate-400 text-[10px]">TOTAL XP</span>
            <p className="text-base font-bold text-amber-400">{userProfile ? userProfile.xp : 0} XP</p>
          </div>
          <div className="text-center border-l border-slate-800 pl-6">
            <span className="text-slate-400 text-[10px]">DAY STREAK</span>
            <p className="text-base font-bold text-rose-400 flex items-center gap-1">
              🔥 {userProfile ? userProfile.streakDays : 0} Days
            </p>
          </div>
          <div className="text-center border-l border-slate-800 pl-6">
            <span className="text-slate-400 text-[10px]">READINESS INDEX</span>
            <p className="text-base font-bold text-emerald-400">{userProfile ? userProfile.readinessScore : 0}%</p>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div id="aptitude-category-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
            MBA Gaming Progression Engine
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2 font-['Hanken_Grotesk',sans-serif] tracking-tight">
            Aptitude Level Quests
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">
            20 questions per topic quest and 30 questions per overall module test. Earn XP, rank up, and unlock MD boardroom levels.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            onClick={() => { setActiveCategory('verbal'); setSelectedTopic(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === 'verbal' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Verbal ({VERBAL_TOPICS.length})
          </button>
          <button
            onClick={() => { setActiveCategory('logical'); setSelectedTopic(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === 'logical' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Logical ({LOGICAL_TOPICS.length})
          </button>
          <button
            onClick={() => { setActiveCategory('quants'); setSelectedTopic(null); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === 'quants' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quantitative ({QUANTS_TOPICS.length})
          </button>
        </div>
      </div>

      {/* Main View Mode Logic */}
      {selectedTopic === null && viewMode !== 'module_test' ? (
        /* Topic List Screen */
        <div className="space-y-6">
          {/* Top Actions: Module Test Launch & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-7 rounded-3xl shadow-lg border border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                🎮 Boardroom Boss Challenge
              </span>
              <h2 className="text-2xl font-bold font-['Hanken_Grotesk',sans-serif]">
                Overall {activeCategory.toUpperCase()} Module Test (30 Questions)
              </h2>
              <p className="text-xs text-slate-300">
                30 comprehensive, gaming-level questions covering all topics in {activeCategory} aptitude across Intern to Managing Director levels.
              </p>
            </div>
            <button
              onClick={startModuleTest}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shrink-0 shadow-md"
            >
              <Award className="w-4 h-4" /> Launch Boss Quest (30 Qs)
            </button>
          </div>

          {/* MBA Domain Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider px-2">MBA Domain:</span>
              {(['All', 'Finance', 'HR', 'Marketing', 'Business Analytics', 'Operations', 'Strategy'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDomain(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDomain === d
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs">
              <Search className="w-4 h-4 absolute left-4 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeCategory} topics...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-xs"
              />
            </div>
          </div>

          {/* Grid of Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentTopics.map(topic => (
              <div
                key={topic.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                      20 Questions • Level Test
                    </span>
                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Level 1-4 Ready
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => { setSelectedTopic(topic); setViewMode('learn'); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Learn
                  </button>
                  <button
                    onClick={() => startTopicTest(topic)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" /> Test (20 Qs)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedTopic && viewMode === 'learn' ? (
        /* Learn Mode View */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedTopic(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {activeCategory} topics
          </button>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase font-bold">
                  Deep Concept Mastery
                </span>
                <h2 className="text-2xl font-bold text-slate-900 font-['Hanken_Grotesk',sans-serif]">
                  {selectedTopic.title}
                </h2>
                <p className="text-sm text-slate-600">{selectedTopic.description}</p>
              </div>

              <button
                onClick={() => startTopicTest(selectedTopic)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 self-start md:self-auto shadow-md"
              >
                <Play className="w-4 h-4" /> Start 10-Question Deep Test
              </button>
            </div>

            {/* Key Concepts */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Core Rules & Strategies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedTopic.concepts.map((concept, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <span className="font-mono text-xs font-bold text-indigo-600">Rule 0{idx + 1}</span>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">{concept}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulas if present */}
            {selectedTopic.keyFormulas && selectedTopic.keyFormulas.length > 0 && (
              <div className="space-y-3 bg-slate-900 text-white p-6 rounded-2xl shadow-inner">
                <h3 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
                  Key Formulas & Shortcuts
                </h3>
                <div className="flex flex-wrap gap-3">
                  {selectedTopic.keyFormulas.map((f, idx) => (
                    <span key={idx} className="font-mono text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Solved Examples */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                Worked Example & Solution
              </h3>
              {selectedTopic.examples.map((ex, idx) => (
                <div key={idx} className="border border-slate-200/80 rounded-2xl p-5 space-y-3 bg-slate-50/50">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">Question</span>
                    <p className="text-sm font-bold text-slate-900">{ex.question}</p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Solution & Logic</span>
                    <p className="text-xs text-slate-700 leading-relaxed">{ex.solution}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-200/60 rounded-xl text-xs text-indigo-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Pro Tip:</strong> {ex.tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Test Engine View (Topic Test or Module Test) */
        <div className="space-y-6">
          <button
            onClick={() => { setSelectedTopic(null); setViewMode('learn'); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Test Mode
          </button>

          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {viewMode === 'module_test' ? 'Module Final Test' : 'Topic Test'}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2 font-['Hanken_Grotesk',sans-serif]">
                  {viewMode === 'module_test' ? `${activeCategory.toUpperCase()} Overall Test` : selectedTopic?.title}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-500">Questions</span>
                <p className="text-sm font-bold font-mono text-slate-900">{currentQuestions.length} Questions</p>
              </div>
            </div>

            {isLoadingQuestions ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-600 font-medium">Generating AI test questions...</p>
              </div>
            ) : currentQuestions.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No questions available for this topic yet.
              </div>
            ) : (
              <div className="space-y-8">
                {currentQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="p-5 border border-slate-200/80 rounded-2xl space-y-4 bg-slate-50/40">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed">
                        {q.question}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                      {q.options.map((option, optIdx) => {
                        const isSelected = userAnswers[qIdx] === optIdx;
                        const isCorrect = q.correctAnswer === optIdx;

                        let btnStyle = "border-slate-200 bg-white text-slate-800 hover:border-indigo-300";
                        if (isSelected && !testSubmitted) {
                          btnStyle = "border-indigo-600 bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200";
                        }
                        if (testSubmitted) {
                          if (isCorrect) {
                            btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                          } else if (isSelected && !isCorrect) {
                            btnStyle = "border-rose-500 bg-rose-50 text-rose-900";
                          } else {
                            btnStyle = "border-slate-200 bg-white opacity-60";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            className={`p-3.5 rounded-xl border text-xs text-left transition-all ${btnStyle}`}
                          >
                            <span className="font-mono font-bold mr-2">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {testSubmitted && (
                      <div className="pl-9 pt-2 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
                        <p className="font-bold text-slate-900">Explanation:</p>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}

                {!testSubmitted ? (
                  <div className="pt-4 border-t border-slate-200 text-right">
                    <button
                      onClick={handleSubmitTest}
                      disabled={Object.keys(userAnswers).length === 0}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-200"
                    >
                      Submit Assessment & Grade
                    </button>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-4 text-center border border-slate-800 shadow-xl">
                    <h3 className="text-2xl font-bold font-['Hanken_Grotesk',sans-serif]">
                      Assessment Complete! Score: {testScore} / {currentQuestions.length}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                      {testScore / currentQuestions.length >= 0.7
                        ? "Excellent performance! You have mastered these key concepts."
                        : "Good attempt! Review the lesson formulas and try again to improve speed."}
                    </p>
                    <button
                      onClick={() => { setViewMode('learn'); setSelectedTopic(null); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all inline-block shadow-md"
                    >
                      Return to Curriculum
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
