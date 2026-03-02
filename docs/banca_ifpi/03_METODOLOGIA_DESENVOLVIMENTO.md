# 3. Metodologia e Desenvolvimento

## Abordagem metodológica
Foi adotada uma abordagem incremental em ciclos curtos:
1. diagnóstico do estado do repositório e documentação;
2. definição de padronização mínima necessária;
3. implementação de ajustes com versionamento;
4. validação por testes e revisão de consistência documental.

## Procedimentos executados
- revisão de títulos, nomes de projeto e artefatos de referência;
- criação de documentação de síntese (resumo executivo e plano profissional);
- ajuste de testes E2E para reduzir fragilidade em fluxo de PR;
- atualização de fluxo de CI para separar smoke em PR e execução completa em push.

## Ferramentas
- controle de versão: Git/GitHub;
- documentação: Markdown + Notion;
- stack do projeto: React, TypeScript, Vite;
- qualidade: Vitest e Cypress.

## Estratégia de validação
- validação de integridade do repositório (estado limpo e histórico de commits);
- validação de execução de testes em escopo de smoke;
- revisão final de coerência entre documentos e mudanças aplicadas.

## Reprodutibilidade
Os resultados são reproduzíveis por meio do histórico de commits, arquivos versionados e pipeline configurado no repositório.
