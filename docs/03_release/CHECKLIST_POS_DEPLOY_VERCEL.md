# Checklist Pos-Deploy Vercel

Use este checklist toda vez que publicar com `npm run deploy:prod`.

## 1. Confirmar producao

- Abrir `https://zero-base-three.vercel.app`
- Confirmar que a aplicacao carrega sem erro visivel
- Confirmar que o usuario consegue entrar normalmente

## 2. Validar experiencia principal

- Abrir `Inicio`
- Confirmar que a home da fase atual renderiza corretamente
- Abrir `Estudo`
- Confirmar que `Estudo` abre no fluxo vertical unico
- Confirmar que o CTA principal aparece acima da dobra
- Confirmar que `Foco` e o centro da tela
- Confirmar que `Questoes` aparece como continuacao natural
- Confirmar que `Ajustes opcionais` esta colapsado e secundario

## 3. Validar admin

- Abrir `https://zero-base-three.vercel.app/?internal=1`
- Confirmar que o toast/liberacao do modo interno aparece
- Abrir `Dados`
- Confirmar que a `Central de operacao` aparece no topo
- Confirmar que `DataManagement` e a area principal
- Confirmar que `Ferramentas de suporte` esta colapsada
- Expandir `Ferramentas de suporte`
- Confirmar carregamento de `SyncCenter`
- Confirmar carregamento de `RetentionAdminPanel`
- Confirmar carregamento de `Dados locais`

## 4. Validar modo interno

- Confirmar que o switcher `Modo interno` aparece no canto inferior direito
- Confirmar troca entre `Auto`, `Iniciante`, `Intermediario` e `Avancado`
- Confirmar que `Resetar modo interno` limpa override e admin mode

## 5. Smoke test minimo

- Iniciar uma sessao de foco
- Encerrar a sessao
- Abrir pratica recomendada
- Confirmar que questoes carregam
- Voltar para `Inicio`
- Confirmar que a navegacao continua funcional

## 6. Validar dashboard publicado

- Abrir `Progresso`
- Confirmar que `Relatorio Semanal` aparece
- Confirmar que o `pie` de `Distribuicao por Materia` esta centralizado
- Confirmar que a legenda lateral nao mostra slug, hash, JSON bruto ou texto tecnico
- Confirmar que nao existe overflow horizontal no desktop ou mobile
- Registrar print do bloco em `qa-artifacts/` quando houver mudanca nessa area

## 7. Divida conhecida de automacao

- `run-progress-dashboard-smoke.mjs` ainda pode flakar no shell novo ao localizar o bloco do `Relatorio Semanal`
- Esse item deve ser tratado como divida de QA/runner, nao como bug do grafico, a menos que a validacao visual publicada falhe
- Quando houver tempo de infraestrutura, endurecer o smoke local e publicado na Vercel com:
- seletor mais robusto para `weekly-report-container`
- waits mais estaveis para o shell novo
- captura mobile menos poluida por overlays de QA
- relatorio com timestamp para nao sobrescrever a ultima execucao boa

## 8. Se algo quebrar

- Verificar se o deploy certo foi aliasado em producao
- Rodar `npm run build` localmente
- Fazer novo deploy com `npm run deploy:prod`
- Se necessario, revisar logs com `vercel inspect <deploy-url> --logs`
