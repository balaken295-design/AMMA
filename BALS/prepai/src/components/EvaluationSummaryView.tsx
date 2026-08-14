import React, { useState } from 'react';
import { InterviewEvaluation } from '../types';
import { Download, Share2, Star, Mic, Code, UserCheck, Brain, Bot, User, Sparkles, GraduationCap, Calendar, CheckSquare, ArrowRight } from 'lucide-react';

interface EvaluationSummaryViewProps {
  evaluation?: InterviewEvaluation;
  onStartNextPath?: () => void;
}

export const EvaluationSummaryView: React.FC<EvaluationSummaryViewProps> = ({
  evaluation,
  onStartNextPath
}) => {
 const [filter, setFilter] = useState<'critical' | 'all'>('critical');
 
  if (!evaluation) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-ink-900">No evaluation yet</h2>
        <p className="text-ink-600">Complete an AI Interview or GD session to see your report here.</p>
        <button onClick={onStartNextPath} className="bg-accent-600 text-white font-bold px-6 py-3 rounded-xl">
          Start Now
        </button>
      </div>
    );
  }
  const evalData = evaluation;

  const handleDownloadReport = () => {
    const lines = [
      `MBA BJD — Evaluation Summary`,
      `Role: ${evalData.role}`,
      `Date: ${evalData.date}`,
      ``,
      `Readiness Score: ${evalData.readinessScore} / 100`,
      `Percentile: Top ${evalData.percentile}%`,
      ``,
      `Performance Metrics`,
      `-------------------`,
      `Communication: ${evalData.metrics.communication.score}% — ${evalData.metrics.communication.note}`,
      `Technical Accuracy: ${evalData.metrics.technicalAccuracy.score}% — ${evalData.metrics.technicalAccuracy.note}`,
      `Body Language: ${evalData.metrics.bodyLanguage.score}% — ${evalData.metrics.bodyLanguage.note}`,
      `Confidence: ${evalData.metrics.confidence.score}% — ${evalData.metrics.confidence.note}`,
      ``,
      `Interview Transcript`,
      `---------------------`,
      ...evalData.transcript.flatMap((item) => [
        `Q: ${item.question}`,
        `A: ${item.answer}`,
        `AI Insight: ${item.aiInsight}`,
        ``,
      ]),
      `Next Steps`,
      `----------`,
      ...evalData.nextSteps.map((s) => `- ${s.title}: ${s.description}`),
      ``,
      `Recommended Resources`,
      `----------------------`,
      ...evalData.recommendedResources.map((r) => `- ${r.title}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MBA-BJD-Evaluation-Report-${evalData.date.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="evaluation-summary-page" className="bg-ink-50 text-ink-900 min-h-screen py-8 px-4 md:px-8">
      <main className="max-w-[1280px] mx-auto space-y-8">
        {/* Header Section */}
        <div id="evaluation-header">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-accent-600 bg-accent-50 px-3.5 py-1 rounded-full uppercase tracking-widest font-bold">
                Post-Interview Analysis
              </span>
              <h1 className="text-4xl font-black mt-2 text-ink-900 tracking-tight">
                Evaluation Summary
              </h1>
              <p className="text-ink-600 text-sm mt-1">
                {evalData.role} • {evalData.date}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                id="btn-download-report"
                onClick={handleDownloadReport}
                className="bg-white border border-ink-200/90 text-ink-900 px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-ink-50 transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-accent-600" />
                Download Report
              </button>
              <button
                id="btn-share-insights"
                onClick={() => alert("Share link copied to clipboard!")}
                className="bg-accent-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-accent-500 active:scale-95 transition-all shadow-md shadow-accent-200"
              >
                <Share2 className="w-4 h-4" />
                Share Insights
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Overall Readiness Score Card */}
          <div
            id="readiness-score-card"
            className="col-span-12 lg:col-span-4 bg-white border border-ink-200/90 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-accent-600"></div>
            <h3 className="font-mono text-xs text-ink-500 mb-6 uppercase tracking-wider font-bold">
              Readiness Score
            </h3>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-accent-50" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
                <circle
                  className="text-accent-600"
                  cx="96"
                  cy="96"
                  fill="transparent"
                  r="88"
                  stroke="currentColor"
                  strokeDasharray="552.92"
                  strokeDashoffset={552.92 * (1 - evalData.readinessScore / 100)}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className=" text-5xl font-black text-ink-900 tracking-tight">
                  {evalData.readinessScore}
                </span>
                <span className="font-mono text-xs text-ink-400 mt-1">/ 100</span>
              </div>
            </div>

            <div className="mt-8 bg-success-50 text-success-700 border border-success-200/80 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-2xs">
              <Star className="w-4 h-4 fill-current text-success-600" />
              Market Ready
            </div>
            <p className="mt-4 text-ink-600 text-xs max-w-[240px] leading-relaxed">
              You are in the top {evalData.percentile}% of candidates for this specific role profile.
            </p>
          </div>

          {/* Detailed Performance Metrics Card */}
          <div
            id="performance-metrics-card"
            className="col-span-12 lg:col-span-8 bg-white border border-ink-200/90 rounded-3xl p-6 shadow-sm space-y-6"
          >
            <h3 className=" text-xl font-bold text-ink-900">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              {/* Communication */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-accent-600" />
                    Communication
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink-500">{evalData.metrics.communication.score}%</span>
                </div>
                <div className="h-2.5 w-full bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-600 rounded-full transition-all duration-1000" style={{ width: `${evalData.metrics.communication.score}%` }}></div>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">{evalData.metrics.communication.note}</p>
              </div>

              {/* Technical Accuracy */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                    <Code className="w-4 h-4 text-accent-600" />
                    Technical Accuracy
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink-500">{evalData.metrics.technicalAccuracy.score}%</span>
                </div>
                <div className="h-2.5 w-full bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-600 rounded-full transition-all duration-1000" style={{ width: `${evalData.metrics.technicalAccuracy.score}%` }}></div>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">{evalData.metrics.technicalAccuracy.note}</p>
              </div>

              {/* Body Language */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-accent-600" />
                    Body Language
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink-500">{evalData.metrics.bodyLanguage.score}%</span>
                </div>
                <div className="h-2.5 w-full bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-600 rounded-full transition-all duration-1000" style={{ width: `${evalData.metrics.bodyLanguage.score}%` }}></div>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">{evalData.metrics.bodyLanguage.note}</p>
              </div>

              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-accent-600" />
                    Confidence
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink-500">{evalData.metrics.confidence.score}%</span>
                </div>
                <div className="h-2.5 w-full bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-600 rounded-full transition-all duration-1000" style={{ width: `${evalData.metrics.confidence.score}%` }}></div>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed">{evalData.metrics.confidence.note}</p>
              </div>
            </div>
          </div>

          {/* Transcript Section */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="bg-white border border-ink-200/90 rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-accent-50/50 px-6 py-4 border-b border-ink-200/80 flex justify-between items-center">
                <h3 className=" text-xl font-bold text-ink-900">
                  Interview Transcript
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-500">Filter:</span>
                  <select
                    value={filter}
                    onChange={e => setFilter(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-semibold focus:ring-0 cursor-pointer text-accent-600"
                  >
                    <option value="critical">Critical Moments</option>
                    <option value="all">All Answers</option>
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {evalData.transcript.map((item, idx) => (
                  <div key={item.id || idx} className={`space-y-4 ${idx > 0 ? 'border-t border-ink-100 pt-8' : ''}`}>
                    {/* Interviewer AI Row */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-xl bg-accent-100 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-accent-600" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-ink-400 uppercase tracking-wider">Interviewer (AI)</span>
                        <p className="text-sm font-semibold text-ink-900">
                          "{item.question}"
                        </p>
                      </div>
                    </div>

                    {/* Candidate Row */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-xl bg-ink-900 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-2 flex-grow">
                        <span className="font-mono text-[10px] text-ink-400 uppercase tracking-wider">You</span>
                        <p className="text-sm text-ink-800 leading-relaxed">
                          "{item.answer}"
                        </p>

                        {/* Glassmorphic AI INSIGHT Bubble */}
                        <div className="bg-accent-50/70 border border-accent-200/80 rounded-2xl p-4 mt-3 relative shadow-2xs">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-mono text-[10px] text-accent-600 font-bold block mb-1 tracking-wider uppercase">
                                AI INSIGHT
                              </span>
                              <p className="text-xs text-accent-950 italic leading-relaxed">
                                "{item.aiInsight}"
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: Next Steps & Recommended Resources */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Next Steps Card */}
            <div className="bg-ink-900 text-white rounded-3xl p-6 shadow-xl border border-ink-800 space-y-6">
              <h3 className=" text-xl font-bold text-white">
                Next Steps
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-accent-500/20 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-accent-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Refine System Design</p>
                    <p className="text-xs text-ink-300 mt-0.5 leading-relaxed">Based on your tech accuracy, we recommend the 'Advanced System Design' module.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-accent-500/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-accent-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Book Expert Mock</p>
                    <p className="text-xs text-ink-300 mt-0.5 leading-relaxed">You're ready for a live human peer review. Schedule for next Tuesday.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-accent-500/20 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-5 h-5 text-accent-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Review Weak Keywords</p>
                    <p className="text-xs text-ink-300 mt-0.5 leading-relaxed">Study the feedback on 'CAP Theorem' and 'Database Normalization'.</p>
                  </div>
                </div>
              </div>

              <button
                id="btn-start-next-path"
                onClick={onStartNextPath}
                className="w-full bg-accent-600 hover:bg-accent-500 text-white py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md shadow-accent-900/50"
              >
                Start Next Path
              </button>
            </div>

            {/* Recommended Resources Mini-Bento */}
            <div className="bg-white border border-ink-200/90 rounded-3xl p-6 space-y-4 shadow-sm">
              <h4 className="font-mono text-xs text-ink-500 uppercase font-bold tracking-wider">
                Recommended Resources
              </h4>
              <div className="space-y-2.5">
                {evalData.recommendedResources.map((res, idx) => (
                  <a
                    key={idx}
                    href={res.url}
                    onClick={e => e.preventDefault()}
                    className="group flex items-center justify-between p-3.5 bg-ink-50 rounded-2xl hover:bg-accent-50 border border-ink-100 hover:border-accent-200 transition-all shadow-2xs"
                  >
                    <span className="text-xs font-semibold text-ink-900 group-hover:text-accent-600 transition-colors">{res.title}</span>
                    <ArrowRight className="w-4 h-4 text-ink-400 group-hover:text-accent-600 group-hover:translate-x-1 transition-all" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-20 flex items-center justify-center text-ink-400 text-xs border-t border-ink-200/60 mt-12">
        © MBA BJD Interview Intelligence System. All rights reserved.
      </footer>
    </div>
  );
};
