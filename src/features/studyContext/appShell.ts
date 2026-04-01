import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Compass,
  GraduationCap,
  Heart,
  Home,
  Map,
  Target,
} from 'lucide-react';

import type { AppSidebarNavSection } from '../../components/Layout/AppSidebar';
import type { StudyShellTabId } from './navigation';
import type { StudyContextMode } from './types';

export interface AppShellDomainDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultTab: StudyShellTabId;
  tabIds: StudyShellTabId[];
  eyebrow: string;
  description: string;
}

type NativeStudyContextMode = 'faculdade' | 'outros';

const FACULDADE_DOMAINS: AppShellDomainDefinition[] = [
  {
    id: 'inicio-domain',
    label: 'Home',
    icon: Home,
    defaultTab: 'inicio',
    tabIds: ['inicio'],
    eyebrow: 'Rotina academica',
    description: 'Resumo do curso, prioridades da semana e proximo passo da sua vida academica.',
  },
  {
    id: 'disciplinas-domain',
    label: 'Disciplinas',
    icon: GraduationCap,
    defaultTab: 'departamento',
    tabIds: ['departamento'],
    eyebrow: 'Estrutura do periodo',
    description: 'Veja materias, provas, trabalhos e o que precisa entrar no seu ritmo desta semana.',
  },
  {
    id: 'planejamento-domain',
    label: 'Planejamento',
    icon: Target,
    defaultTab: 'cronograma',
    tabIds: ['cronograma'],
    eyebrow: 'Carga da semana',
    description: 'Distribua blocos, organize prioridades e ajuste sua semana sem perder o contexto academico.',
  },
  {
    id: 'calendario-domain',
    label: 'Calendario',
    icon: CalendarDays,
    defaultTab: 'arvore',
    tabIds: ['arvore'],
    eyebrow: 'Prazos e provas',
    description: 'Centralize provas, entregas e revisoes da sua rotina academica em um unico lugar.',
  },
  {
    id: 'perfil-domain',
    label: 'Perfil',
    icon: Heart,
    defaultTab: 'perfil',
    tabIds: ['perfil'],
    eyebrow: 'Identidade academica',
    description: 'Revise curso, periodo, foco atual e o contexto salvo que orienta o restante do app.',
  },
];

const OUTROS_DOMAINS: AppShellDomainDefinition[] = [
  {
    id: 'inicio-domain',
    label: 'Visao geral',
    icon: Home,
    defaultTab: 'inicio',
    tabIds: ['inicio'],
    eyebrow: 'Central do foco',
    description: 'Veja onde voce esta, o melhor proximo passo e se o foco da semana esta realmente andando.',
  },
  {
    id: 'foco-domain',
    label: 'Meu foco',
    icon: Compass,
    defaultTab: 'departamento',
    tabIds: ['departamento'],
    eyebrow: 'Identidade do estudo',
    description: 'Mantenha claro o tema, o objetivo e o motivo que sustentam o seu estudo livre.',
  },
  {
    id: 'plano-domain',
    label: 'Plano',
    icon: Map,
    defaultTab: 'arvore',
    tabIds: ['arvore'],
    eyebrow: 'Estrutura da evolucao',
    description: 'Organize trilha, backlog e revisoes sem transformar o estudo livre em um painel pesado.',
  },
  {
    id: 'execucao-domain',
    label: 'Execucao',
    icon: Target,
    defaultTab: 'cronograma',
    tabIds: ['cronograma'],
    eyebrow: 'O que fazer agora',
    description: 'Transforme trilha em acao com um proximo passo claro, revisoes pendentes e continuidade objetiva.',
  },
  {
    id: 'ritmo-domain',
    label: 'Ritmo',
    icon: CalendarDays,
    defaultTab: 'dashboard',
    tabIds: ['dashboard'],
    eyebrow: 'Constancia do foco',
    description: 'Acompanhe sequencia, meta semanal, agenda util e alertas sem misturar outros modos do app.',
  },
  {
    id: 'perfil-domain',
    label: 'Perfil',
    icon: Heart,
    defaultTab: 'perfil',
    tabIds: ['perfil'],
    eyebrow: 'Narrativa do foco',
    description: 'Revise tema, objetivo, ritmo e progresso acumulado sem perder a identidade do contexto atual.',
  },
];

export const isNativeStudyContextMode = (
  mode: StudyContextMode | null | undefined,
): mode is NativeStudyContextMode => mode === 'faculdade' || mode === 'outros';

export const getNativeShellDomains = (
  mode: NativeStudyContextMode,
): AppShellDomainDefinition[] => (mode === 'faculdade' ? FACULDADE_DOMAINS : OUTROS_DOMAINS);

export const getNativeSidebarSections = (
  mode: NativeStudyContextMode,
  activeTab: string,
): AppSidebarNavSection[] => {
  if (mode === 'faculdade') {
    return [
      {
        id: 'faculdade-principal',
        label: 'Faculdade',
        items: [
          {
            id: 'faculdade-home-nav',
            label: 'Home',
            meta: 'Rotina academica',
            icon: Home,
            tabId: 'inicio',
            isActive: activeTab === 'inicio',
          },
          {
            id: 'faculdade-disciplinas-nav',
            label: 'Disciplinas',
            meta: 'Materias, provas e trabalhos',
            icon: GraduationCap,
            tabId: 'departamento',
            isActive: activeTab === 'departamento',
          },
          {
            id: 'faculdade-planejamento-nav',
            label: 'Planejamento',
            meta: 'Carga e prioridades',
            icon: Target,
            tabId: 'cronograma',
            isActive: activeTab === 'cronograma',
          },
          {
            id: 'faculdade-calendario-nav',
            label: 'Calendario',
            meta: 'Prazos e revisoes',
            icon: CalendarDays,
            tabId: 'arvore',
            isActive: activeTab === 'arvore',
          },
          {
            id: 'faculdade-perfil-nav',
            label: 'Perfil',
            meta: 'Contexto academico',
            icon: Heart,
            tabId: 'perfil',
            isActive: activeTab === 'perfil',
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'outros-principal',
      label: 'Modo Livre',
      items: [
        {
          id: 'outros-home-nav',
          label: 'Visao geral',
          meta: 'Onde voce esta agora',
          icon: Home,
          tabId: 'inicio',
          isActive: activeTab === 'inicio',
        },
        {
          id: 'outros-foco-nav',
          label: 'Meu foco',
          meta: 'Tema e objetivo',
          icon: Compass,
          tabId: 'departamento',
          isActive: activeTab === 'departamento',
        },
        {
          id: 'outros-plano-nav',
          label: 'Plano',
          meta: 'Trilha e backlog',
          icon: Map,
          tabId: 'arvore',
          isActive: activeTab === 'arvore',
        },
        {
          id: 'outros-execucao-nav',
          label: 'Execucao',
          meta: 'Passo atual e revisoes',
          icon: Target,
          tabId: 'cronograma',
          isActive: activeTab === 'cronograma',
        },
        {
          id: 'outros-ritmo-nav',
          label: 'Ritmo',
          meta: 'Sequencia e semana',
          icon: CalendarDays,
          tabId: 'dashboard',
          isActive: activeTab === 'dashboard',
        },
        {
          id: 'outros-perfil-nav',
          label: 'Perfil',
          meta: 'Contexto do modo livre',
          icon: Heart,
          tabId: 'perfil',
          isActive: activeTab === 'perfil',
        },
      ],
    },
  ];
};

export const NATIVE_SHELL_TAB_IDS = new Set<StudyShellTabId>([
  'inicio',
  'departamento',
  'cronograma',
  'arvore',
  'dashboard',
  'perfil',
]);

export const canResolveNativeShellTab = (
  mode: StudyContextMode | null | undefined,
  tabId: string,
): boolean => isNativeStudyContextMode(mode) && NATIVE_SHELL_TAB_IDS.has(tabId as StudyShellTabId);

export const getNativeShellModeLabel = (
  mode: NativeStudyContextMode,
): string => (mode === 'faculdade' ? 'Faculdade' : 'Outros');

export const getNativeShellQuickAction = (
  mode: NativeStudyContextMode,
): {
  heading: string;
  description: string;
  actionLabel: string;
  compactLabel: string;
  targetTab: StudyShellTabId;
} => (
  mode === 'faculdade'
    ? {
        heading: 'Planejamento academico',
        description: 'Ajuste a semana antes que provas, trabalhos e revisoes comecem a competir entre si.',
        actionLabel: 'Abrir planejamento',
        compactLabel: 'Planejar',
        targetTab: 'cronograma',
      }
    : {
        heading: 'Comecar agora',
        description: 'Abra a execucao do foco atual com o proximo passo pronto para virar acao.',
        actionLabel: 'Abrir execucao',
        compactLabel: 'Executar',
        targetTab: 'cronograma',
      }
);

export const getNativeShellQuickStats = (
  mode: NativeStudyContextMode,
): Array<{ label: string; value: string }> => (
  mode === 'faculdade'
    ? [
        { label: 'Modo', value: 'Faculdade' },
        { label: 'Centro', value: 'Disciplinas' },
        { label: 'Ritmo', value: 'Semana academica' },
        { label: 'Leitura', value: 'Provas e trabalhos' },
      ]
    : [
        { label: 'Modo', value: 'Outros' },
        { label: 'Centro', value: 'Foco atual' },
        { label: 'Ritmo', value: 'Constancia isolada' },
        { label: 'Leitura', value: 'Plano e execucao' },
      ]
);

export const getNativeShellHeroMeta = (
  mode: NativeStudyContextMode,
): {
  tabLabel: string;
  detail: string;
} => (
  mode === 'faculdade'
    ? {
        tabLabel: 'Shell academico',
        detail: 'Experiencia focada em disciplinas, planejamento da semana e calendario academico.',
      }
    : {
        tabLabel: 'Shell de foco pessoal',
        detail: 'Experiencia organizada por visao geral, foco, plano, execucao, ritmo e perfil.',
      }
);
