import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PostExecutionBand } from '../features/estudos/components/PostExecutionBand';
import type { PostExecutionBandData } from '../features/estudos';

const createBandData = (): PostExecutionBandData => ({
  context: {
    contextLabel: 'Matematica / Porcentagem',
    parentLabel: 'ENEM / Ciclo guiado',
    sequenceLabel: 'Etapa 1 de 3 / 300 min na semana',
  },
  continuity: {
    nextStepLabel: 'Depois desta sessao: validar 3 questoes e registrar o bloco.',
    followUpLabel: 'A continuidade aparece aqui so para fechar o fluxo desta sessao com o plano maior.',
    progressHintLabel: 'Ritmo ativo: Ciclo guiado',
  },
});

describe('PostExecutionBand', () => {
  it('renderiza contexto resumido e continuidade discreta', () => {
    render(<PostExecutionBand data={createBandData()} />);

    expect(screen.getByTestId('study-post-execution-band')).toBeInTheDocument();
    expect(screen.getByTestId('study-post-execution-context')).toHaveTextContent('Contexto do bloco');
    expect(screen.getByTestId('study-post-execution-continuity')).toHaveTextContent('Depois desta sessao');
    expect(screen.getByText('Matematica / Porcentagem')).toBeInTheDocument();
    expect(screen.getByText('ENEM / Ciclo guiado / Etapa 1 de 3 / 300 min na semana')).toBeInTheDocument();
    expect(screen.getByText('Depois desta sessao: validar 3 questoes e registrar o bloco.')).toBeInTheDocument();
    expect(screen.getByText('Ritmo ativo: Ciclo guiado')).toBeInTheDocument();
  });

  it('permanece estavel sem campos opcionais', () => {
    render(
      <PostExecutionBand
        data={{
          context: {
            contextLabel: 'Historia / Revolucao Francesa',
          },
          continuity: {
            nextStepLabel: 'Depois desta sessao: registrar o bloco e seguir para a proxima etapa.',
          },
        }}
      />,
    );

    expect(screen.getByText('Historia / Revolucao Francesa')).toBeInTheDocument();
    expect(screen.getByText('Depois desta sessao: registrar o bloco e seguir para a proxima etapa.')).toBeInTheDocument();
    expect(screen.queryByText('Ritmo ativo: Ciclo guiado')).not.toBeInTheDocument();
  });
});
