# Política de Segurança

## Versões Suportadas

| Versão | Suportada          |
| ------ | ------------------ |
| 2.0.x  | :white_check_mark: |
| 1.0.x  | :x:                |

## Recursos de Segurança

### Implementados
- Criptografia de senhas (bcrypt)
- Sanitização de inputs (DOMPurify)
- Rate limiting (3 tentativas)
- Validação de formulários
- Tokens de sessão
- Proteção XSS básica

### Não Implementados
- HTTPS obrigatório (configure no servidor)
- Backend com banco de dados real
- Autenticação OAuth
- Reset de senha via email
- 2FA (autenticação em dois fatores)
- Logs de auditoria

## Reportar Vulnerabilidade

Se você descobriu uma vulnerabilidade de segurança:

1. **Não abra uma issue pública**
2. Envie email para: [seu-email@exemplo.com]
3. Inclua:
   - Descrição detalhada
   - Passos para reproduzir
   - Impacto potencial
   - Possível solução (se souber)

## ⏱️ Tempo de Resposta

- Responderemos em até 48 horas
- Correção em até 7 dias para vulnerabilidades críticas
- Atualização de segurança será lançada ASAP

## Melhores Práticas

### Para Desenvolvedores
- Mantenha dependências atualizadas
- Use `npm audit` regularmente
- Nunca comite senhas ou tokens
- Revise código antes de merge

### Para Usuários
- Use senhas fortes
- Não compartilhe credenciais
- Faça logout ao sair
- Mantenha o app atualizado

## Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [React Security Best Practices](https://reactjs.org/docs/security.html)

---

**Segurança é responsabilidade de todos.**

