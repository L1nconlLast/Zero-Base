# Zero Base 2.0

![CI](https://github.com/LinconlLast/Zero-Base/actions/workflows/ci.yml/badge.svg)

> Plataforma de estudos para ENEM e concursos com gamificação, conquistas e análise de progresso.

![Versão](https://img.shields.io/badge/versão-2.0.0-blue)
![Status](https://img.shields.io/badge/status-pronto-success)
![Licença](https://img.shields.io/badge/licença-MIT-green)

---

## Instalação Rápida

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor
npm run dev

# 3. Abra no navegador
http://localhost:5173
```

Pronto. O aplicativo estará rodando.

---

## Funcionalidades Principais

### Páginas Disponíveis

- **Início** - Dashboard completo com heatmap e estatísticas
- **Cronômetro** - Timer de estudos com registro automático
- **Dashboard** - Análise detalhada do progresso
- **Conquistas** - Sistema de achievements desbloqueáveis
- **Configurações** - Personalização de temas e preferências
- **Dados** - Backup e gerenciamento completo

### Recursos Especiais

- Sistema de níveis (1-10)
- Conquistas com raridades diferentes
- Heatmap estilo GitHub
- Modo escuro com temas de cores
- Export/Import em CSV e JSON
- Relatórios semanais
- Notificações

---

## Estrutura Principal

```text
src/
  pages/
    Settings.tsx
    Conquistas.tsx
    localStorage.tsx
  components/
    Dashboard/
      StudyHeatmap.tsx
      LevelProgress.tsx
      WeeklyReport.tsx
      AchievementNotification.tsx
  App.tsx
```

---

## Arquitetura do Sistema

```mermaid
graph TD
    %% Entidades Externas
    User((👨🎓 Aluno))
    LLM[🤖 OpenAI / Gemini API]
    
    %% Frontend
    subgraph Frontend [Frontend: React + Vite]
        UI[Interface Zero Base 2.0]
        Admin[Dashboard Admin]
        MentorChat[Chat do Mentor IA]
    end
    
    %% Backend
    subgraph Backend [Backend: Node.js + Express]
        API[API Gateway / Router]
        
        subgraph Middlewares [Camada de Segurança]
            Auth[JWT Auth]
            Rate[Rate Limiting]
            Breaker[Circuit Breaker]
        end
        
        subgraph Services [Serviços de Negócio]
            RAG[Context & RAG Service]
            AdminService[Admin Metrics Service]
            Telemetry[Token Usage Tracker]
        end
    end
    
    %% Banco de Dados
    subgraph Database [Database: Supabase / PostgreSQL]
        AuthDB[(Auth & Users)]
        Progresso[(Progresso & Cronograma)]
        Tokens[(mentor_token_usage)]
    end

    %% Fluxo de Dados
    User -->|Interage| UI
    UI -->|Acessa| Admin
    UI -->|Envia Mensagem| MentorChat
    
    MentorChat -->|SSE Stream| API
    Admin -->|GET /metrics| API
    
    API --> Auth
    Auth --> Rate
    Rate --> Breaker
    Breaker --> RAG
    Breaker --> AdminService
    
    RAG -->|Envia Prompt + Contexto| LLM
    LLM -->|Stream de Resposta| RAG
    
    AdminService -->|Query Aggregation| Tokens
    RAG -->|Salva Custo Fire-and-Forget| Telemetry
    Telemetry --> Tokens
    
    Auth -->|Valida Token| AuthDB
    RAG -->|Busca Histórico| Progresso
    
    classDef client fill:#3178c6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef server fill:#3c873a,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#3ebd93,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ai fill:#74aa9c,stroke:#fff,stroke-width:2px,color:#fff;
    
    class Frontend client;
    class Backend server;
    class Database db;
    class LLM ai;
```

---

## Organização do Repositório

- Guia de organização: `docs/ORGANIZACAO_REPOSITORIO.md`
- Autor: Gleydson de Sousa Gomes (Linconl)
- Resumo executivo: `docs/RESUMO_ZERO_BASE_V2.md`
- Índice de arquivos: `INDEX_ARQUIVOS.html`
- Estrutura detalhada: `ESTRUTURA_PROJETO.txt`

---

## Tecnologias

- React + TypeScript
- Vite + Tailwind CSS
- Recharts
- Lucide React
- date-fns

---

## Como Usar

### Primeiro acesso
1. Crie uma conta
2. Configure suas preferências em Configurações

### Registrar estudos
1. Inicie o cronômetro
2. Estude
3. Finalize a sessão

### Backup de dados
1. Abra Dados
2. Baixe o backup em JSON

---

## Problemas Comuns

**Erro: Cannot find module**
```bash
npm install
```

**Porta em uso**
```bash
npm run dev -- --port 3000
```

**Tela branca**
- Limpe cache do navegador
- Recarregue a página

---

## Documentação Adicional

- `GUIA_COMPLETO.md` - Documentação detalhada
- `INICIO_RAPIDO.txt` - Comandos rápidos
- `GUIA_INSTALACAO.html` - Guia visual
- `docs/ORGANIZACAO_REPOSITORIO.md` - Mapa e convenções de organização
- `docs/RESUMO_ZERO_BASE_V2.md` - Resumo executivo consolidado (Notion + repositório)

---

## Comandos Úteis

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview da build
npm run lint     # Verificar código
npm run test     # Unit tests (Vitest)
npm run e2e      # E2E headless
npm run e2e:open # E2E visual
npm run test:all # Unit + E2E em sequência
```

---

## Testes E2E (Cypress)

O projeto já está configurado com Cypress:

```bash
npm run e2e
npm run e2e:open
npm run test:all
```

CI pronto em `.github/workflows/e2e.yml`.

---

## Licença

MIT License.

---

Versão 2.0.0 | Fevereiro 2026
