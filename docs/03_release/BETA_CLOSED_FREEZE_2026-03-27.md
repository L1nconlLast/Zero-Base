# Beta Closed Freeze - 2026-03-27

Status: approved for closed beta
Reviewed on: 2026-03-27 (America/Sao_Paulo)

## Source of truth

- Preview URL validada: `https://zero-base-qn0exu67a-l1nconllasts-projects.vercel.app`
- Projeto Vercel: `zero-base`
- Git HEAD no momento do freeze: `084d3d444ef653bfea0ae8b02d3eb78cb08f8c2f`
- Artefato principal de validacao: `qa-artifacts/estudos-finish-loop-smoke-report.json`

## Resultado validado

- `build` local: ok
- Testes direcionados: `35/35`
- Smoke remoto do loop central: `7/7`
- Inspecao visual de staging: concluida
- Console/exceptions no preview validado: limpo
- Dark mode validado em `Home`, `Dashboard` e `Mentor IA`
- Responsividade basica validada em `Home` e `Plano`
- Overflow horizontal nas telas capturadas: nao encontrado

## Golden path de release

Fluxo obrigatorio para qualquer validacao de beta:

1. `Inicio`
2. `Plano`
3. `Estudos`
4. `Finalizar sessao`
5. `Inicio` reflete
6. `Plano` reflete
7. Revisao `24h` criada
8. `Reload` preserva o estado

## Evidencias

- Screenshots desktop/light: `qa-artifacts/estudos-finish-home-review-queue.png`, `qa-artifacts/estudos-finish-plan-review-block.png`, `qa-artifacts/estudos-finish-dashboard-light.png`, `qa-artifacts/estudos-finish-mentor-light.png`
- Screenshots dark: `qa-artifacts/estudos-finish-home-dark.png`, `qa-artifacts/estudos-finish-dashboard-dark.png`, `qa-artifacts/estudos-finish-mentor-dark.png`
- Screenshots mobile: `qa-artifacts/estudos-finish-home-mobile.png`, `qa-artifacts/estudos-finish-plan-mobile.png`

## Nota operacional

- `Preview` deve continuar configurado via painel/API oficial da Vercel. Nao usar env injetada como padrao.
- O smoke remoto agora aceita `x-vercel-protection-bypass` para previews protegidos.
- Durante o smoke em preview protegido, o registro de service worker e neutralizado apenas no seed de QA para evitar falso negativo operacional da protecao da Vercel.

## Observacao de reprodutibilidade

- Este freeze registra a URL validada, os artefatos e o commit-base atual.
- O preview aprovado foi gerado a partir do workspace atual desta maquina. Antes de ampliar o beta ou promover para producao, gerar um commit/tag dedicado para transformar este estado validado em referencia Git exata.
