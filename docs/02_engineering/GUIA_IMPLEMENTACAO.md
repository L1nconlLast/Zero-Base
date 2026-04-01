# Guia de Implementação - Zero Base 2.0

## Quick start

```bash
npm install
npm run dev
```

## Migração

- Preserve dados existentes quando possível.
- Revise alterações em autenticação e storage.
- Valide fluxo de login após atualização.

## Checklist

- [ ] Aplicação inicia sem erros
- [ ] Rotas principais carregam
- [ ] Dashboard renderiza dados
- [ ] Build e testes executam

## Comandos

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## Segurança

- Validar entradas com schema.
- Evitar salvar dados sensíveis sem proteção.
- Tratar erros com componentes de fallback.

## Próximos passos

- Revisar performance em produção.
- Planejar monitoramento e métricas.
