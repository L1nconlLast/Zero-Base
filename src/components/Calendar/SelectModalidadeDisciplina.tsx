import React, { useState } from 'react';

const MODALIDADES = [
  { value: 'enem', label: 'ENEM', color: 'bg-blue-600', icon: '🔵' },
  { value: 'concurso', label: 'Concurso', color: 'bg-violet-600', icon: '🟣' },
];

const DISCIPLINAS = {
  enem: [
    { value: 'matematica', label: 'Matemática', icon: '📐' },
    { value: 'biologia', label: 'Biologia', icon: '🧬' },
    { value: 'quimica', label: 'Química', icon: '🧪' },
    { value: 'fisica', label: 'Física', icon: '🔭' },
    { value: 'historia', label: 'História', icon: '📜' },
  ],
  concurso: [
    { value: 'direito_adm', label: 'Direito Administrativo', icon: '⚖️' },
    { value: 'direito_const', label: 'Direito Constitucional', icon: '📖' },
    { value: 'portugues', label: 'Português', icon: '📝' },
    { value: 'raciocinio_logico', label: 'Raciocínio Lógico', icon: '🧠' },
  ],
};

interface SelectModalidadeDisciplinaProps {
  modalidade: 'enem' | 'concurso';
  setModalidade: (v: 'enem' | 'concurso') => void;
  disciplina: string;
  setDisciplina: (v: string) => void;
}

const SelectModalidadeDisciplina: React.FC<SelectModalidadeDisciplinaProps> = ({ modalidade, setModalidade, disciplina, setDisciplina }) => {
  const disciplinasAtuais = DISCIPLINAS[modalidade] || [];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Modalidade */}
      <div className="w-48">
        <div className="relative">
          <select
            value={modalidade}
            onChange={e => { setModalidade(e.target.value as 'enem' | 'concurso'); setDisciplina(''); }}
            className={`w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-semibold`}
          >
            {MODALIDADES.map(m => (
              <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
            ))}
          </select>
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${modalidade === 'enem' ? 'text-blue-400' : 'text-violet-400'}`}>▼</span>
        </div>
      </div>
      {/* Disciplina dinâmica */}
      <div className="w-64">
        <div className="relative">
          <select
            value={disciplina}
            onChange={e => setDisciplina(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-medium`}
          >
            <option value="">Selecione a disciplina</option>
            {disciplinasAtuais.map((d) => (
              <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">▼</span>
        </div>
      </div>
    </div>
  );
};

export default SelectModalidadeDisciplina;
