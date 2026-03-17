import React from 'react';
import { BookOpen } from 'lucide-react';
import { MATERIAS_CONFIG, MateriaTipo } from '../../types';
import { CYCLE_DISCIPLINE_LABELS } from '../../utils/disciplineLabels';

interface SubjectSelectorProps {
  selected: MateriaTipo;
  onChange: (materia: MateriaTipo) => void;
  className?: string;
}

export function SubjectSelector({ selected, onChange, className = '' }: SubjectSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        <span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Selecione a Matéria</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MATERIAS_CONFIG) as MateriaTipo[]).map((materia) => (
          <button
            key={materia}
            onClick={() => onChange(materia)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all font-medium
              ${
                selected === materia
                  ? `${MATERIAS_CONFIG[materia].bgColor} ${MATERIAS_CONFIG[materia].color} ${MATERIAS_CONFIG[materia].borderColor} ring-2 ring-offset-2 ring-current scale-105 shadow-md`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:scale-102'
              }
            `}
          >
            {React.createElement(CYCLE_DISCIPLINE_LABELS[materia].Icon, { className: 'w-5 h-5' })}
            <span className="text-sm font-semibold">{CYCLE_DISCIPLINE_LABELS[materia].label}</span>
          </button>
        ))}
      </div>
      
      {/* Matéria Selecionada - Visual Feedback */}
      <div className={`
        mt-3 p-3 rounded-lg border-2 
        ${MATERIAS_CONFIG[selected].bgColor} 
        ${MATERIAS_CONFIG[selected].borderColor}
      `}>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {React.createElement(CYCLE_DISCIPLINE_LABELS[selected].Icon, { className: 'w-4 h-4 inline mr-2' })}
          Estudando: <span className={`font-bold ${MATERIAS_CONFIG[selected].color}`}>{CYCLE_DISCIPLINE_LABELS[selected].label}</span>
        </p>
      </div>
    </div>
  );
}
