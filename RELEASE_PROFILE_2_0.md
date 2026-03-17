# Release: Perfil 2.0

## Data
2026-03-17

## Escopo entregue

### Frontend
- Refatoração estrutural da página de configurações:
  - Aba **Perfil** substituída integralmente por `ProfileV2`
  - Aba **Estatísticas** substituída integralmente por `ProfileStatsV2`
- Novo layout premium/clean com hierarquia visual forte
- Upload de avatar (foto) integrado com endpoint real
- Persistência de perfil, preferências e notificações via API
- Heatmap de atividade (365 dias) renderizado na aba Estatísticas
- Conquistas conectadas com backend (com fallback local seguro)
- `Settings.tsx` atuando como orquestrador de estado/integração

### Backend
- Pacote Perfil 2.0 implementado no padrão route/controller/service
- Endpoints:
  - `GET /api/profile/load`
  - `POST /api/profile/save`
  - `POST /api/profile/notifications`
  - `POST /api/profile/avatar/upload`
  - `POST /api/activity/track`
- Autenticação aplicada (401 sem token)
- Migration incremental para dados de perfil/atividade/conquistas/preferências
- Upload multipart de avatar com persistência em storage
- Regras de heatmap por intensidade e tracking diário por upsert

## Validação
- Typecheck: **OK** (frontend + backend)
- Smoke autenticado: preparado (`smoke-profile-assert.ps1`)
- Sem regressão funcional crítica identificada

## Resultado
A experiência de perfil evoluiu de “configuração seca” para um modelo de **identidade + progresso + personalização**, com persistência real de dados e base pronta para gamificação contínua.
