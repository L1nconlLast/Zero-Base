import React from 'react';
import { CheckCircle2, Clock3, Flag } from 'lucide-react';
import { truncatePresentationLabel } from '../../../utils/uiLabels';
import type { StudyBlock } from '../types';

interface StudyBlockCardProps {
  darkMode?: boolean;
  block: StudyBlock;
}

const priorityToneClass: Record<'light' | 'dark', Record<StudyBlock['priority'], string>> = {
  light: {
    low: 'border-slate-200 bg-slate-50 text-slate-500',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    high: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  dark: {
    low: 'border-slate-700 bg-slate-900/78 text-slate-300',
    medium: 'border-amber-900/70 bg-amber-950/30 text-amber-200',
    high: 'border-rose-900/70 bg-rose-950/30 text-rose-200',
  },
};

const priorityCopy: Record<StudyBlock['priority'], string> = {
  low: 'Leve',
  medium: 'Media',
  high: 'Prioridade',
};

const blockPalette: Record<'light' | 'dark', string[]> = {
  light: [
    'border-[#bfdcf6] bg-[#eef6ff]',
    'border-[#f3ddbf] bg-[#fdf4e8]',
    'border-[#bfe4df] bg-[#edf8f6]',
    'border-[#ddd1f4] bg-[#f5efff]',
    'border-[#d1e8cc] bg-[#eef8eb]',
  ],
  dark: [
    'border-sky-900/70 bg-sky-950/38',
    'border-amber-900/70 bg-amber-950/32',
    'border-teal-900/70 bg-teal-950/32',
    'border-violet-900/70 bg-violet-950/32',
    'border-emerald-900/70 bg-emerald-950/32',
  ],
};

const getBlockSurfaceClass = (subject: string, darkMode: boolean) => {
  const seed = Array.from(subject).reduce((total, char) => total + char.charCodeAt(0), 0);
  const palette = darkMode ? blockPalette.dark : blockPalette.light;
  return palette[seed % palette.length];
};

export const StudyBlockCard: React.FC<StudyBlockCardProps> = ({ darkMode = false, block }) => {
  const surfaceClass = getBlockSurfaceClass(block.subject, darkMode);
  const priorityTone = darkMode ? priorityToneClass.dark[block.priority] : priorityToneClass.light[block.priority];

  return (
    <article className={`min-w-0 overflow-hidden rounded-[18px] border p-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)] ${surfaceClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-bold tracking-[-0.02em] ${
              block.status === 'done'
                ? darkMode
                  ? 'text-slate-500 line-through'
                  : 'text-slate-500 line-through'
                : darkMode
                  ? 'text-slate-100'
                  : 'text-slate-900'
            }`}
            title={block.subject}
          >
            {truncatePresentationLabel(block.subject, 20, block.subject)}
          </p>
          <p className={`mt-1 truncate text-[11px] font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} title={block.topic}>
            {truncatePresentationLabel(block.topic, 28, block.topic)}
          </p>
        </div>

        {block.status === 'done' ? (
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            darkMode ? 'bg-emerald-950/45 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
          darkMode
            ? 'border-slate-700 bg-slate-950/70 text-slate-200'
            : 'border-slate-200/80 bg-slate-50/88 text-slate-600'
        }`}>
          <Clock3 className={`h-3.5 w-3.5 ${darkMode ? 'text-cyan-300' : 'text-cyan-500'}`} />
          {block.duration} min
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${priorityTone}`}>
          <Flag className="h-3.5 w-3.5" />
          {priorityCopy[block.priority]}
        </span>
      </div>
    </article>
  );
};

export default StudyBlockCard;
