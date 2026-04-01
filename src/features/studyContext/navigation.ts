import type { StudyContextMode } from './types';

export type StudyShellTabId =
  | 'inicio'
  | 'perfil'
  | 'departamento'
  | 'arvore'
  | 'cronograma'
  | 'metodos'
  | 'foco'
  | 'questoes'
  | 'flashcards'
  | 'simulado'
  | 'dashboard'
  | 'conquistas'
  | 'mentor'
  | 'mentor-admin'
  | 'vespera'
  | 'grupos'
  | 'ranking-global'
  | 'configuracoes'
  | 'dados';

export interface StudyShellTabDefinition {
  id: StudyShellTabId;
  label: string;
}

const CORE_TABS: StudyShellTabDefinition[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'departamento', label: 'Disciplinas' },
  { id: 'cronograma', label: 'Planejamento' },
  { id: 'arvore', label: 'Trilha' },
  { id: 'perfil', label: 'Perfil' },
];

const TABS_BY_MODE: Record<StudyContextMode, StudyShellTabDefinition[]> = {
  enem: [
    { id: 'inicio', label: 'Inicio' },
    { id: 'cronograma', label: 'Plano' },
    { id: 'foco', label: 'Estudo' },
    { id: 'flashcards', label: 'Revisoes' },
    { id: 'perfil', label: 'Perfil' },
  ],
  concurso: [
    { id: 'inicio', label: 'Inicio' },
    { id: 'cronograma', label: 'Plano' },
    { id: 'foco', label: 'Estudo' },
    { id: 'flashcards', label: 'Revisoes' },
    { id: 'perfil', label: 'Perfil' },
  ],
  faculdade: [
    { id: 'inicio', label: 'Home' },
    { id: 'departamento', label: 'Disciplinas' },
    { id: 'cronograma', label: 'Planejamento' },
    { id: 'arvore', label: 'Calendario' },
    { id: 'perfil', label: 'Perfil' },
  ],
  outros: [
    { id: 'inicio', label: 'Visao geral' },
    { id: 'departamento', label: 'Meu foco' },
    { id: 'arvore', label: 'Plano' },
    { id: 'cronograma', label: 'Execucao' },
    { id: 'dashboard', label: 'Ritmo' },
    { id: 'perfil', label: 'Perfil' },
  ],
  hibrido: [
    { id: 'inicio', label: 'Inicio' },
    { id: 'cronograma', label: 'Plano' },
    { id: 'foco', label: 'Estudo' },
    { id: 'flashcards', label: 'Revisoes' },
    { id: 'perfil', label: 'Perfil' },
  ],
};

export const getTabsForMode = (
  mode: StudyContextMode | null | undefined,
): StudyShellTabDefinition[] => {
  if (!mode) {
    return CORE_TABS;
  }

  return TABS_BY_MODE[mode];
};

export const getInitialRouteForMode = (
  mode: StudyContextMode | null | undefined,
): StudyShellTabId => getTabsForMode(mode)[0]?.id || 'inicio';

export const resolveStudyContextRoute = (
  mode: StudyContextMode | null | undefined,
  requestedTab?: string | null,
): StudyShellTabId => {
  const tabs = getTabsForMode(mode);
  const matched = tabs.find((tab) => tab.id === requestedTab);
  return matched?.id || getInitialRouteForMode(mode);
};
