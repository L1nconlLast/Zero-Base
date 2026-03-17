import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { getDisciplineIconById } from '../../utils/disciplineLabels';

interface DisciplinaSelectProps {
  modalidade: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
  disciplinas: Array<{ id: string; label: string }>;
}

const DisciplinaSelect: React.FC<DisciplinaSelectProps> = ({ modalidade, value, onChange, disciplinas }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, []);

  useEffect(() => {
    setSearch('');
    setOpen(false);
    onChange(null);
  }, [modalidade, onChange]);

  const filtered = disciplinas.filter(d =>
    d.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="w-64 relative">
      <button
        type="button"
        disabled={!modalidade}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-medium ${!modalidade ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => modalidade && setOpen(v => !v)}
      >
        {React.createElement(getDisciplineIconById(value || 'outra'), { className: 'w-5 h-5' })}
        <span>{value ? disciplinas.find(d => d.id === value)?.label : 'Buscar disciplina'}</span>
        <ChevronDown className="ml-auto w-4 h-4 text-slate-400" />
      </button>
      {open && modalidade && (
        <div className="absolute z-50 left-0 mt-2 w-full rounded-xl shadow-xl border border-slate-700/50 bg-slate-900/90 backdrop-blur-sm p-3 animate-fade-in">
          <input
            autoFocus
            className="w-full mb-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar disciplina..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-3 text-center text-slate-400">Nenhuma disciplina encontrada</div>
            ) : (
              filtered.map(d => {
                // Ícones padronizados
                const OptionIcon = getDisciplineIconById(d.id);
                return (
                  <button
                    key={d.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 transition hover:bg-indigo-500/10 hover:text-white focus:outline-none ${value === d.id ? 'bg-slate-700/60' : ''}`}
                    onClick={() => { onChange(d.id); setOpen(false); setSearch(''); }}
                    type="button"
                  >
                    <OptionIcon className="w-5 h-5" />
                    <span>{d.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplinaSelect;
