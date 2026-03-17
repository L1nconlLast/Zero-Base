import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getDisciplineIconById } from '../../utils/disciplineLabels';

const DISCIPLINES = [
  { value: 'anatomia', label: 'Matemática' },
  { value: 'fisiologia', label: 'Linguagens' },
  { value: 'farmacologia', label: 'Humanas' },
  { value: 'patologia', label: 'Natureza' },
  { value: 'bioquimica', label: 'Redação' },
  { value: 'histologia', label: 'Atualidades' },
  { value: 'outra', label: 'Outras' },
];

interface CommandPaletteDisciplineSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CommandPaletteDisciplineSelect: React.FC<CommandPaletteDisciplineSelectProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = DISCIPLINES.filter(d =>
    d.label.toLowerCase().includes(search.toLowerCase()) ||
    d.value.toLowerCase().includes(search.toLowerCase())
  );
  const SelectedIcon = getDisciplineIconById(value || 'outra');

  return (
    <div className="relative">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium shadow-xl border border-slate-700/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <SelectedIcon className="w-5 h-5" />
        <span>{DISCIPLINES.find(d => d.value === value)?.label || 'Escolha uma disciplina'}</span>
        <ChevronDown className="ml-auto w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-2 w-full rounded-xl shadow-xl border border-slate-700/50 bg-slate-900/90 backdrop-blur-sm p-3 animate-fade-in">
          <input
            autoFocus
            className="w-full mb-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar disciplina..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-6 top-[22px] w-4 h-4 text-slate-400 pointer-events-none" />
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-3 text-center text-slate-400">Nenhuma disciplina encontrada</div>
            ) : (
              filtered.map(d => (
                <button
                  key={d.value}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 transition hover:bg-indigo-500/10 hover:text-white focus:outline-none ${value === d.value ? 'bg-slate-700/60' : ''}`}
                  onClick={() => { onChange(d.value); setOpen(false); setSearch(''); }}
                  type="button"
                >
                  {React.createElement(getDisciplineIconById(d.value), { className: 'w-5 h-5' })}
                  <span>{d.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandPaletteDisciplineSelect;
