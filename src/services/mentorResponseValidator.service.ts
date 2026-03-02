import type { EngineDecision, MentorOutput } from '../types/mentor';

export interface MentorResponseValidator {
  validate(output: MentorOutput, engineDecision: EngineDecision): { valid: boolean; reasons: string[] };
}

class MentorResponseValidatorService implements MentorResponseValidator {
  validate(output: MentorOutput, engineDecision: EngineDecision) {
    const reasons: string[] = [];

    if (!output.prioridade?.trim()) reasons.push('prioridade ausente');
    if (!output.justificativa?.trim()) reasons.push('justificativa ausente');
    if (!Array.isArray(output.acao_semana) || output.acao_semana.length === 0) reasons.push('acao_semana ausente');
    if (!['default', 'reta_final', 'recovery'].includes(output.tom)) reasons.push('tom inválido');

    const forbidden = /(aumente\s+horas|carga\s+extra|atalho|garantido|vai\s+cair)/i;
    const allText = [output.prioridade, output.justificativa, output.mensagem_motivacional, ...output.acao_semana].join(' ');
    if (forbidden.test(allText)) {
      reasons.push('contém sugestão proibida');
    }

    const engineActions = new Set(engineDecision.acoesSemana.map((action) => action.toLowerCase().trim()));
    const invalidActions = output.acao_semana.filter((action) => !engineActions.has(action.toLowerCase().trim()));
    if (invalidActions.length > 0) {
      reasons.push('acao_semana fora do plano');
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }
}

export const mentorResponseValidatorService = new MentorResponseValidatorService();
