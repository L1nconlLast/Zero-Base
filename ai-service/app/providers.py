import os
from datetime import datetime, timedelta, timezone
from typing import List

from .schemas import PlannerGenerateInput, PlannerGenerateOutput, PlannerItem, TutorExplainInput, TutorExplainOutput


def _utc_today_iso(offset_days: int = 0) -> str:
    today = datetime.now(tz=timezone.utc).date() + timedelta(days=offset_days)
    return today.isoformat()


def _safe_goals(goals: List[str]) -> List[str]:
    filtered = [goal.strip() for goal in goals if goal and goal.strip()]
    return filtered or ['Matematica', 'Portugues', 'Ciencias da Natureza', 'Humanas', 'Redacao']


class AIProvider:
    def __init__(self) -> None:
        self.provider = (os.getenv('AI_PROVIDER') or 'local').strip().lower()
        self.openai_api_key = (os.getenv('OPENAI_API_KEY') or '').strip()
        self.google_api_key = (os.getenv('GOOGLE_API_KEY') or '').strip()

    def is_available(self) -> bool:
        if self.provider == 'openai':
            return bool(self.openai_api_key)
        if self.provider == 'google':
            return bool(self.google_api_key)
        return True

    def explain_tutor(self, payload: TutorExplainInput) -> TutorExplainOutput:
        # Fallback seguro e deterministico enquanto integracao com provedor externo nao estiver disponivel.
        return TutorExplainOutput(
            explanation=(
                f"{payload.topic} ({payload.context}) pode ser estudado em 3 passos: conceito central, aplicacao em questoes e revisao ativa. "
                f"Para nivel {payload.userLevel}, priorize exemplos de prova e resolucao guiada antes de aumentar dificuldade."
            ),
            practicalExample=(
                f"Exemplo pratico: escolha 1 questao de {payload.topic}, sublinhe dados-chave, monte a estrategia e resolva em 10 minutos."
            ),
            exercise=(
                f"Mini exercicio: explique {payload.topic} com suas palavras em 5 linhas e resolva 2 questoes do mesmo assunto."
            ),
            answerGuide=(
                "Gabarito esperado: identificar conceito correto, justificar cada passo e revisar o erro mais comum do tema."
            ),
        )

    def generate_planner(self, payload: PlannerGenerateInput) -> PlannerGenerateOutput:
        goals = _safe_goals(payload.goals)
        weak = payload.weakSkills or []

        weekly_plan: List[PlannerItem] = []
        for idx in range(7):
            hours = max(0.5, min(float(payload.availableHoursPerDay[idx]), 12.0))
            subject = goals[idx % len(goals)]
            skill = weak[idx % len(weak)] if weak else None
            weekly_plan.append(
                PlannerItem(
                    date=_utc_today_iso(idx),
                    subject=subject,
                    skill=skill,
                    durationMin=max(30, int(hours * 60)),
                )
            )

        return PlannerGenerateOutput(weeklyPlan=weekly_plan)
