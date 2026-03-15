# 4. Resultados e Validação

## Resultados observados
- padronização de nomenclatura para Zero Base em documentos críticos;
- criação de pacote documental objetivo para contexto acadêmico;
- melhoria da previsibilidade do fluxo de teste em integração contínua;
- registro de melhorias técnicas e operacionais em artefatos versionados.
- geração de evidências visuais e relatório Lighthouse real a partir da demo publicada.
- correção do fallback de autenticação para modo local quando o Supabase não está configurado.

## Indicadores qualitativos
- maior rastreabilidade das alterações;
- redução de ambiguidades na comunicação técnica;
- melhor separação entre documentação de produto e documentação para banca.

## Indicadores quantitativos (quando aplicável)
Métricas preenchidas com base em execução local em 14/03/2026:

Tabela 1 - Métricas reais de validação técnica do Zero Base

| Métrica | Valor Real | Método de Coleta | Evidência |
| --- | --- | --- | --- |
| Testes unitários | 128 testes aprovados em 12 arquivos | Execução de `npm run test -- --run` | Saída do Vitest (sem falhas) |
| Build de produção | concluído em 8.45s | Execução de `npm run build` | Saída do Vite com build finalizado |
| PWA (precache) | 67 entradas, 2281.42 KiB | Execução de `npm run build` (plugin PWA) | Bloco final da saída: `precache 67 entries` |
| Lighthouse - Performance | 99 | Execução de `npx lighthouse https://zero-base-three.vercel.app` | `docs/banca_ifpi/assets/lighthouse-report.report.html` |
| Lighthouse - Accessibility | 98 | Execução de `npx lighthouse https://zero-base-three.vercel.app` | `docs/banca_ifpi/assets/lighthouse-report.report.html` |
| Lighthouse - Best Practices | 100 | Execução de `npx lighthouse https://zero-base-three.vercel.app` | `docs/banca_ifpi/assets/lighthouse-report.report.html` |
| Entregas recentes | 36 commits desde 01/03/2026 (HEAD local) | Execução de `git rev-list --count --since='2026-03-01' HEAD` | Saída do Git com total de commits |
| Status da demo pública | ativa em produção | Deploy Vercel + verificação de URL pública | `https://zero-base-three.vercel.app` acessível em 14/03/2026 |
| Fluxo de login sem Supabase | fallback local ativo e persistente | Teste automatizado `src/tests/useAuth.test.ts` + build de produção | 17 testes de auth aprovados e `npm run build` sem erro |

## Testes com usuários - síntese descritiva
Tabela 2 - Registro resumido de feedbacks exploratórios

| Perfil | Modalidade | Objetivo observado | Feedback resumido |
| --- | --- | --- | --- |
| Estudante da área da saúde 1 | exploração guiada | compreender dashboard e progresso | navegação clara, mas pediu mais destaque para metas semanais |
| Estudante da área da saúde 2 | uso livre | testar timer e rotina | considerou o timer útil para foco e revisão curta |
| Estudante da área da saúde 3 | exploração guiada | interpretar relatórios e gamificação | achou relatórios úteis, sugeriu notificações em evolução futura |

Observação: esta tabela resume validação exploratória informal e não substitui estudo com protocolo formal e termo de consentimento.

## Validação mínima recomendada
1. Repositório em estado limpo após as alterações.
2. Commits publicados na branch principal.
3. Execução de testes de smoke sem falhas críticas.
4. Documentação principal atualizada e coerente.

## Conclusão desta etapa
A etapa de organização técnica foi concluída com foco em evidência, mantendo escopo realista e aderência ao contexto acadêmico.

## Evidências visuais inseridas
- Tela principal (dashboard): `docs/banca_ifpi/assets/tela_dashboard.svg`
- Tela de sessão/timer: `docs/banca_ifpi/assets/tela_timer.svg`
- Tela de relatórios: `docs/banca_ifpi/assets/tela_relatorios.svg`
- Diagrama de arquitetura: `docs/banca_ifpi/assets/diagrama_arquitetura.svg`
- Relatório Lighthouse: `docs/banca_ifpi/assets/lighthouse-report.report.html`
