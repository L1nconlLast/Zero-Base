import {
  ENEM_AREA_GUIDANCE,
  ENEM_COGNITIVE_AXES,
  ORGANIZER_GUIDANCE,
  type EnemArea,
  type OrganizerProfile,
} from '../data/assessmentFrameworks';

interface StrategySummary {
  title: string;
  bullets: string[];
}

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const organizerAliases: Record<OrganizerProfile, string[]> = {
  cebraspe: ['cebraspe', 'cespe'],
  fcc: ['fcc', 'fundacao carlos chagas'],
  fgv: ['fgv', 'fundacao getulio vargas'],
};

const areaAliases: Record<EnemArea, string[]> = {
  Linguagens: ['linguagens', 'portugues', 'redacao'],
  Matematica: ['matematica', 'matematica e suas tecnologias'],
  Natureza: ['natureza', 'ciencias da natureza', 'fisica', 'quimica', 'biologia'],
  Humanas: ['humanas', 'ciencias humanas', 'historia', 'geografia', 'sociologia', 'filosofia'],
};

class ExamStrategyService {
  detectOrganizer(input: string): OrganizerProfile | null {
    const normalized = normalizeText(input);

    if (organizerAliases.cebraspe.some((alias) => normalized.includes(alias))) return 'cebraspe';
    if (organizerAliases.fcc.some((alias) => normalized.includes(alias))) return 'fcc';
    if (organizerAliases.fgv.some((alias) => normalized.includes(alias))) return 'fgv';

    return null;
  }

  detectEnemArea(input: string): EnemArea | null {
    const normalized = normalizeText(input);

    for (const [area, aliases] of Object.entries(areaAliases) as Array<[EnemArea, string[]]>) {
      if (aliases.some((alias) => normalized.includes(alias))) {
        return area;
      }
    }

    return null;
  }

  getEnemSummary(area?: EnemArea): StrategySummary {
    if (!area) {
      return {
        title: 'Estrategia ENEM por competencias',
        bullets: [
          `Ative os 5 eixos cognitivos: ${ENEM_COGNITIVE_AXES.map((axis) => axis.code).join(', ')}.`,
          'Priorize questoes contextualizadas e revisao por habilidade, nao so por conteudo.',
          'Feche cada semana com simulados interdisciplinares e analise de erro por causa-raiz.',
        ],
      };
    }

    const areaProfile = ENEM_AREA_GUIDANCE.find((item) => item.area === area);
    if (!areaProfile) {
      return this.getEnemSummary();
    }

    return {
      title: `ENEM - foco em ${areaProfile.area}`,
      bullets: [areaProfile.focus, ...areaProfile.highLeverageActions],
    };
  }

  getOrganizerSummary(organizer: OrganizerProfile): StrategySummary {
    const profile = ORGANIZER_GUIDANCE.find((item) => item.key === organizer);

    if (!profile) {
      return {
        title: 'Estrategia por banca',
        bullets: ['Mapeie o estilo da banca antes de aumentar volume de questoes.'],
      };
    }

    return {
      title: `${profile.label} - estrategia de prova`,
      bullets: [profile.signature, ...profile.strategy],
    };
  }

  buildMessageForMentor(input: string): string | null {
    const organizer = this.detectOrganizer(input);
    if (organizer) {
      const summary = this.getOrganizerSummary(organizer);
      return [summary.title, ...summary.bullets.map((item) => `• ${item}`)].join('\n');
    }

    if (normalizeText(input).includes('enem') || normalizeText(input).includes('matriz')) {
      const area = this.detectEnemArea(input);
      const summary = this.getEnemSummary(area || undefined);
      return [summary.title, ...summary.bullets.map((item) => `• ${item}`)].join('\n');
    }

    return null;
  }
}

export const examStrategyService = new ExamStrategyService();
