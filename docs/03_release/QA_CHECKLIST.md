# QA Checklist

## Checklist operacional

| Item | Teste | OK | Falhou | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | Onboarding -> primeira missao | ☐ | ☐ |  |
| 2 | Iniciante -> bloqueios | ☐ | ☐ |  |
| 3 | Iniciante -> week summary | ☐ | ☐ |  |
| 4 | Estudo -> foco -> pos-foco -> questoes | ☐ | ☐ |  |
| 5 | Intermediario -> autonomia guiada | ☐ | ☐ |  |
| 6 | Avancado -> home estrategica | ☐ | ☐ |  |
| 7 | Modo interno -> troca de fases | ☐ | ☐ |  |
| 8 | Modo interno -> reset sem contaminacao | ☐ | ☐ |  |
| 9 | DataManagement -> snapshots e prioridades | ☐ | ☐ |  |
| 10 | Pos-deploy -> checklist docs | ☐ | ☐ |  |

## Criterio de evidencia

Preencher com uma destas opcoes:

- print
- video curto
- URL
- texto do erro
- comportamento observado

## Execucao rapida

### 1. Onboarding -> primeira missao

Esperado: onboarding conclui, home mostra a primeira missao e CTA claro para comecar foco.

Evidencia: print da home final.

### 2. Iniciante -> bloqueios

Esperado: abas bloqueadas mostram bloqueio sem quebrar navegacao.

Evidencia: print do bloqueio.

### 3. Iniciante -> week summary

Esperado: ao fim da sequencia, resumo da semana aparece corretamente.

Evidencia: print do resumo.

### 4. Estudo -> foco -> pos-foco -> questoes

Esperado: comeca foco, encerra sessao, mostra pos-foco e segue para questoes com contexto.

Evidencia: 3 prints ou video curto.

### 5. Intermediario -> autonomia guiada

Esperado: plano do dia, continuidade automatica, ferramentas recomendadas, sem excesso de escolhas.

Evidencia: print da home.

### 6. Avancado -> home estrategica

Esperado: saude da semana, ajuste recomendado e CTA de execucao.

Evidencia: print da home.

### 7. Modo interno -> troca de fases

Esperado: alterna entre Auto, Iniciante, Intermediario e Avancado sem travar UI.

Evidencia: print por fase ou video curto.

### 8. Modo interno -> reset

Esperado: reset limpa override e nao contamina fluxo real.

Evidencia: print antes/depois.

### 9. DataManagement

Esperado: snapshots, prioridades, top 3 e scorecards carregam sem erro.

Evidencia: print do painel.

### 10. Pos-deploy

Esperado: checklist e fluxo dos docs executados sem pendencias.

Evidencia: notas finais.

## Referencias

- [docs/CHECKLIST_POS_DEPLOY_VERCEL.md](docs/CHECKLIST_POS_DEPLOY_VERCEL.md)
- [docs/DEPLOY_STAGING_PROD.md](docs/DEPLOY_STAGING_PROD.md)

## Saida final sugerida

- **Aprovados:** X/10
- **Falharam:** Y/10
- **Bloqueadores:** listar so os que impedem deploy
- **Ajustes menores:** listar o resto
- **Pronto para commit/deploy:** Sim / Nao
