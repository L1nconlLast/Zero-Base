# Seed de desenvolvimento para `faculdade` e `outros`

Use o arquivo [`dev_shell_seed.sql`](./dev_shell_seed.sql) para popular manualmente um usuario de desenvolvimento com dados minimos dos dois dominios.

Como usar:

1. Substitua `__USER_ID__` pelo UUID do usuario autenticado no seu ambiente.
2. Rode o SQL no banco de desenvolvimento depois da migration `20260330000001_study_contexts_faculdade_outros.sql`.
3. Reabra o app e valide os shells `faculdade` e `outros`.

O app tambem ganhou um fluxo de seed rapido direto nos shells nativos:

- `Faculdade -> Disciplinas -> Popular demo`
- `Outros -> Tema -> Popular demo`

Esse caminho usa o `userId` autenticado e e o jeito mais rapido de validar a leitura real sem abrir o editor SQL.

