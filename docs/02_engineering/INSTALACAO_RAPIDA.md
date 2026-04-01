# Instalação Rápida - 3 minutos

## Opção 1: Instalação automática

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal, normalmente `http://localhost:5173`.

## Opção 2: Instalação manual

1. Instale as dependências.
2. Verifique se não há conflitos de porta.
3. Inicie o projeto em modo desenvolvimento.

```bash
npm install
npm run dev
```

## Checklist visual

- [ ] Dependências instaladas sem erro
- [ ] Servidor iniciado
- [ ] Aplicação abriu no navegador
- [ ] Login e cadastro carregam corretamente

## Arquivos importantes

- `src/schemas/index.ts`
- `src/services/auth.service.ts`
- `src/services/storage.service.ts`
- `src/components/ErrorBoundary/ErrorBoundary.tsx`
- `vite.config.ts`
- `tsconfig.json`
- `package.json`

## Dependências relevantes

- `zod`
- `secure-ls`
- `zustand`
- `uuid`
- `vitest`
- `@testing-library/react`

## Path aliases

- `@/` para `src/`
- `@components/` para `src/components/`

## Comandos úteis

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```
