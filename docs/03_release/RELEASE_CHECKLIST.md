# Release Checklist

Checklist enxuto para cada deploy do beta fechado.

## Pre-deploy

- [ ] `build` local passou
- [ ] testes direcionados do loop central passaram
- [ ] `Preview` confirmado via painel/API da Vercel
- [ ] nenhuma env critica depende de injecao manual no comando

## Golden path

- [ ] smoke central `7/7` passou
- [ ] `Estudos -> Finalizar -> Inicio/Plano` validado
- [ ] revisao `24h` foi criada
- [ ] `reload` manteve o estado coerente

## Visual e runtime

- [ ] `Home` ok
- [ ] `Plano` ok
- [ ] `Dashboard` ok
- [ ] `Dashboard -> Relatorio Semanal` ok (`pie` centralizado, legenda limpa, sem texto tecnico e sem overflow)
- [ ] `Mentor IA` ok
- [ ] dark mode ok
- [ ] mobile basico ok
- [ ] console limpo

## Regras operacionais

- [ ] sem feature nova no meio do beta
- [ ] sem refatoracao fora de bug fix ou micro UX
- [ ] feedback novo esta entrando em uma unica fonte de verdade seguindo `BETA_TRIAGEM_FEEDBACK.md`
- [ ] freeze documentado com URL, commit-base e artefatos
- [ ] flakes de runner ficam registrados como divida de QA separada e nao reabrem bug de produto sem evidencia funcional
