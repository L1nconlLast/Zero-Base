import React from 'react';

const MODALIDADES = [
  { value: 'enem', label: 'ENEM', color: 'bg-blue-600', icon: '🔵' },
  { value: 'concurso', label: 'Concurso', color: 'bg-violet-600', icon: '🟣' },
];

interface ModalidadeSelectProps {
  value: string | null;
  onChange: (v: string) => void;
}

const ModalidadeSelect: React.FC<ModalidadeSelectProps> = ({ value, onChange }) => {
  return (
    <div className="w-48">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-semibold`}
      >
        <option value="" disabled>Selecione a modalidade</option>
        {MODALIDADES.map(m => (
          <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
        ))}
      </select>
    </div>
  );
};

export default ModalidadeSelect;
