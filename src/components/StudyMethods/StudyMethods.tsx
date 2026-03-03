import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  Clock, 
  BookOpen, 
  Brain, 
  FileText, 
  MessageCircle, 
  Shuffle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

interface StudyMethod {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  detailedInfo: string;
  benefits: string[];
  howToUse: string[];
  bestFor: string[];
  timeEstimate?: string;
}

const studyMethods: StudyMethod[] = [
  {
    id: 'pomodoro',
    name: 'Técnica Pomodoro',
    icon: Clock,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Foco intenso por 25 minutos, seguido de 5 minutos de descanso.',
    detailedInfo: 'Método de gerenciamento de tempo que divide o trabalho em intervalos de 25 minutos (pomodoros), separados por breves pausas. Após 4 pomodoros, faça uma pausa mais longa de 15-30 minutos.',
    benefits: [
      'Mantém a concentração alta',
      'Evita fadiga mental',
      'Aumenta produtividade',
      'Reduz procrastinação'
    ],
    howToUse: [
      'Escolha uma tarefa específica',
      'Configure timer para 25 minutos',
      'Trabalhe sem distrações',
      'Faça pausa de 5 minutos',
      'Repita 4x, depois pausa longa'
    ],
    bestFor: ['Tarefas longas', 'Leitura de textos', 'Resolução de exercícios'],
    timeEstimate: '25 min foco + 5 min pausa'
  },
  {
    id: 'flashcards',
    name: 'Estudo Ativo / Flashcards',
    icon: BookOpen,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Cartões com perguntas na frente e respostas atrás para memorização ativa.',
    detailedInfo: 'Sistema de revisão espaçada usando cartões físicos ou digitais. A repetição ativa força o cérebro a recuperar informações, consolidando o aprendizado.',
    benefits: [
      'Memorização de longo prazo',
      'Identifica pontos fracos',
      'Revisão rápida e eficiente',
      'Portátil e prático'
    ],
    howToUse: [
      'Crie cartões com pergunta/resposta',
      'Tente responder antes de virar',
      'Separe em "sei" e "não sei"',
      'Revise os difíceis mais vezes',
      'Use apps como Anki ou Quizlet'
    ],
    bestFor: ['Matemática', 'Linguagens', 'Atualidades', 'Datas e nomes'],
    timeEstimate: '15-30 min/dia'
  },
  {
    id: 'mindmap',
    name: 'Mapas Mentais',
    icon: Brain,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Diagramas visuais que conectam ideias centrais a tópicos secundários.',
    detailedInfo: 'Representação gráfica não-linear de informações, com um conceito central ramificando-se em subtópicos. Utiliza cores, imagens e palavras-chave para facilitar a memorização visual.',
    benefits: [
      'Organiza informações complexas',
      'Facilita visão geral do tema',
      'Estimula criatividade',
      'Memorização por associação visual'
    ],
    howToUse: [
      'Coloque o tema central no meio',
      'Crie ramos principais (subtemas)',
      'Adicione ramos secundários (detalhes)',
      'Use cores e símbolos',
      'Revise e complemente'
    ],
    bestFor: ['Ciências da Natureza', 'Ciências Humanas', 'Sistemas complexos', 'Ciclos de conteúdo'],
    timeEstimate: '20-40 min/mapa'
  },
  {
    id: 'summaries',
    name: 'Resumos e Leitura Ativa',
    icon: FileText,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Ler o conteúdo e reescrever com as próprias palavras.',
    detailedInfo: 'Técnica que transforma leitura passiva em ativa. Ao reescrever com suas palavras, você processa profundamente o conteúdo e identifica lacunas de compreensão.',
    benefits: [
      'Consolida aprendizado',
      'Identifica dúvidas',
      'Material próprio para revisão',
      'Melhora retenção em 50%'
    ],
    howToUse: [
      'Leia um parágrafo/seção',
      'Feche o livro',
      'Escreva o que entendeu',
      'Compare com o original',
      'Complete informações faltantes'
    ],
    bestFor: ['Livros-texto', 'Artigos científicos', 'Protocolos clínicos'],
    timeEstimate: '1-2h por capítulo'
  },
  {
    id: 'feynman',
    name: 'Técnica Feynman',
    icon: MessageCircle,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Explicar o assunto de forma simples, como se estivesse ensinando.',
    detailedInfo: 'Método criado pelo físico Richard Feynman. Consiste em ensinar um conceito complexo em linguagem simples. Se não consegue explicar de forma clara, você ainda não domina o assunto.',
    benefits: [
      'Testa compreensão real',
      'Identifica gaps de conhecimento',
      'Simplifica conceitos complexos',
      'Aumenta confiança'
    ],
    howToUse: [
      'Escolha um conceito',
      'Explique em voz alta (ou escrito)',
      'Use linguagem simples e analogias',
      'Identifique onde travou',
      'Volte ao material e reestude'
    ],
    bestFor: ['Direito Constitucional', 'Direito Administrativo', 'Conceitos abstratos'],
    timeEstimate: '10-20 min/conceito'
  },
  {
    id: 'interleaving',
    name: 'Intercalação de Conteúdos',
    icon: Shuffle,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Alternar diferentes matérias para manter o cérebro engajado.',
    detailedInfo: 'Em vez de estudar uma matéria por horas seguidas (prática em bloco), alterne entre diferentes disciplinas. Isso força o cérebro a discriminar e fortalecer conexões.',
    benefits: [
      'Evita monotonia',
      'Melhora retenção',
      'Desenvolve flexibilidade cognitiva',
      'Mantém motivação alta'
    ],
    howToUse: [
      'Divida sessão em blocos de 30-45min',
      'Estude Matemática no 1º bloco',
      'Mude para Linguagens no 2º',
      'Termine com Humanas ou Direito',
      'Varie ordem a cada dia'
    ],
    bestFor: ['Sessões longas', 'Revisão geral', 'Preparação para provas'],
    timeEstimate: '2-4h com variação'
  }
];

export function StudyMethods() {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const toggleExpand = (methodId: string) => {
    setExpandedMethod(expandedMethod === methodId ? null : methodId);
  };

  const toggleSelect = (methodId: string) => {
    setSelectedMethods(prev => 
      prev.includes(methodId) 
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Lightbulb size={32} />
          <h2 className="text-2xl font-bold">Métodos de Estudo Comprovados</h2>
        </div>
        <p className="text-indigo-100">
          Técnicas científicas para maximizar seu aprendizado e retenção de conteúdo
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
            <span className="font-bold">{studyMethods.length}</span> técnicas disponíveis
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
            <span className="font-bold">{selectedMethods.length}</span> marcadas como favoritas
          </div>
        </div>
      </div>

      {/* Methods Grid */}
      <div className="space-y-4">
        {studyMethods.map((method) => {
          const Icon = method.icon;
          const isExpanded = expandedMethod === method.id;
          const isSelected = selectedMethods.includes(method.id);

          return (
            <div 
              key={method.id}
              className={`
                bg-white rounded-2xl border-2 transition-all duration-300
                ${isSelected ? `${method.borderColor} shadow-lg` : 'border-gray-100 shadow-sm'}
                hover:shadow-md
              `}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`
                      ${method.bgColor} ${method.color} 
                      p-3 rounded-xl
                    `}>
                      <Icon size={28} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {method.name}
                        </h3>
                        {method.timeEstimate && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {method.timeEstimate}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {method.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleSelect(method.id)}
                      className={`
                        p-2 rounded-lg transition-all
                        ${isSelected 
                          ? `${method.bgColor} ${method.color}` 
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }
                      `}
                      title={isSelected ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <CheckCircle2 size={20} fill={isSelected ? 'currentColor' : 'none'} />
                    </button>
                    
                    <button
                      onClick={() => toggleExpand(method.id)}
                      className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    {/* Detailed Info */}
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2 inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Sobre o Método</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {method.detailedInfo}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Benefits */}
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          Benefícios
                        </h4>
                        <ul className="space-y-2">
                          {method.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* How to Use */}
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          Como Usar
                        </h4>
                        <ol className="space-y-2">
                          {method.howToUse.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                              <span className={`
                                ${method.bgColor} ${method.color} 
                                font-bold rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0
                              `}>
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Best For */}
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        Ideal Para
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {method.bestFor.map((item, idx) => (
                          <span 
                            key={idx}
                            className={`
                              ${method.bgColor} ${method.color}
                              px-3 py-1.5 rounded-full text-sm font-medium
                            `}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Tip */}
      {selectedMethods.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong className="inline-flex items-center gap-1"><Lightbulb className="w-4 h-4" /> Dica:</strong> Você marcou {selectedMethods.length} método(s) como favorito(s). 
            Tente combinar diferentes técnicas para resultados ainda melhores!
          </p>
        </div>
      )}
    </div>
  );
}
