# Operação Rápida — Supabase (Zero Base)

## Objetivo
Aplicar migrations remotas e validar estruturas críticas (`mentor_messages`, `mock_exam_sessions`, `daily_quiz_sessions`).

## Pré-requisitos
- Node.js instalado
- Projeto aberto na pasta raiz
- Um dos métodos de autenticação:
  - Personal Access Token (`sbp_...`), ou
  - Senha do usuário `postgres`

## Fluxo principal (recomendado)

### 1) Aplicar migrations por token
```powershell
powershell -ExecutionPolicy Bypass -File .\supabase\scripts\apply_remote_migrations.ps1 -AccessToken "sbp_SEU_TOKEN"
```

### 2) Validar no SQL Editor
- Abrir Supabase Dashboard > SQL Editor
- Executar o conteúdo do arquivo:
  - `supabase/verification/verify_mentor_messages.sql`
  - `supabase/verification/verify_questions_sessions.sql`
  - `supabase/verification/verify_learning_core_schema.sql`

## Fluxo alternativo (sem token)

### 1) Aplicar migrations por senha postgres
```powershell
powershell -ExecutionPolicy Bypass -File .\supabase\scripts\apply_remote_migrations.ps1 -DbPassword "SUA_SENHA"
```

### 2) Validar no SQL Editor
- Executar `supabase/verification/verify_mentor_messages.sql`
- Executar `supabase/verification/verify_questions_sessions.sql`

## Resultado esperado
No retorno das queries de verificação, os checks devem aparecer como `PASS`.

## Migration nova já inclusa no repositório
- `supabase/migrations/20260301000001_questions_exam_sessions.sql`
  - Cria `mock_exam_sessions`
  - Cria `daily_quiz_sessions`
  - Ativa RLS + policies por usuário
  - Cria índices por `user_id/date`

- `supabase/migrations/20260301000002_learning_core_schema.sql`
  - Cria catálogo pedagógico: `modalidades`, `disciplinas`, `topicos`
  - Cria banco de questões: `questoes`, `alternativas`
  - Cria jornada do usuário: `respostas_usuarios`, `simulados`, `simulado_questoes`, `anotacoes`, `favoritos`, `progresso_topicos`
  - Vincula conteúdo existente com tópicos via `topico_study_content`
  - Cria views estratégicas e funções RPC (`sp_registrar_resposta`, `sp_gerar_simulado`)
  - Ativa RLS/policies + índices de performance

## Solução rápida de problemas
- `Access token not provided`:
  - Use a opção `-AccessToken` com token `sbp_...`
- Falha de conexão com DB URL:
  - Revise senha do `postgres`
  - Confirme o project ref: `vcsgapomoeucqpsbcuvj`
- Migration não aplicada:
  - Rode novamente e confira a saída de erro no terminal
