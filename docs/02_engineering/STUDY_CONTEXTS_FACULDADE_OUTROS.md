# Study Context Engine: Faculdade e Outros

## Objetivo

Fundar `faculdade` e `outros` como modos nativos do produto sem encaixar os dois no molde legado de `enem | concursos | hibrido`.

O principio passa a ser:

- `user_study_contexts` define o modo ativo do usuario
- o nucleo compartilhado continua existindo
- cada modo contextualiza navegacao, entidades e priorizacao

## Decisao de arquitetura

O projeto hoje ja tem bastante personalizacao por track no front, mas a persistencia principal ainda carrega um legado centrado em `preferred_track`.

Para nao quebrar o que ja funciona:

- `preferred_track` continua existindo como compatibilidade para fluxos legados
- `user_study_contexts.mode` vira a fundacao para os modos nativos
- `faculdade` e `outros` passam a ter entidades proprias
- `study_sessions` e `review_plan_items` ganham colunas de contexto, em vez de tabelas paralelas de execucao

## Fonte de verdade

### Nova tabela principal

`public.user_study_contexts`

Campos:

- `id`
- `user_id`
- `mode`
- `is_active`
- `context_summary`
- `context_description`
- `context_payload`
- `created_at`
- `updated_at`

Regras:

- um contexto por `user_id + mode`
- um unico contexto ativo por usuario
- `context_payload` sempre em `jsonb` objeto

## Nucleo compartilhado reaproveitado

As tabelas compartilhadas continuam valendo:

- `users`
- `study_sessions`
- `review_plan_items`
- `user_profile`
- `user_profile_preferences`
- `user_study_preferences`

As duas tabelas operacionais mais importantes passam a carregar contexto:

### `study_sessions`

Novas colunas:

- `context_mode`
- `academic_subject_id`
- `academic_exam_id`
- `academic_assignment_id`
- `learning_topic_id`
- `session_type`
- `scheduled_for`
- `completed_at`

### `review_plan_items`

Novas colunas:

- `context_mode`
- `academic_subject_id`
- `academic_exam_id`
- `academic_assignment_id`
- `learning_topic_id`
- `review_type`
- `content_title`

Isso permite manter um motor compartilhado de execucao e retencao, mas com origem contextual.

## Dominio Faculdade

### Tabelas

#### `academic_institutions`

- `id`
- `user_id`
- `name`
- `institution_type`
- `is_primary`
- `created_at`
- `updated_at`

#### `academic_courses`

- `id`
- `user_id`
- `institution_id`
- `name`
- `is_primary`
- `created_at`
- `updated_at`

#### `academic_periods`

- `id`
- `user_id`
- `label`
- `number`
- `starts_at`
- `ends_at`
- `is_current`
- `created_at`
- `updated_at`

#### `academic_subjects`

- `id`
- `user_id`
- `institution_id`
- `course_id`
- `academic_period_id`
- `name`
- `workload_hours`
- `professor_name`
- `color`
- `status`
- `created_at`
- `updated_at`

#### `academic_exams`

- `id`
- `user_id`
- `subject_id`
- `title`
- `exam_date`
- `weight`
- `notes`
- `status`
- `created_at`
- `updated_at`

#### `academic_assignments`

- `id`
- `user_id`
- `subject_id`
- `title`
- `description`
- `due_date`
- `priority`
- `status`
- `created_at`
- `updated_at`

#### `academic_class_notes`

- `id`
- `user_id`
- `subject_id`
- `title`
- `content`
- `created_at`
- `updated_at`

#### `academic_calendar_events`

- `id`
- `user_id`
- `subject_id`
- `exam_id`
- `assignment_id`
- `event_type`
- `title`
- `start_at`
- `end_at`
- `status`
- `details`
- `created_at`
- `updated_at`

### Relacoes-chave

- `academic_courses -> academic_institutions`
- `academic_subjects -> academic_institutions`
- `academic_subjects -> academic_courses`
- `academic_subjects -> academic_periods`
- `academic_exams -> academic_subjects`
- `academic_assignments -> academic_subjects`
- `academic_class_notes -> academic_subjects`
- `academic_calendar_events -> academic_subjects | academic_exams | academic_assignments`
- `study_sessions -> academic_subjects | academic_exams | academic_assignments`
- `review_plan_items -> academic_subjects | academic_exams | academic_assignments`

### Regras de produto

- `focus = rotina` prioriza distribuicao entre disciplinas e revisao leve
- `focus = provas` prioriza provas proximas e reforco por disciplina
- `focus = trabalhos` prioriza entregas, producao e blocos de avancar trabalho
- a home academica deve sempre refletir urgencia real: prova, entrega, atraso ou revisao

## Dominio Outros

### Tabelas

#### `learning_topics`

- `id`
- `user_id`
- `name`
- `category`
- `level`
- `status`
- `created_at`
- `updated_at`

#### `learning_goals`

- `id`
- `user_id`
- `topic_id`
- `goal_type`
- `description`
- `status`
- `created_at`
- `updated_at`

#### `learning_paths`

- `id`
- `user_id`
- `topic_id`
- `title`
- `progress_percent`
- `status`
- `created_at`
- `updated_at`

#### `learning_path_steps`

- `id`
- `user_id`
- `path_id`
- `title`
- `description`
- `step_order`
- `status`
- `created_at`
- `updated_at`

#### `personal_goal_events`

- `id`
- `user_id`
- `topic_id`
- `title`
- `event_type`
- `start_at`
- `end_at`
- `status`
- `created_at`
- `updated_at`

### Relacoes-chave

- `learning_goals -> learning_topics`
- `learning_paths -> learning_topics`
- `learning_path_steps -> learning_paths`
- `personal_goal_events -> learning_topics`
- `study_sessions -> learning_topics`
- `review_plan_items -> learning_topics`

### Regras de produto

- `goal_type = aprender_do_zero` puxa mais introducao e base
- `goal_type = praticar` puxa mais exercicio e repeticao
- `goal_type = rotina` puxa sessoes leves e frequentes
- `goal_type = aprofundar` puxa blocos mais densos e progressao
- o calendario precisa ser leve: metas, estudo, revisao e consistencia

## Navegacao por modo

### Faculdade

- Home
- Disciplinas
- Planejamento
- Calendario
- Perfil

### Outros

- Visao geral
- Meu foco
- Plano
- Execucao
- Ritmo
- Perfil

Observacao:
o shell de `outros` evoluiu para seis dominios porque o produto agora separa identidade do foco, estrutura da trilha, execucao do agora e leitura de ritmo semanal.

## Estrutura recomendada no front

O repositorio hoje esta organizado por `features`, entao a adaptacao deve seguir esse padrao em vez de abrir um segundo eixo em `/modules`.

### Base

- `src/features/studyContext/`

Arquivos iniciais:

- `types.ts`
- `studyContext.ts`
- `index.ts`

### Proxima camada

- `src/features/faculdade/`
- `src/features/outros/`

Cada uma com:

- `pages/`
- `components/`
- `hooks/`
- `services/`
- `types/`

## Integracao com o onboarding atual

O onboarding ja captura parte dos dados de `faculdade` e `outros` via meta local. A nova regra passa a ser:

1. onboarding monta um `StudyContextOnboardingSnapshot`
2. `buildStudyContextDraftFromOnboarding` normaliza o payload
3. `studyContextService.upsertActive` persiste em `user_study_contexts`
4. Home, Plano, Estudo, Revisao e Perfil passam a preferir esse contexto quando ele existir

## Compatibilidade com legado

### Problema atual

O app ainda usa `preferredTrack` com semantica antiga:

- `enem`
- `concursos`
- `hibrido`

### Regra de migracao

- `user_study_contexts.mode` vira o dado principal
- `preferredTrack` fica como compatibilidade para fluxos legados
- `faculdade` e `outros` nao devem mais ser projetados como `enem` por baixo
- quando um fluxo antigo exigir `preferredTrack`, a chamada deve ser deliberada, nunca inferida em silencio

## Ordem de construcao recomendada

### Sprint 1

- persistir `user_study_contexts`
- ligar onboarding -> contexto ativo
- rotear navegacao por modo

### Sprint 2

- `faculdade` base
- entidades de disciplina, prova, trabalho
- home academica

### Sprint 3

- `outros` base
- tema principal
- trilha
- home de continuidade

### Sprint 4

- planner e calendario contextuais
- refinamento de sessoes e revisoes usando entidades relacionais

## Arquivos desta base tecnica

- migração: `supabase/migrations/20260330000001_study_contexts_faculdade_outros.sql`
- tipos e helpers: `src/features/studyContext/`
- servico de persistencia: `src/services/studyContext.service.ts`

## Resultado esperado

Com essa fundacao, `faculdade` e `outros` deixam de ser so narrativas na interface e passam a ter:

- modelo relacional proprio
- contexto persistido de forma nativa
- pontos de integracao claros com estudo e revisao
- navegacao preparada para virar produto proprio
