import os
from fastapi import FastAPI
import sentry_sdk

from .providers import AIProvider
from .schemas import PlannerGenerateInput, PlannerGenerateOutput, TutorExplainInput, TutorExplainOutput

sentry_dsn = os.getenv('SENTRY_DSN_AI', '').strip()
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0') or '0'),
        environment=os.getenv('APP_ENV', os.getenv('NODE_ENV', 'development')),
    )

app = FastAPI(title='Zero Base AI Service', version='0.1.0')
provider = AIProvider()


@app.get('/health')
def health() -> dict:
    return {
        'ok': True,
        'service': 'ai-service',
        'provider': provider.provider,
        'providerAvailable': provider.is_available(),
    }


@app.post('/tutor/explain', response_model=TutorExplainOutput)
def tutor_explain(payload: TutorExplainInput) -> TutorExplainOutput:
    try:
        return provider.explain_tutor(payload)
    except Exception:
        # fallback seguro
        return AIProvider().explain_tutor(payload)


@app.post('/planner/generate', response_model=PlannerGenerateOutput)
def planner_generate(payload: PlannerGenerateInput) -> PlannerGenerateOutput:
    try:
        return provider.generate_planner(payload)
    except Exception:
        # fallback seguro
        return AIProvider().generate_planner(payload)


if __name__ == '__main__':
    # Execucao direta opcional para debug local.
    import uvicorn

    host = os.getenv('AI_HOST', '0.0.0.0')
    port = int(os.getenv('AI_PORT', '8001'))
    uvicorn.run('app.main:app', host=host, port=port, reload=False)
