import type { ContentTree } from '../types/content';

export const contentTreeV1: ContentTree = [
  {
    id: 'matematica',
    label: 'Matemática',
    fronts: [
      {
        id: 'aritmetica',
        label: 'Aritmética',
        topics: [
          { id: 'razao-proporcao', label: 'Razão e proporção' },
          { id: 'porcentagem', label: 'Porcentagem' },
          { id: 'regra-de-tres', label: 'Regra de três' },
        ],
      },
      {
        id: 'algebra',
        label: 'Álgebra',
        topics: [
          { id: 'equacao-1-grau', label: 'Equação do 1º grau' },
          { id: 'equacao-2-grau', label: 'Equação do 2º grau' },
          { id: 'sistemas', label: 'Sistemas' },
        ],
      },
      {
        id: 'geometria',
        label: 'Geometria',
        topics: [
          { id: 'area', label: 'Área' },
          { id: 'perimetro', label: 'Perímetro' },
          { id: 'volume', label: 'Volume' },
        ],
      },
    ],
  },
  {
    id: 'portugues',
    label: 'Português',
    fronts: [
      {
        id: 'interpretacao',
        label: 'Interpretação',
        topics: [
          { id: 'tipos-de-texto', label: 'Tipos de texto' },
          { id: 'leitura-e-inferencia', label: 'Leitura e inferência' },
        ],
      },
      {
        id: 'gramatica',
        label: 'Gramática',
        topics: [
          { id: 'classes-gramaticais', label: 'Classes gramaticais' },
          { id: 'concordancia', label: 'Concordância' },
          { id: 'regencia', label: 'Regência' },
        ],
      },
      {
        id: 'redacao',
        label: 'Redação',
        topics: [
          { id: 'estrutura-dissertativa', label: 'Estrutura dissertativa' },
          { id: 'repertorio', label: 'Repertório' },
          { id: 'competencias', label: 'Competências' },
        ],
      },
    ],
  },
  {
    id: 'historia',
    label: 'História',
    fronts: [
      {
        id: 'historia-do-brasil',
        label: 'História do Brasil',
        topics: [
          { id: 'brasil-colonia', label: 'Brasil Colônia' },
          { id: 'brasil-imperio', label: 'Brasil Império' },
          { id: 'republica', label: 'República' },
        ],
      },
      {
        id: 'historia-geral',
        label: 'História Geral',
        topics: [
          { id: 'antiga', label: 'Antiga' },
          { id: 'medieval', label: 'Medieval' },
          { id: 'moderna', label: 'Moderna' },
          { id: 'contemporanea', label: 'Contemporânea' },
        ],
      },
    ],
  },
];
