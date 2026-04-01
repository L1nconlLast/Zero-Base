import { describe, expect, it } from 'vitest';

import {
  canResolveNativeShellTab,
  getNativeShellDomains,
  getNativeShellQuickAction,
  getNativeSidebarSections,
  isNativeStudyContextMode,
} from '../features/studyContext';

describe('study context shell', () => {
  it('detects native modes only for faculdade and outros', () => {
    expect(isNativeStudyContextMode('faculdade')).toBe(true);
    expect(isNativeStudyContextMode('outros')).toBe(true);
    expect(isNativeStudyContextMode('enem')).toBe(false);
    expect(isNativeStudyContextMode('concurso')).toBe(false);
  });

  it('exposes faculdade domains in academic order', () => {
    expect(getNativeShellDomains('faculdade').map((domain) => domain.label)).toEqual([
      'Home',
      'Disciplinas',
      'Planejamento',
      'Calendario',
      'Perfil',
    ]);
  });

  it('exposes outros sidebar with the specialized shell domains', () => {
    const sections = getNativeSidebarSections('outros', 'departamento');
    expect(sections[0]?.items.map((item) => item.label)).toEqual([
      'Visao geral',
      'Meu foco',
      'Plano',
      'Execucao',
      'Ritmo',
      'Perfil',
    ]);
    expect(sections[0]?.items.find((item) => item.tabId === 'departamento')?.isActive).toBe(true);
  });

  it('keeps native shell tabs limited to shell routes', () => {
    expect(canResolveNativeShellTab('faculdade', 'inicio')).toBe(true);
    expect(canResolveNativeShellTab('outros', 'arvore')).toBe(true);
    expect(canResolveNativeShellTab('faculdade', 'mentor')).toBe(false);
    expect(canResolveNativeShellTab('enem', 'inicio')).toBe(false);
  });

  it('provides shell quick actions aligned with native modes', () => {
    expect(getNativeShellQuickAction('faculdade')).toMatchObject({
      actionLabel: 'Abrir planejamento',
      targetTab: 'cronograma',
    });

    expect(getNativeShellQuickAction('outros')).toMatchObject({
      actionLabel: 'Abrir execucao',
      targetTab: 'cronograma',
    });
  });
});
