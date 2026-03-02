import type { StudySession } from '../types';

type ChartDayData = {
  name: string;
  horas: number;
  meta: number;
  detalhes: Record<string, number>;
};

export const processarDadosSemanais = (
  sessoes: StudySession[],
  metaDiariaMinutos: number
): ChartDayData[] => {
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hoje = new Date();

  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const data = new Date();
    data.setDate(hoje.getDate() - (6 - i));
    return {
      dataCompleta: data.toLocaleDateString(),
      diaSemana: diasSemana[data.getDay()],
      minutos: 0,
      detalhes: {} as Record<string, number>,
    };
  });

  if (Array.isArray(sessoes)) {
    sessoes.forEach((sessao) => {
      try {
        const dataSessao = new Date(sessao.date).toLocaleDateString();
        const diaEncontrado = ultimos7Dias.find((d) => d.dataCompleta === dataSessao);

        if (!diaEncontrado) {
          return;
        }

        const duracao = sessao.duration ?? sessao.minutes ?? 0;
        if (duracao <= 0) {
          return;
        }

        diaEncontrado.minutos += duracao;
        const materia = sessao.subject || 'Outra';
        diaEncontrado.detalhes[materia] = (diaEncontrado.detalhes[materia] || 0) + duracao;
      } catch (error) {
        console.warn('Erro ao processar sessão semanal:', error);
      }
    });
  }

  return ultimos7Dias.map((dia) => ({
    name: dia.diaSemana,
    horas: Number((dia.minutos / 60).toFixed(1)),
    meta: Number((metaDiariaMinutos / 60).toFixed(1)),
    detalhes: dia.detalhes,
  }));
};