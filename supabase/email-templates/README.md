# Templates de E-mail do Supabase

Arquivos prontos para colar no painel do Supabase em Authentication > Email Templates.

## Templates incluidos

- confirm-signup-pt.html
- reset-password-pt.html

## Onde colar

### Confirm Signup
- Caminho: Authentication > Email Templates > Confirm Signup
- Assunto sugerido: Confirme seu e-mail ✉️

### Reset Password
- Caminho: Authentication > Email Templates > Reset Password
- Assunto sugerido: Redefinir sua senha 🔐

## Observacoes

- O cadastro no frontend ja envia language: pt no user metadata do Supabase.
- O fluxo de reset no app usa redirectTo para /reset-password.
- Antes de publicar, confira se a URL aberta pelos botoes aponta para o dominio correto do app.

## Checklist rapido

- Criar usuario novo e validar recebimento do email de confirmacao.
- Testar esqueci minha senha e validar recebimento do email de reset.
- Clicar no botao e confirmar abertura da URL correta.