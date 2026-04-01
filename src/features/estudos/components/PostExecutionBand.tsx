import React from 'react';
import { ArrowRight, Link2, Route } from 'lucide-react';
import type { PostExecutionBandData } from '../types';

interface PostExecutionBandProps {
  data: PostExecutionBandData;
  darkMode?: boolean;
}

export const PostExecutionBand: React.FC<PostExecutionBandProps> = ({
  data,
  darkMode = false,
}) => {
  const contextMeta = [data.context.parentLabel, data.context.sequenceLabel].filter(Boolean);
  const contextTitle = data.contextTitle || 'Contexto do bloco';
  const continuityTitle = data.continuityTitle || 'Depois desta sessao';

  return (
    <section
      className={`rounded-[22px] border px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] ${
        darkMode
          ? 'border-slate-800/90 bg-slate-950/58 shadow-[0_10px_20px_rgba(2,6,23,0.22)]'
          : 'border-slate-200/90 bg-[linear-gradient(180deg,rgba(246,248,251,0.96)_0%,rgba(239,243,247,0.94)_100%)] shadow-[0_10px_20px_rgba(148,163,184,0.10)]'
      }`}
      data-testid="study-post-execution-band"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section
          className={`rounded-[18px] border px-4 py-3.5 ${
            darkMode
              ? 'border-slate-800/80 bg-slate-950/28'
              : 'border-slate-200/80 bg-white/52'
          }`}
          data-testid="study-post-execution-context"
        >
          <div className="flex items-center gap-2">
            <Link2 className={`h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              darkMode ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {contextTitle}
            </p>
          </div>
          <p className={`mt-3 text-[13px] font-semibold ${
            darkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {data.context.contextLabel}
          </p>
          {contextMeta.length > 0 ? (
            <p className={`mt-2 text-[11px] leading-5 ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {contextMeta.join(' / ')}
            </p>
          ) : null}
        </section>

        <section
          className={`rounded-[18px] border px-4 py-3.5 ${
            darkMode
              ? 'border-slate-800/80 bg-slate-950/34'
              : 'border-slate-200/80 bg-white/58'
          }`}
          data-testid="study-post-execution-continuity"
        >
          <div className="flex items-center gap-2">
            <Route className={`h-4 w-4 ${darkMode ? 'text-cyan-300/80' : 'text-cyan-600'}`} />
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              darkMode ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {continuityTitle}
            </p>
          </div>
          <p className={`mt-3 text-[13px] font-semibold ${
            darkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {data.continuity.nextStepLabel}
          </p>
          {data.continuity.followUpLabel ? (
            <p className={`mt-2 text-[13px] leading-5 ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {data.continuity.followUpLabel}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {data.continuity.progressHintLabel ? (
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/70 text-slate-300'
                  : 'border-slate-200/85 bg-slate-100/85 text-slate-700'
              }`}>
                {data.continuity.progressHintLabel}
              </span>
            ) : null}
            {data.continuity.actionLabel ? (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                darkMode ? 'text-cyan-300' : 'text-cyan-700'
              }`}>
                {data.continuity.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
};

export default PostExecutionBand;
