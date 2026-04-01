# Backup e Restore

## Politica alvo

- Backup diario do banco.
- Retencao curta: 7 dias.
- Retencao longa: 30 dias.

## Antes de migration em producao

1. Confirmar backup recente.
2. Criar snapshot manual/restore point.
3. Registrar versao da aplicacao e migration alvo.

## Restore em staging

1. Restaurar snapshot em banco de staging.
2. Validar integridade minima:
   - users
   - study_sessions
   - study_schedule
   - respostas_usuarios
   - user_learning_progress
3. Rodar smoke tests da API.

## RPO/RTO alvo

- RPO: ate 24h.
- RTO: ate 60 min para restauracao parcial e ate 120 min para incidente maior.

## Evidencia esperada

- ID do backup
- horario do restore
- resultado dos smoke tests