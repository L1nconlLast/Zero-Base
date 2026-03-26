# Checklist Pós-Deploy Vercel

Use este checklist toda vez que publicar com `npm run deploy:prod`.

## 1. Confirmar produção

- Abrir `https://zero-base-three.vercel.app`
- Confirmar que a aplicação carrega sem erro visível
- Confirmar que o usuário consegue entrar normalmente

## 2. Validar experiência principal

- Abrir `Início`
- Confirmar que a home da fase atual renderiza corretamente
- Abrir `Estudo`
- Confirmar que `Estudo` abre no fluxo vertical único
- Confirmar que o CTA principal aparece acima da dobra
- Confirmar que `Foco` é o centro da tela
- Confirmar que `Questões` aparece como continuação natural
- Confirmar que `Ajustes opcionais` está colapsado e secundário

## 3. Validar admin

- Abrir `https://zero-base-three.vercel.app/?internal=1`
- Confirmar que o toast/liberação do modo interno aparece
- Abrir `Dados`
- Confirmar que a `Central de operacao` aparece no topo
- Confirmar que `DataManagement` é a área principal
- Confirmar que `Ferramentas de suporte` está colapsada
- Expandir `Ferramentas de suporte`
- Confirmar carregamento de `SyncCenter`
- Confirmar carregamento de `RetentionAdminPanel`
- Confirmar carregamento de `Dados locais`

## 4. Validar modo interno

- Confirmar que o switcher `Modo interno` aparece no canto inferior direito
- Confirmar troca entre `Auto`, `Iniciante`, `Intermediário` e `Avançado`
- Confirmar que `Resetar modo interno` limpa override e admin mode

## 5. Smoke test mínimo

- Iniciar uma sessão de foco
- Encerrar a sessão
- Abrir prática recomendada
- Confirmar que questões carregam
- Voltar para `Início`
- Confirmar que a navegação continua funcional

## 6. Se algo quebrar

- Verificar se o deploy certo foi aliasado em produção
- Rodar `npm run build` localmente
- Fazer novo deploy com `npm run deploy:prod`
- Se necessário, revisar logs com `vercel inspect <deploy-url> --logs`
