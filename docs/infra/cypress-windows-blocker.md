## 🚧 Bloqueio de Infraestrutura — Cypress (Windows)

**Status:** Bloqueado
**Impacto:** Execução de testes E2E local (Cypress)
**Escopo afetado:** Runner local do Cypress no Windows

---

### Contexto

Foi implementado e validado o fluxo completo de estudo:

* Cronograma → Estudo → Pós-foco → Questões
* Spec isolado: `cypress/e2e/focus-to-questions.cy.ts`
* Seletores estáveis (`study-focus-*`)
* Helpers (`closeOptionalOverlays`, `finishFocusSession`)

Produto, lógica e automação do fluxo estão prontos.

---

### Problema

O Cypress falha ao iniciar o runner local:

```text
Cypress.exe: bad option: --smoke-test
```

O erro ocorre em:

* `npx cypress verify`
* antes da execução de qualquer spec

---

### Caminho relevante

```text
C:\Users\DELL\AppData\Local\Cypress\Cache\15.11.0\Cypress\Cypress.exe
```

---

### Diagnóstico realizado

* ✔️ Versão do pacote e binário alinhadas (`15.11.0`)
* ✔️ `npx cypress cache clear` + reinstalação do binário
* ✔️ `npx cypress install` concluído com sucesso
* ✔️ App Data isolado (`%APPDATA%\Cypress`)
* ❌ `npx cypress verify` continua falhando no bootstrap
* ❌ erro ocorre antes de qualquer spec

---

### Conclusão

O problema está concentrado no **executável local do Cypress no Windows (`Cypress.exe`)**, especificamente no bootstrap (`--smoke-test`).

Não está relacionado a:

* fluxo de produto
* lógica do estudo
* spec E2E
* seletores ou helpers

---

### Próximos passos (quando retomar)

1. Executar com debug:

```powershell
$env:DEBUG='cypress:cli*'
npx cypress verify
```

2. Testar em:

* outro shell (PowerShell vs CMD)
* modo administrador

3. Comparar com issues do Cypress:

* buscar por `bad option: --smoke-test`

4. Se persistir:

* abrir issue com logs completos do `verify`

---

### Critério de fechamento

* `npx cypress verify` passa
* spec `focus-to-questions` executa ao menos 1x
* rodar `5x seguidas` validando:

  * `Sessão concluída`
  * `Preparando suas questões...`
  * `Questões de {disciplina}`

---
