# Vercel Runtime Source Of Truth

Status: active
Last reviewed: 2026-03-27

Objetivo:
- registrar o projeto oficial na Vercel
- documentar build, output e runtime realmente ativos
- listar env vars minimas por ambiente
- deixar explicita a politica atual de preview

Projeto oficial:
- Project name: `zero-base`
- Project id: `prj_TvE9wUuUXr5Z9mRvWKoPZNj4fho2`
- Owner: `l1nconllasts-projects`
- Framework preset: `Vite`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js version: `20.x`

Runtime web:
- SPA com rewrite catch-all para `/index.html` em `vercel.json`
- Rotas serverless em `/api/*`
- Headers de seguranca e cache definidos em `vercel.json`

Env vars minimas para o shell publicado:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Politica atual de preview:
- Em 2026-03-27, `Preview` passou a espelhar temporariamente as 4 env vars minimas de `Production`.
- Isso significa que o preview interno usa o mesmo projeto Supabase da producao enquanto o staging do loop central eh validado.
- Essa configuracao vale apenas para validacao tecnica interna e nao deve ser tratada como topologia final de ambientes.
- Se o preview passar e continuar sendo usado com frequencia, revisar a separacao de Supabase dedicado para preview.

Padrao operacional para preview:
- Padrao oficial: configurar as env vars de `Preview` manualmente no painel da Vercel.
- Caminho recomendado: `Project Settings > Environment Variables`, com as 4 env vars minimas ativas para `Preview`.
- Nao depender do deploy com env injetada como rotina diaria.
- Validacao preferida: painel da Vercel ou API oficial do projeto.
- `vercel env ls preview` pode servir como apoio, mas nao deve ser a unica fonte de verificacao se houver discrepancia.
- O deploy de preview que segue para beta deve ser validado sem env hack, partindo apenas da configuracao persistida em painel/API.

Contingencia aceita:
- Se o painel estiver inconsistente ou a CLI de `Preview` falhar no modo nao interativo, eh aceitavel criar um preview deploy com `--build-env` e `--env`.
- Essa contingencia serve para destravar staging tecnico e smoke remoto.
- Depois do incidente, o objetivo continua sendo voltar ao padrao oficial via painel.

Observacoes operacionais:
- `VITE_SUPABASE_OAUTH_PROVIDERS` segue opcional. Se ausente, a UI oculta OAuth e o login social nao deve ser criterio de bloqueio deste staging tecnico.
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` em variaveis `VITE_*`.
- Toda mudanca de env na Vercel exige novo deploy para surtir efeito.
- Preview protegido por autenticacao da Vercel pode exigir bypass automatizado para smoke remoto. O fluxo atual usa `vercel curl` para obter cookie de acesso antes da execucao no navegador.
- Golden path oficial desta fase: `Inicio -> Plano -> Estudos -> Finalizar -> Inicio/Plano -> Revisao 24h -> Reload`.
- Se o preview estiver protegido, o smoke pode usar `x-vercel-protection-bypass`; essa excecao operacional nao muda a regra de que o deploy deve estar funcional sem env injetada.

Referencias:
- `vercel/README.md`
- `docs/03_release/DEPLOY.md`
- `docs/03_release/GUIA_15MIN_VERCEL_SUPABASE.md`
