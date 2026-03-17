import React from 'react';
import { BookOpen, Calculator, ChevronDown, Landmark, Microscope, PenTool, Scale, Brain, Castle, Atom } from 'lucide-react';
import { getDisciplineIconById } from '../../utils/disciplineLabels';

const MODALIDADES = [
  { value: 'enem', label: 'ENEM', color: 'bg-blue-600', Icon: BookOpen },
  { value: 'concurso', label: 'Concurso', color: 'bg-violet-600', Icon: Landmark },
];

const DISCIPLINAS = {
  enem: [
    { value: 'matematica', label: 'Matemática', Icon: Calculator },
    { value: 'biologia', label: 'Biologia', Icon: Microscope },
    { value: 'quimica', label: 'Química', Icon: PenTool },
    { value: 'fisica', label: 'Física', Icon: Atom },
    { value: 'historia', label: 'História', Icon: Castle },
  ],
  concurso: [
    { value: 'direito_adm', label: 'Direito Administrativo', Icon: Landmark },
    { value: 'direito_const', label: 'Direito Constitucional', Icon: Scale },
    { value: 'portugues', label: 'Português', Icon: BookOpen },
    { value: 'raciocinio_logico', label: 'Raciocínio Lógico', Icon: Brain },
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
  const SelectedTrackIcon = MODALIDADES.find((item) => item.value === modalidade)?.Icon || BookOpen;
  const SelectedDisciplineIcon = getDisciplineIconById(disciplina || 'outra');

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Modalidade */}
      <div className="w-48">
        <div className="relative">
          <SelectedTrackIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={modalidade}
            onChange={e => { setModalidade(e.target.value as 'enem' | 'concurso'); setDisciplina(''); }}
            className={`w-full pl-9 pr-9 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-semibold appearance-none`}
          >
            {MODALIDADES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${modalidade === 'enem' ? 'text-blue-400' : 'text-violet-400'}`} />
        </div>
      </div>
      {/* Disciplina dinâmica */}
      <div className="w-64">
        <div className="relative">
          <SelectedDisciplineIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={disciplina}
            onChange={e => setDisciplina(e.target.value)}
            className={`w-full pl-9 pr-9 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition font-medium appearance-none`}
          >
            <option value="">Selecione a disciplina</option>
            {disciplinasAtuais.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
};

export default SelectModalidadeDisciplina;
