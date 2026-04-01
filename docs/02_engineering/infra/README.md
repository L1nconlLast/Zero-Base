## 🧱 Infraestrutura — Bloqueios e Diagnósticos

Este diretório centraliza **pendências técnicas de infraestrutura** que não estão relacionadas ao produto ou à lógica da aplicação, mas que impactam desenvolvimento, testes ou execução local/CI.

### 🎯 Objetivo

* Evitar perda de contexto em problemas de ambiente
* Padronizar diagnóstico e retomada
* Separar claramente **problema de produto vs problema de infraestrutura**

---

## 📄 Template padrão

Todos os registros devem seguir o template:

```text
docs/infra-blocker.md
```

Estrutura:

* Contexto
* Problema
* Caminho relevante
* Diagnóstico
* Conclusão
* Próximos passos
* Critério de fechamento

---

## 📚 Bloqueios registrados

### Cypress (Windows)

* Arquivo:

```text
docs/infra/cypress-windows-blocker.md
```

* Status: **aberto**
* Escopo: runner local E2E
* Resumo: erro no bootstrap do binário (`--smoke-test`)

---

## 🧭 Como usar

Quando surgir um bloqueio de infraestrutura:

1. Copiar o template de `docs/infra-blocker.md`
2. Criar um novo arquivo em `docs/infra/`
3. Nomear de forma descritiva:

```text
<tool>-<platform>-<problema>.md
```

Exemplos:

* `cypress-windows-blocker.md`
* `vite-build-cache-issue.md`
* `supabase-local-auth-error.md`

4. Preencher com diagnóstico real (não genérico)

---

## ✅ Critério para registrar aqui

Registrar **apenas** quando:

* o problema **não está no código de produto**
* já houve tentativa real de diagnóstico
* há risco de reaparecer ou bloquear outros devs

---

## 🚫 Não registrar aqui

* bugs de UI/UX
* regras de negócio incorretas
* refatorações técnicas

---

## 🔁 Retomada

Cada registro deve permitir:

* reproduzir o problema
* entender rapidamente o que já foi tentado
* continuar o diagnóstico sem recomeçar do zero

---
