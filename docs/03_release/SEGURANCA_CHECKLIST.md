# Checklist de Seguranca

- Payloads validados com Zod nas rotas da SPEC.
- Auth obrigatoria nas rotas sensiveis de /api.
- Ownership filtrado por userId nos recursos do usuario.
- Rate limit aplicado em IA e planner generate.
- CORS por allowlist via env.
- Helmet habilitado.
- requestId propagado em todas as requests.
- Logs JSON estruturados.
- .env.example sem segredos reais.
- Startup falha quando env critica estiver ausente.
- MENTOR_ALLOW_GUEST proibido em producao.
- Segredos devem ser rotacionados fora do repositório.