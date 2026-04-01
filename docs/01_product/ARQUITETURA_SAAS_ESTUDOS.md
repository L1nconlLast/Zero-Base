# Arquitetura Técnica — SaaS de Estudos Inteligente

## 1) Visão Geral

Este projeto evolui para um SaaS adaptativo com três modos de objetivo:
- `ENEM`
- `Concurso`
- `Híbrido (ENEM + Concurso com pesos)`

Stack-alvo recomendada:
- Frontend: Next.js/React + TailwindCSS
- Backend: Node.js + NestJS
- Banco: PostgreSQL
- Auth: Supabase Auth (ou JWT)
- Infra: Vercel (frontend), Railway/Render (backend), S3 para assets

## 2) Arquitetura em Camadas

### Camada 1 — Frontend
Módulos:
- Dashboard inteligente
- Cronograma automático
- Simulados
- Estatísticas de desempenho
- Revisão adaptativa

### Camada 2 — Backend (API)
Domínios sugeridos:
- `/users`
- `/questions`
- `/exams`
- `/performance`
- `/revision`
- `/study-plan`
- `/analytics`

### Camada 3 — Banco
Entidades-base:
- `users`
- `subjects`
- `questions`
- `performance`
- `topic_performance_metrics`
- `review_plan_items`

## 3) Motor Inteligente

### 3.1 Regra de prioridade adaptativa

$$
\text{prioridade} = (1 - \text{taxa de acerto}) \times \text{peso de dificuldade} \times \text{fator de recência}
$$

### 3.2 Repetição espaçada
- `< 60%`: revisão em 24h
- `60% a 80%`: revisão em 7 dias
- `> 80%`: revisão em 30 dias

### 3.3 Previsão simplificada

Modelo linear de evolução:

$$
y = mx + b
$$

- `x`: dias de estudo
- `y`: taxa de acerto
- `m`: ritmo de evolução
- `b`: nível inicial

## 4) Modo Híbrido (ENEM + Concurso)

O sistema usa pesos para compor prioridade semanal:

$$
P = w_E E + w_C C,\; w_E + w_C = 1
$$

Exemplo:
- `w_E = 0.7`
- `w_C = 0.3`

No frontend atual já existe seletor de peso (`10%` a `90%`) para ENEM, e o treino inteligente mistura recomendações dos dois objetivos.

## 5) Monetização SaaS

Modelo Freemium:
- Grátis: trilhas limitadas e analytics básico
- PRO: IA adaptativa, simulados ilimitados, analytics avançado e previsão de evolução

Planos:
- ENEM
- Concurso
- Híbrido Premium

## 6) Estado Atual no Projeto

Implementado:
- Objetivo de estudo (`ENEM`, `Concurso`, `Híbrido`)
- Treino inteligente adaptativo por objetivo
- Persistência local + sync com Supabase
- Rebuild server-side de analytics adaptativo via RPC/trigger

Próximas fases:
1. Backend NestJS dedicado para domínio de questões/simulados
2. Pipeline de analytics avançado com histórico de tendência
3. Previsão de aprovação por perfil e banca

