import React from 'react';
import { BookOpen, ChevronDown, Landmark } from 'lucide-react';

const MODALIDADES = [
  { value: 'enem', label: 'ENEM', color: 'bg-blue-600', Icon: BookOpen },
  { value: 'concurso', label: 'Concurso', color: 'bg-violet-600', Icon: Landmark },
];

interface ModalidadeSelectProps {
  value: string | null;
  onChange: (v: string) => void;
}

const ModalidadeSelect: React.FC<ModalidadeSelectProps> = ({ value, onChange }) => {
  const SelectedIcon = MODALIDADES.find((item) => item.value === value)?.Icon || BookOpen;
  return (
    <div className="w-48 relative">
      <SelectedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full pl-9 pr-9 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-semibold appearance-none`}
      >
        <option value="" disabled>Selecione a modalidade</option>
        {MODALIDADES.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
};

export default ModalidadeSelect;
