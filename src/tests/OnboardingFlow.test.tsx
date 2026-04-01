import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingFlow } from '../components/Onboarding/OnboardingFlow';

vi.mock('../utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('../services/mvpApi.service', () => ({
  mvpApiService: {
    getOnboardingStreak: vi.fn(() => new Promise(() => {})),
    saveOnboardingStreak: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

describe('OnboardingFlow', () => {
  it('mostra os quatro perfis como modos de estudo', () => {
    render(
      <OnboardingFlow
        userName="Lin"
        initialDailyGoal={60}
        initialMethodId="pomodoro"
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText('ENEM')).toBeInTheDocument();
    expect(screen.getByText('Concurso')).toBeInTheDocument();
    expect(screen.getByText('Hibrido')).toBeInTheDocument();
    expect(screen.getByText('Faculdade')).toBeInTheDocument();
    expect(screen.getByText('Outros')).toBeInTheDocument();
    expect(screen.getByText('Plano em montagem')).toBeInTheDocument();
  });

  it('aplica nivel inicial automaticamente quando o ENEM e a primeira vez do usuario', () => {
    render(
      <OnboardingFlow
        userName="Lin"
        initialDailyGoal={60}
        initialMethodId="pomodoro"
        onComplete={vi.fn()}
      />,
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null;
    const scoreInput = screen.getByPlaceholderText('Ex: 780');

    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput!, { target: { value: '2026-11-09' } });
    fireEvent.change(scoreInput, { target: { value: '720' } });
    fireEvent.click(screen.getByRole('button', { name: 'Não, primeira vez' }));

    expect(screen.getByText('Nível inicial aplicado automaticamente')).toBeInTheDocument();
    expect(screen.queryByText('Intermediário')).not.toBeInTheDocument();
    expect(screen.queryByText('Avançado')).not.toBeInTheDocument();
  });

  it('libera intermediario e avancado quando o usuario ja fez ENEM antes', () => {
    render(
      <OnboardingFlow
        userName="Lin"
        initialDailyGoal={60}
        initialMethodId="pomodoro"
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sim, já fiz' }));

    expect(screen.getByText('Intermediário')).toBeInTheDocument();
    expect(screen.getByText('Avançado')).toBeInTheDocument();
  });
  it('mostra o contexto completo de concurso com area, busca, banca e experiencia', () => {
    render(
      <OnboardingFlow
        userName="Lin"
        initialDailyGoal={60}
        initialMethodId="pomodoro"
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Concurso/i })[0]);

    expect(screen.getByText('Area principal')).toBeInTheDocument();
    expect(screen.getByText('Pesquisar concurso / edital')).toBeInTheDocument();
    expect(screen.getByText('Qual o seu momento com concursos?')).toBeInTheDocument();
    expect(screen.getByText('Quero so organizar ate sair o edital')).toBeInTheDocument();
  });

  it('abre o modo hibrido com foco principal, carga sustentavel e dois contextos de prova', () => {
    render(
      <OnboardingFlow
        userName="Lin"
        initialDailyGoal={60}
        initialMethodId="pomodoro"
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hibrido/i }));

    expect(screen.getByText('Bloco ENEM do modo hibrido')).toBeInTheDocument();
    expect(screen.getByText('Qual frente deve puxar mais sua rotina?')).toBeInTheDocument();
    expect(screen.getByText('Quanto tempo real voce consegue sustentar?')).toBeInTheDocument();
    expect(screen.getByText('Data da prova do concurso')).toBeInTheDocument();
  });

  it('seleciona um concurso, preenche a banca e libera continuar sem data quando o modo flexivel esta ativo', () => {
    render(
      <OnboardingFlow
        userName="Lin"
        initialDailyGoal={60}
        initialMethodId="pomodoro"
        onComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Concurso/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Policial/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('Ex: PF Administrativo, TJ, BB TI...'), { target: { value: 'PF Administrativo' } });
    fireEvent.click(screen.getByRole('button', { name: /PF Administrativo 2025/i }));
    fireEvent.click(screen.getByRole('button', { name: /Comecando agora/i }));
    fireEvent.click(screen.getByRole('checkbox'));

    const boardInput = screen.getByPlaceholderText('Ex: Cebraspe') as HTMLInputElement;
    const continueButton = screen.getByRole('button', { name: /Continuar estrat/i });

    expect(boardInput.value).toBe('Cebraspe');
    expect(screen.getByText(/Plano orientado pelo edital de PF Administrativo 2025/i)).toBeInTheDocument();
    expect(continueButton).toBeEnabled();
  });
});
