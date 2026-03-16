# Knowledge Graph - Zero Base (Do Zero ao Avancado)

## 1) Arvore Completa de Portugues (ENEM + Concursos)

### 1.1 Raiz
- Portugues
- Linguagem
- Comunicacao
- Texto

### 1.2 Tronco
- Gramatica
- Interpretacao de Texto
- Literatura
- Redacao
- Linguistica

### 1.3 Ramos e Galhos (macro -> micro)

#### A) Gramatica
- Fonologia
  - Fonema e letra
  - Encontros vocálicos/consonantais
  - Digrafos
  - Silabacao
  - Acentuacao grafica
- Ortografia
  - Regras de S/Z, X/CH, H
  - Uso de maiusculas
  - Novo acordo ortografico
- Morfologia
  - Substantivo
  - Artigo
  - Adjetivo
  - Numeral
  - Pronome
  - Verbo
  - Adverbio
  - Preposicao
  - Conjuncao
  - Interjeicao
- Sintaxe
  - Termos essenciais/integrantes/acessorios
  - Tipos de sujeito
  - Tipos de predicado
  - Periodo simples/composto
  - Coordenacao e subordinacao
- Concordancia
  - Concordancia verbal
  - Concordancia nominal
- Regencia
  - Regencia verbal
  - Regencia nominal
- Crase
  - Casos obrigatorios/proibidos/facultativos
- Pontuacao
  - Virgula
  - Ponto e virgula
  - Dois pontos
  - Travessao
  - Aspas
- Semantica
  - Sinonimia e antonimia
  - Polissemia
  - Ambiguidade
  - Denotacao e conotacao

#### B) Interpretacao de Texto
- Compreensao literal
- Inferencia
- Pressupostos e subentendidos
- Coesao e coerencia
- Progressao textual
- Tipologias textuais
- Generos textuais

#### C) Figuras de Linguagem
- Figuras de palavra (metafora, metonimia, sinestesia)
- Figuras de pensamento (ironia, antitese, paradoxo, hiperbale)
- Figuras de construcao (elipse, zeugma, pleonasmo, hiperbato)

#### D) Redacao
- Estrutura dissertativo-argumentativa
- Tese e repertorio
- Causa/efeito/comparacao/exemplificacao
- Coesao e progressao argumentativa
- Proposta de intervencao (5 elementos)
- Competencias ENEM (C1 a C5)

#### E) Literatura
- Trovadorismo
- Humanismo
- Classicismo
- Barroco
- Arcadismo
- Romantismo
- Realismo/Naturalismo
- Parnasianismo/Simbolismo
- Modernismo
- Pos-modernismo

### 1.4 Exemplo de Encadeamento (prerequisitos)
- Verbo -> Sujeito -> Sintaxe Basica -> Concordancia Verbal
- Preposicao -> Artigo -> Regencia -> Crase
- Coesao -> Argumentacao -> Redacao ENEM

---

## 2) Arvore de Todas as Materias

### 2.1 Tronco Global
- Portugues
- Matematica
- Fisica
- Quimica
- Biologia
- Historia
- Geografia
- Filosofia
- Sociologia
- Redacao
- Ingles
- Atualidades

### 2.2 Matematica
- Aritmetica
- Algebra
- Funcoes
- Geometria plana/espacial/analitica
- Estatistica descritiva
- Probabilidade
- Matematica financeira

### 2.3 Fisica
- Cinematica
- Dinamica
- Trabalho e energia
- Gravitação
- Termologia e termodinamica
- Optica
- Ondulatoria
- Eletromagnetismo
- Fisica moderna

### 2.4 Quimica
- Estrutura atomica e tabela periodica
- Ligacoes quimicas
- Funcoes inorganicas
- Solucoes
- Estequiometria
- Termoquimica
- Eletroquimica
- Equilibrio quimico
- Quimica organica

### 2.5 Biologia
- Citologia
- Histologia
- Genetica
- Evolucao
- Ecologia
- Botânica
- Zoologia
- Fisiologia humana
- Biotecnologia

### 2.6 Historia
- Antiga
- Medieval
- Moderna
- Contemporanea
- Historia do Brasil Colonia/Imperio/Republica
- Ditadura e redemocratizacao

### 2.7 Geografia
- Cartografia
- Climatologia
- Geomorfologia
- Populacao e urbanizacao
- Agraria e industrial
- Geopolitica
- Biomas brasileiros

### 2.8 Filosofia e Sociologia
- Filosofia antiga/moderna/contemporanea
- Etica, epistemologia e politica
- Classicos da Sociologia (Durkheim, Weber, Marx)
- Cultura, desigualdade, movimentos sociais

### 2.9 Redacao / Ingles / Atualidades
- Redacao: repertorio, tese, coesao, intervencao
- Ingles: leitura instrumental, cognatos, estrategias de prova
- Atualidades: economia, politica, meio ambiente, ciencia e tecnologia

---

## 3) Banco de Dados (Supabase/PostgreSQL)

## 3.1 Estado atual do Zero Base
Ja existe no projeto:
- `modalidades`
- `disciplinas`
- `topicos`
- `topico_study_content`
- `progresso_topicos`

### 3.2 Extensao implementada nesta fase
Migration: `20260316000022_knowledge_graph_dna.sql`

Tabelas novas:
- `topico_prerequisitos` (arestas do grafo)
- `topico_dna` (frequencia ENEM/concursos, dificuldade, tempo medio)
- `user_learning_progress` (locked/available/studying/completed/review)

Objetos auxiliares:
- View `vw_topico_grafo`
- RPC `sp_next_topic_for_user`

### 3.3 Modelo logico simplificado
- `disciplinas (1) -> (N) topicos`
- `topicos (N) -> (N) topicos` via `topico_prerequisitos`
- `topicos (1) -> (1) topico_dna`
- `auth.users (1) -> (N) user_learning_progress`

### 3.4 Campos DNA recomendados
- `dificuldade` (1..5)
- `frequencia_enem` (0..100)
- `frequencia_concursos` (0..100)
- `tempo_medio_aprendizado_min`
- `relevancia_global`

### 3.5 Politicas de seguranca
- Catalogo (grafo/dna): select para autenticado
- Progresso: select/insert/update apenas dono (`auth.uid() = usuario_id`)

---

## 4) Como a IA navega na arvore automaticamente

### 4.1 Pipeline
1. Detectar topico-alvo pela pergunta do aluno
2. Carregar prerequisitos do topico
3. Ler progresso do aluno nos prerequisitos
4. Decidir:
   - se dominou base -> ensinar topico-alvo
   - se nao dominou -> montar trilha de base
5. Gravar progresso apos interacao (status + score + tempo)
6. Recomendar proximo topico via `sp_next_topic_for_user`

### 4.2 Regra de decisao (pseudo)
```ts
if (allPrerequisitesCompleted(user, topicId)) {
  teach(topicId)
} else {
  const gapPath = getMissingPrerequisites(user, topicId)
  teach(gapPath[0])
}
```

### 4.3 Endpoints da API (implementados)
Base: `/api/learning-graph`
- `GET /disciplines`
- `GET /topics?disciplinaId=&search=&level=`
- `GET /topics/:topicId`
- `GET /topics/:topicId/prerequisites`
- `GET /topics/:topicId/dependents`
- `GET /progress` (auth)
- `POST /progress` (auth)
- `GET /next-topic` (auth)

### 4.4 Payload de progresso
```json
{
  "topicId": "<uuid>",
  "status": "studying",
  "score": 72,
  "studyMinutes": 35,
  "attemptsDelta": 1
}
```

---

## 5) Roadmap (Startup-level)

### Fase 1 - Base operacional (agora)
- Estrutura de grafo + DNA + progresso
- API de consulta e progresso
- Recomendar proximo topico

### Fase 2 - Conteudo em escala
- Seed ENEM completo por disciplina/assunto/topico
- Seed Concursos por carreira/banca
- Curadoria de frequencia por topico (ENEM + bancas)

### Fase 3 - IA Tutor adaptativa
- Diagnostico por lacuna de prerequisito
- Rota de estudo automatica por objetivo e prazo
- Reforco de revisao com repeticao espaciada

### Fase 4 - Skill Tree gamificada
- Visual de mapa com bloqueios/desbloqueios
- XP por topico concluido
- Trilha personalizada por edital/prova

---

## 6) Resultado esperado
Com essa arquitetura, o Zero Base deixa de ser apenas um app de estudo por lista e vira um sistema de navegacao do conhecimento:
- evita estudo sem base
- acelera tomada de decisao da IA
- melhora recomendacao de proximo passo
- aumenta retencao e evolucao real do aluno
