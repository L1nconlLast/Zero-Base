# Guia Completo - Zero Base v2.0

## Pré-requisitos

- Node.js 18+
- npm 9+

## Passo a passo para rodar

1. Abra o terminal na pasta do projeto.
2. Instale dependências:

```bash
npm install
```

3. Inicie o servidor:

```bash
npm run dev
```

4. Abra no navegador o endereço exibido no terminal (geralmente `http://localhost:5173`).

## Verificação de instalação

- Tela de autenticação abre corretamente.
- Dashboard carrega após login.
- Páginas principais estão acessíveis.

## Estrutura principal

```text
src/
  components/
  hooks/
  pages/
  services/
  types/
  utils/
  App.tsx
```

## Comandos importantes

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

## Troubleshooting

- Reinstalar dependências: `npm install`
- Trocar porta: `npm run dev -- --port 3000`
- Limpar cache do navegador e recarregar

## Conclusão

Com esses passos você consegue instalar, validar e executar o projeto localmente com segurança.
