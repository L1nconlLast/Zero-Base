import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { app } from '../app';
import { studyPlatformCompatService } from '../services/studyPlatformCompat.service';
import { queueJobsService } from '../services/queueJobs.service';

const createAuthToken = async (
  userId = '11111111-1111-4111-8111-111111111111',
  claims: Record<string, unknown> = {},
): Promise<string> => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'test-secret';
  const issuer = `${supabaseUrl}/auth/v1`;
  return await new SignJWT({ role: 'authenticated', email: 'test@zerobase.com', ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience('authenticated')
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(Buffer.from(jwtSecret, 'utf-8'));
};

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SPEC contract snapshots', () => {
  it('GET /api/subjects', async () => {
    vi.spyOn(studyPlatformCompatService, 'listSubjects').mockResolvedValue([
      { id: 'sub-1', name: 'Matematica', slug: 'matematica', icon: null, color: '#2563eb', track: 'ENEM', order: 1 },
    ]);

    const response = await request(app).get('/api/subjects').expect(200);
    expect(response.body).toMatchInlineSnapshot(`
      {
        "subjects": [
          {
            "color": "#2563eb",
            "icon": null,
            "id": "sub-1",
            "name": "Matematica",
            "order": 1,
            "slug": "matematica",
            "track": "ENEM",
          },
        ],
      }
    `);
  });

  it('GET /api/skills/tree', async () => {
    vi.spyOn(studyPlatformCompatService, 'getSkillsTree').mockResolvedValue({
      nodes: [{ id: 'topic:1', type: 'topic', data: { label: 'Equacoes', status: 'available' } }],
      edges: [],
      stats: { totalNodes: 1, totalEdges: 0, totalTopics: 1 },
    });

    const response = await request(app).get('/api/skills/tree?subjectId=11111111-1111-4111-8111-111111111111').expect(200);
    expect(response.body).toMatchInlineSnapshot(`
      {
        "edges": [],
        "nodes": [
          {
            "data": {
              "label": "Equacoes",
              "status": "available",
            },
            "id": "topic:1",
            "type": "topic",
          },
        ],
        "stats": {
          "totalEdges": 0,
          "totalNodes": 1,
          "totalTopics": 1,
        },
      }
    `);
  });

  it('POST /api/sessions/:id/finish', async () => {
    const token = await createAuthToken();
    vi.spyOn(studyPlatformCompatService, 'finishSession').mockResolvedValue({
      duration: 45,
      xpGained: 70,
      newLevel: 'INICIANTE',
      streak: 2,
    });
    vi.spyOn(queueJobsService, 'enqueueAfterSessionFinish').mockResolvedValue();

    const response = await request(app)
      .post('/api/sessions/22222222-2222-4222-8222-222222222222/finish')
      .set('Authorization', `Bearer ${token}`)
      .send({ endTime: '2026-03-16T18:00:00.000Z', questionsDone: 5, correctAnswers: 5 })
      .expect(200);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "duration": 45,
        "newLevel": "INICIANTE",
        "streak": 2,
        "xpGained": 70,
      }
    `);
  });

  it('GET /api/planner/week e /api/stats/*', async () => {
    const token = await createAuthToken();
    vi.spyOn(studyPlatformCompatService, 'getPlannerWeek').mockResolvedValue([
      { id: 'p1', day: '2026-03-16', subject: 'Matematica', note: null, status: 'PENDENTE' },
    ]);
    vi.spyOn(studyPlatformCompatService, 'getTodayStats').mockResolvedValue({
      studiedMinutes: 60,
      dailyGoalMinutes: 90,
      goalProgressPct: 67,
      xp: 100,
      streak: 4,
    });
    vi.spyOn(studyPlatformCompatService, 'getWeekStats').mockResolvedValue({
      totalMinutes: 240,
      totalXp: 360,
      days: [{ day: '2026-03-16', minutes: 60, xp: 100 }],
    });
    vi.spyOn(studyPlatformCompatService, 'getAccuracyBySubject').mockResolvedValue([
      { subject: 'Matematica', accuracy: 80, totalAnswers: 10 },
    ]);

    const plannerResponse = await request(app)
      .get('/api/planner/week?start=2026-03-16')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(plannerResponse.body).toMatchInlineSnapshot(`
      {
        "items": [
          {
            "day": "2026-03-16",
            "id": "p1",
            "note": null,
            "status": "PENDENTE",
            "subject": "Matematica",
          },
        ],
      }
    `);

    const todayResponse = await request(app)
      .get('/api/stats/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(todayResponse.body).toMatchInlineSnapshot(`
      {
        "dailyGoalMinutes": 90,
        "goalProgressPct": 67,
        "streak": 4,
        "studiedMinutes": 60,
        "xp": 100,
      }
    `);

    const weekResponse = await request(app)
      .get('/api/stats/week')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(weekResponse.body).toMatchInlineSnapshot(`
      {
        "days": [
          {
            "day": "2026-03-16",
            "minutes": 60,
            "xp": 100,
          },
        ],
        "totalMinutes": 240,
        "totalXp": 360,
      }
    `);

    const accuracyResponse = await request(app)
      .get('/api/stats/accuracy-by-subject')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(accuracyResponse.body).toMatchInlineSnapshot(`
      {
        "subjects": [
          {
            "accuracy": 80,
            "subject": "Matematica",
            "totalAnswers": 10,
          },
        ],
      }
    `);
  });

  it('POST /api/questions/import', async () => {
    const token = await createAuthToken(undefined, { role: 'admin' });
    vi.spyOn(studyPlatformCompatService, 'importQuestions').mockResolvedValue({
      batchId: 'batch-1',
      totalRows: 1,
      processedRows: 1,
      importedRows: 1,
      duplicateRows: 0,
      errorRows: 0,
      preview: [
        {
          statement: 'Questao exemplo',
          subjectName: 'Matematica',
          topicName: 'Estatistica',
          questionType: 'multiple_choice',
          objective: 'enem',
        },
      ],
    });

    const response = await request(app)
      .post('/api/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        batchName: 'seed-enem',
        format: 'json',
        payload: [
          {
            enunciado: 'Questao exemplo',
            disciplina: 'Matematica',
            topico: 'Estatistica',
            objetivo: 'enem',
            tipo: 'multiple_choice',
            option_a: '1',
            option_b: '2',
            gabarito: 'B',
          },
        ],
      })
      .expect(201);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "batchId": "batch-1",
        "duplicateRows": 0,
        "errorRows": 0,
        "importedRows": 1,
        "preview": [
          {
            "objective": "enem",
            "questionType": "multiple_choice",
            "statement": "Questao exemplo",
            "subjectName": "Matematica",
            "topicName": "Estatistica",
          },
        ],
        "processedRows": 1,
        "totalRows": 1,
      }
    `);
  });
});
