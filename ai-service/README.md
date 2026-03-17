# AI Service (FastAPI)

Serviço de IA da Fase D para Zero Base.

## Endpoints
- GET /health
- POST /tutor/explain
- POST /planner/generate

## Rodar localmente
1. Crie e ative um ambiente virtual Python.
2. Instale dependências:
   - pip install -r requirements.txt
3. Configure variáveis em .env (copie de .env.example).
4. Suba o serviço:
   - uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

## Fallback seguro
Quando o provider externo estiver indisponível, o serviço responde com conteúdo local determinístico e seguro para não quebrar o backend.
