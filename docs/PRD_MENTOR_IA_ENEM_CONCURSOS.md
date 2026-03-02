# PRD Técnico — Mentor IA (ENEM & Concursos)

## 1. Visão
O Mentor IA é uma camada de comunicação estratégica que:
- não decide o cronograma; explica e orienta sobre decisões do `smartScheduleEngine`;
- opera por gatilhos controlados e custo previsível;
- possui fallback determinístico quando LLM não está disponível.

## 2. Escopo MVP
### Inclui
- Briefing semanal automático
- Alertas contextuais (inatividade, meta baixa)
- Chat guiado com guardrails
- Modos de mentor: `default`, `reta_final`, `recovery`

### Não inclui
- Alteração autônoma de carga
- Chat livre sem restrições
- Contradição de decisões do engine

## 3. Arquitetura
Frontend
→ `mentorBriefingService.getBriefing`
→ `smartScheduleEngine` (decisão base)
→ `mentorLLMService` (opcional por feature flag)
→ `mentorResponseValidatorService`
→ resposta final

Fallback: se LLM falhar/desligado, usar template local determinístico.

## 4. Contrato de saída
```json
{
  "prioridade": "string curta e objetiva",
  "justificativa": "por que isso é prioridade agora",
  "acao_semana": ["ação prática 1", "ação prática 2"],
  "tom": "default | reta_final | recovery",
  "mensagem_motivacional": "até 2 frases"
}
```

### Regras de validação
- não contradizer `engineDecision`
- não sugerir carga extra
- não citar dados inexistentes
- `acao_semana` deve estar dentro do plano decidido

## 5. Política de gatilhos
- `weekly_start`
- `inactivity_48h`
- `goal_below_70`
- `chat_opened`
- `final_30_days`

Limite de custo: máximo de 2 chamadas LLM por semana por aluno.

## 6. Modos de mentor
- `reta_final`: `daysToExam <= 30`
- `recovery`: gatilho de inatividade >= 48h
- `default`: demais casos

## 7. Implementação atual no repositório
- Contratos: `src/types/mentor.ts`
- Endpoint lógico: `src/services/mentorBriefing.service.ts`
- LLM opcional (feature flag): `src/services/mentorLLM.service.ts`
- Guardrails/validação: `src/services/mentorResponseValidator.service.ts`
- UI integrada: `src/components/AI/MentorIA.tsx`

## 8. Próximos passos
1. Substituir `mentorLLMService` stub por integração real com provedor LLM.
2. Persistir logs de briefing (trigger, source, modo, adesão).
3. Expor métricas de aderência D7/D30 em dashboard interno.
