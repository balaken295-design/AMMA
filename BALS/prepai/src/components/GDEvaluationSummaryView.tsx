import React from 'react';
import { GDEvaluation } from '../types';
import { Download, Copy, Users, MessageSquare, Lightbulb, Target, Headphones, Crown } from 'lucide-react';

interface GDEvaluationSummaryViewProps {
  evaluation?: GDEvaluation;
  onStartNextPath?: () => void;
}

const metricConfig = [
  { key: 'relevance', label: 'Content Relevance', icon: Target },
  { key: 'clarity', label: 'Communication Clarity', icon: MessageSquare },
  { key: 'listening', label: 'Listening & Building', icon: Headphones },
  { key: 'leadership', label: 'Leadership & Initiative', icon: Crown },
] as const;

export const GDEvaluationSummaryView: React.FC<GDEvaluationSummaryViewProps> = ({ evaluation, onStartNextPath }) => {
  if (!evaluation) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <Users className="w-10 h-10 mx-auto text-accent-600" />
        <h2 className="text-2xl font-bold text-ink-900">No GD evaluation yet</h2>
        <p className="text-ink-600">Complete a Group Discussion to generate your evaluation report.</p>
        <button onClick={onStartNextPath} className="bg-accent-600 text-white font-bold px-6 py-3 rounded-xl">Start Practice</button>
      </div>
    );
  }

  const handleCopy = async () => {
    const text = [
      'MBA BJD — Group Discussion Evaluation',
      `Topic: ${evaluation.topic}`,
      `Readiness Score: ${evaluation.readinessScore}/100`,
      ...metricConfig.map(({ key, label }) => `${label}: ${evaluation.metrics[key].score}/100 — ${evaluation.metrics[key].note}`),
      '', `Overall: ${evaluation.overallNote}`, '', 'Next Steps',
      ...evaluation.nextSteps.map(s => `- ${s.title}: ${s.description}`),
    ].join('\\n');
    try { await navigator.clipboard.writeText(text); alert('GD evaluation copied to clipboard.'); }
    catch { alert('Could not copy the GD evaluation.'); }
  };

  const handleDownload = () => {
    const lines = [
      'MBA BJD — Group Discussion Evaluation',
      `Topic: ${evaluation.topic}`,
      `Date: ${evaluation.date}`,
      `Readiness Score: ${evaluation.readinessScore}/100`, '',
      ...metricConfig.map(({ key, label }) => `${label}: ${evaluation.metrics[key].score}/100 — ${evaluation.metrics[key].note}`),
      '', 'Overall Assessment', evaluation.overallNote, '', 'Candidate Contributions',
      ...evaluation.transcript.map(t => `[${t.speaker}] ${t.text}`),
      '', 'Next Steps', ...evaluation.nextSteps.map(s => `- ${s.title}: ${s.description}`),
    ];
    const blob = new Blob([lines.join('\\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'gd-evaluation-report.txt'; a.click(); URL.revokeObjectURL(url);
  };

  const readinessLabel = evaluation.readinessScore >= 80 ? 'Strong readiness' : evaluation.readinessScore >= 65 ? 'Developing readiness' : 'Needs improvement';

  return (
    <div id="gd-evaluation-report" className="max-w-[1180px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="bg-ink-900 text-white rounded-3xl p-7 md:p-9 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/20 text-accent-300 text-[11px] font-mono font-bold uppercase tracking-wider"><Users className="w-3.5 h-3.5" /> Group Discussion Evaluation</span>
            <h1 className="text-3xl font-black">GD Evaluation Report</h1>
            <p className="text-ink-300 text-sm max-w-2xl">{evaluation.topic}</p>
            <p className="text-xs text-ink-400 font-mono">{evaluation.date}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-400 font-mono uppercase">Readiness</div>
            <div className="text-4xl font-black text-accent-300">{evaluation.readinessScore}<span className="text-lg text-ink-400">/100</span></div>
            <div className="text-xs font-bold text-accent-300">{readinessLabel}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleCopy} className="inline-flex items-center gap-2 bg-white border border-ink-200 px-4 py-2.5 rounded-xl text-sm font-bold text-ink-800 hover:bg-ink-50"><Copy className="w-4 h-4" /> Copy Summary</button>
        <button onClick={handleDownload} className="inline-flex items-center gap-2 bg-ink-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-ink-800"><Download className="w-4 h-4" /> Download Report</button>
      </div>

      {evaluation.degraded && (
        <div className="bg-highlight-50 border border-highlight-200 rounded-2xl px-4 py-3 text-sm text-highlight-800">
          AI evaluation was unavailable, so this report uses a transcript-based estimate. Treat the scores as guidance, not as a subject-matter judgment.
        </div>
      )}

      <section className="bg-white border border-ink-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-ink-900">How the readiness score is calculated</h2>
        <p className="text-sm text-ink-600 mt-1">The score is calculated from the four observed GD metrics; it is not a separate AI guess.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-semibold">
          <div className="bg-ink-50 rounded-xl p-3">Relevance <strong className="block text-accent-600 mt-1">30%</strong></div>
          <div className="bg-ink-50 rounded-xl p-3">Clarity <strong className="block text-accent-600 mt-1">25%</strong></div>
          <div className="bg-ink-50 rounded-xl p-3">Listening <strong className="block text-accent-600 mt-1">25%</strong></div>
          <div className="bg-ink-50 rounded-xl p-3">Leadership <strong className="block text-accent-600 mt-1">20%</strong></div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metricConfig.map(({ key, label, icon: Icon }) => {
          const metric = evaluation.metrics[key];
          return (
            <div key={key} className="bg-white border border-ink-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-accent-50 text-accent-600 rounded-xl"><Icon className="w-5 h-5" /></div>
                  <div><h3 className="font-bold text-ink-900">{label}</h3><p className="text-xs text-ink-500 mt-1">Evidence-based GD metric</p></div>
                </div>
                <span className="text-2xl font-black text-accent-600">{metric.score}</span>
              </div>
              <div className="mt-4 h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-accent-600 rounded-full" style={{ width: `${Math.max(0, Math.min(100, metric.score))}%` }} /></div>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">{metric.note}</p>
            </div>
          );
        })}
      </section>

      <section className="bg-white border border-ink-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div><h2 className="text-xl font-black text-ink-900">Overall Assessment</h2><p className="text-sm text-ink-600 mt-1">{evaluation.overallNote}</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {evaluation.nextSteps.map((step, i) => (
            <div key={`${step.title}-${i}`} className="bg-ink-50 border border-ink-200 rounded-2xl p-4">
              <Lightbulb className="w-5 h-5 text-accent-600 mb-2" /><h3 className="font-bold text-sm text-ink-900">{step.title}</h3><p className="text-xs text-ink-600 mt-1.5 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-ink-200 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-ink-900 mb-4">Candidate Contributions</h2>
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {evaluation.transcript.length ? evaluation.transcript.map((item, i) => (
            <div key={item.id || i} className="border border-ink-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-accent-700 mb-2"><span className="px-2 py-1 bg-accent-50 rounded-lg">Contribution {i + 1}</span><span>{item.speaker}</span></div>
              <p className="text-sm text-ink-700 leading-relaxed">{item.text}</p>
              {item.aiInsight && (
                <div className="mt-3 bg-accent-50 border border-accent-200 rounded-xl p-3">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-700">Contribution Feedback</p>
                  <p className="text-xs text-accent-950 mt-1 leading-relaxed">{item.aiInsight}</p>
                </div>
              )}
            </div>
          )) : <p className="text-sm text-ink-500">No candidate speech was captured.</p>}
        </div>
      </section>
    </div>
  );
};
