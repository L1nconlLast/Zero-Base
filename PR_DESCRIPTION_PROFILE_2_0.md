# PR: Perfil 2.0 — refactor completo + persistência real

## Resumo
Esta PR conclui a evolução de Perfil 2.0 com substituição estrutural da interface legada, integração completa com backend dedicado e base pronta para evolução contínua de identidade, progresso e personalização.

## Objetivo
- Trocar os blocos antigos de Perfil/Estatísticas por componentes V2 desacoplados
- Consolidar persistência de perfil, notificações, atividade e conquistas
- Garantir UX robusta com fallback local e smoke de validação pronto

## Escopo entregue

### Frontend
- [x] Aba Perfil substituída por ProfileV2
- [x] Aba Estatísticas substituída por ProfileStatsV2
- [x] Upload real de avatar via endpoint multipart
- [x] Load e save de perfil via API
- [x] Save de notificações via API
- [x] Heatmap de 365 dias renderizado
- [x] Conquistas conectadas ao backend com fallback local seguro
- [x] Settings mantido como orquestrador de estado e integração

### Backend
- [x] Endpoints de Perfil 2.0 no padrão route/controller/service
- [x] GET /api/profile/load
- [x] POST /api/profile/save
- [x] POST /api/profile/notifications
- [x] POST /api/profile/avatar/upload
- [x] POST /api/activity/track
- [x] Autenticação aplicada nos endpoints (401 sem token)
- [x] Migration incremental sem quebra de schema legado
- [x] Upload em storage com persistência de URL
- [x] Tracking diário por upsert + níveis de intensidade do heatmap

## Principais arquivos
- [src/pages/Settings.tsx](src/pages/Settings.tsx)
- [src/components/profile/ProfileV2.tsx](src/components/profile/ProfileV2.tsx)
- [src/components/profile/ProfileHero.tsx](src/components/profile/ProfileHero.tsx)
- [src/components/profile/ProfileIdentityCard.tsx](src/components/profile/ProfileIdentityCard.tsx)
- [src/components/profile/ProfileAvatarCard.tsx](src/components/profile/ProfileAvatarCard.tsx)
- [src/components/profile/ProfileStatsV2.tsx](src/components/profile/ProfileStatsV2.tsx)
- [server/src/routes/profile.routes.ts](server/src/routes/profile.routes.ts)
- [server/src/routes/activity.routes.ts](server/src/routes/activity.routes.ts)
- [server/src/controllers/profile.controller.ts](server/src/controllers/profile.controller.ts)
- [server/src/controllers/activity.controller.ts](server/src/controllers/activity.controller.ts)
- [server/src/services/profile.service.ts](server/src/services/profile.service.ts)
- [server/src/services/activity.service.ts](server/src/services/activity.service.ts)
- [supabase/migrations/20260317000112_profile_2_0.sql](supabase/migrations/20260317000112_profile_2_0.sql)
- [scripts/smoke-profile-assert.ps1](scripts/smoke-profile-assert.ps1)

## Validação
- [x] Typecheck frontend e backend
- [x] Smoke autenticado preparado para execução
- [x] Fluxo sem regressão crítica identificada no escopo alterado

## QA recomendado (produção)
- [x] Load autenticado de perfil
- [x] Save de nome/tema/idioma
- [x] Save de notificações
- [x] Upload avatar válido e inválido
- [x] Track diário sem spam no mesmo dia/sessão
- [x] Heatmap renderizando 365 dias
- [x] Conquistas/progresso carregando do backend

## Risco
Baixo para médio.
- Mudanças concentradas em Settings e novo pacote de Profile V2
- Backend isolado em novos endpoints
- Fallback local reduz impacto em indisponibilidade temporária da API

## Rollback
- Reverter esta PR
- Opcionalmente manter migration aplicada (sem impacto funcional crítico), já que é incremental e compatível

## Observações
- Script de smoke pronto para uso: [scripts/smoke-profile-assert.ps1](scripts/smoke-profile-assert.ps1)
- Ata da release: [RELEASE_PROFILE_2_0.md](RELEASE_PROFILE_2_0.md)
