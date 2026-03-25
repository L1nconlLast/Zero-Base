import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const cypressEnvPath = path.join(repoRoot, 'cypress.env.json');

  if (fs.existsSync(cypressEnvPath)) {
    const cypressEnv = JSON.parse(fs.readFileSync(cypressEnvPath, 'utf8'));
    const serviceRoleKey = String(cypressEnv.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (serviceRoleKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
    }
  }
}

const { default: registerHandler } = await import('../api/auth/register.ts');
const { default: loginHandler } = await import('../api/auth/login.ts');
const { default: meHandler } = await import('../api/me.ts');
const { default: homeHandler } = await import('../api/home.ts');
const { default: onboardingHandler } = await import('../api/onboarding/index.ts');
const { default: onboardingLoadHandler } = await import('../api/onboarding/load.ts');
const { default: onboardingSaveHandler } = await import('../api/onboarding/save.ts');
const { default: recommendationHandler } = await import('../api/recommendations/current.ts');
const { default: studySessionsHandler } = await import('../api/study-sessions/index.ts');
const { default: studySessionRouterHandler } = await import('../api/study-session-router.ts');

const PORT = Number(process.env.ONBOARDING_LOCAL_AUDIT_PORT || 3310);
const baseUrl = `http://127.0.0.1:${PORT}`;
const today = new Date().toISOString().slice(0, 10);

const initialProfile = {
  examType: 'enem',
  level: 'iniciante',
  weeklyHours: 6,
  preferredGoal: 'aprovacao',
  weakestDisciplines: ['matematica', 'linguagens'],
};

const updatedProfile = {
  ...initialProfile,
  weeklyHours: 8,
  preferredGoal: 'constancia',
};

const correctAnswerMap = new Map([
  ['Um produto custa R$ 200,00 e recebeu desconto de 15%. Qual e o novo preco?', 'R$ 170,00'],
  ['Um salario de R$ 1.500,00 recebeu aumento de 10%. Qual passou a ser o novo salario?', 'R$ 1.650,00'],
  ['Qual e o valor correspondente a 25% de 320?', '80'],
  ['Depois de um desconto de 20%, um item passou a custar R$ 240,00. Qual era o preco original?', 'R$ 300,00'],
  ['Em uma turma com 40 alunos, 30% faltaram em um dia. Quantos alunos faltaram?', '12'],
  ['O preco de um caderno subiu de R$ 80,00 para R$ 100,00. Qual foi o percentual de aumento?', '25%'],
  ['Um produto custa R$ 250,00 e incide um imposto de 12% sobre esse valor. Qual sera o preco final?', 'R$ 280,00'],
  ['O numero 18 corresponde a qual percentual de 72?', '25%'],
  ['Uma papelaria tinha 500 cadernos em estoque e vendeu 40% deles. Quantos cadernos restaram?', '300'],
  ['Uma camisa sofreu aumento de 25% e passou a custar R$ 150,00. Qual era o preco antes do aumento?', 'R$ 120,00'],
  ['Em um cartaz com a frase "Beba agua ao longo do dia", a finalidade principal do texto e:', 'orientar o leitor a adotar um habito'],
  ['Na frase "O museu abre as 9h e fecha as 17h", a informacao central e:', 'o horario de funcionamento do museu'],
  ['Em uma campanha com o slogan "Vacinar e proteger", a relacao entre as palavras indica:', 'que a vacinacao gera protecao'],
  ['Num anuncio escrito "Ultimos dias de inscricao", o efeito principal da mensagem e:', 'criar senso de urgencia'],
  ['Ao ler "Traga sua garrafa para reduzir residuos", entende-se que o texto pretende:', 'estimular atitude sustentavel'],
]);

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};

const mountStudySessionRoute = (action = null) => wrap(async (req, res) => {
  Object.defineProperty(req, 'query', {
    value: {
      ...req.query,
      sessionId: req.params.sessionId,
      ...(action ? { action } : {}),
    },
    configurable: true,
  });

  await studySessionRouterHandler(req, res);
});

const app = express();
app.use(express.json());

app.post('/api/auth/register', wrap(registerHandler));
app.post('/api/auth/login', wrap(loginHandler));
app.get('/api/me', wrap(meHandler));
app.get('/api/home', wrap(homeHandler));
app.all('/api/onboarding', wrap(onboardingHandler));
app.get('/api/onboarding/load', wrap(onboardingLoadHandler));
app.post('/api/onboarding/save', wrap(onboardingSaveHandler));
app.get('/api/recommendations/current', wrap(recommendationHandler));
app.post('/api/study-sessions', wrap(studySessionsHandler));
app.get('/api/study-sessions/:sessionId', mountStudySessionRoute());
app.post('/api/study-sessions/:sessionId/answer', mountStudySessionRoute('answer'));
app.post('/api/study-sessions/:sessionId/finish', mountStudySessionRoute('finish'));

app.use((error, _req, res, _next) => {
  res.status(500).json({
    success: false,
    error: {
      code: 'LOCAL_AUDIT_ERROR',
      message: error instanceof Error ? error.message : 'Erro inesperado no harness local.',
    },
  });
});

const parseResponse = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = await parseResponse(response);
  return { response, payload };
};

const assertOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const assertProfile = (profile, expected, label) => {
  assertOk(profile, `${label}: profile ausente`);
  assertOk(profile.examType === expected.examType, `${label}: examType divergente`);
  assertOk(profile.level === expected.level, `${label}: level divergente`);
  assertOk(profile.weeklyHours === expected.weeklyHours, `${label}: weeklyHours divergente`);
  assertOk(profile.preferredGoal === expected.preferredGoal, `${label}: preferredGoal divergente`);
  assertOk(
    JSON.stringify(profile.weakestDisciplines || []) === JSON.stringify(expected.weakestDisciplines || []),
    `${label}: weakestDisciplines divergente`,
  );
};

const assertStreakShape = (streak, label) => {
  assertOk(streak && typeof streak.days === 'number', `${label}: streak.days invalido`);
  assertOk(streak.lastDay === null || typeof streak.lastDay === 'string', `${label}: streak.lastDay invalido`);
};

const getCorrectOption = (question) => {
  const expectedText = correctAnswerMap.get(question.prompt);
  assertOk(expectedText, `questao sem resposta mapeada: ${question.prompt}`);
  const option = question.options.find((entry) => entry.text === expectedText);
  assertOk(option, `alternativa correta nao encontrada para: ${question.prompt}`);
  return option;
};

const getWrongOption = (question) => {
  const correctOption = getCorrectOption(question);
  const wrongOption = question.options.find((entry) => entry.id !== correctOption.id);
  assertOk(wrongOption, `alternativa incorreta nao encontrada para: ${question.prompt}`);
  return wrongOption;
};

const answerSession = async (session, authHeaders, strategy) => {
  const subjectCounts = new Map();

  for (const question of session.questions) {
    const subjectKey = normalize(question.subject);
    const currentCount = subjectCounts.get(subjectKey) || 0;
    subjectCounts.set(subjectKey, currentCount + 1);

    const answerMode = strategy(question, currentCount, subjectKey);
    const chosenOption = answerMode === 'wrong'
      ? getWrongOption(question)
      : getCorrectOption(question);

    const answer = await request(`/api/study-sessions/${session.sessionId}/answer`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        questionId: question.id,
        alternativeId: chosenOption.id,
        responseTimeSeconds: 12,
      }),
    });

    assertOk(answer.response.ok, `answer falhou (${answer.response.status}): ${JSON.stringify(answer.payload)}`);
  }
};

const runHybridOnboardingAudit = async () => {
  const timestamp = Date.now();
  const email = `onboarding.local.${timestamp}@gmail.com`;
  const password = 'SenhaSegura123';
  const name = 'Onboarding Local QA';

  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  assertOk(register.response.ok, `register onboarding falhou (${register.response.status}): ${JSON.stringify(register.payload)}`);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  assertOk(login.response.ok, `login onboarding falhou (${login.response.status}): ${JSON.stringify(login.payload)}`);
  const accessToken = login.payload?.session?.accessToken;
  assertOk(accessToken, 'login onboarding nao retornou accessToken');

  const authHeaders = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const meBefore = await request('/api/me', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(meBefore.response.ok, `me antes do onboarding falhou (${meBefore.response.status}): ${JSON.stringify(meBefore.payload)}`);
  assertOk(meBefore.payload?.onboardingCompleted === false, 'me antes do onboarding deveria marcar onboardingCompleted=false');
  assertOk(meBefore.payload?.profile === null, 'me antes do onboarding deveria retornar profile=null');

  const onboardingBefore = await request('/api/onboarding', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(onboardingBefore.response.ok, `onboarding GET inicial falhou (${onboardingBefore.response.status}): ${JSON.stringify(onboardingBefore.payload)}`);
  assertOk(onboardingBefore.payload?.profile === null, 'GET /api/onboarding inicial deveria retornar profile=null');
  assertStreakShape(onboardingBefore.payload?.streak, 'GET /api/onboarding inicial');

  const onboardingSaveProfile = await request('/api/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(initialProfile),
  });

  assertOk(
    onboardingSaveProfile.response.ok,
    `onboarding POST perfil falhou (${onboardingSaveProfile.response.status}): ${JSON.stringify(onboardingSaveProfile.payload)}`,
  );
  assertProfile(onboardingSaveProfile.payload?.profile, initialProfile, 'POST /api/onboarding perfil');
  assertStreakShape(onboardingSaveProfile.payload?.streak, 'POST /api/onboarding perfil');
  assertOk(onboardingSaveProfile.payload?.initialRecommendation?.id, 'POST /api/onboarding perfil nao gerou initialRecommendation');
  assertOk(
    onboardingSaveProfile.payload?.initialRecommendation?.disciplineName === 'Matematica',
    'initialRecommendation deveria iniciar em Matematica',
  );

  const meAfterProfile = await request('/api/me', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(meAfterProfile.response.ok, `me apos perfil falhou (${meAfterProfile.response.status}): ${JSON.stringify(meAfterProfile.payload)}`);
  assertOk(meAfterProfile.payload?.onboardingCompleted === true, 'me apos perfil deveria marcar onboardingCompleted=true');
  assertProfile(meAfterProfile.payload?.profile, initialProfile, 'GET /api/me apos perfil');

  const onboardingSaveStreak = await request('/api/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      streakDays: 2,
      streakLastDay: today,
    }),
  });

  assertOk(
    onboardingSaveStreak.response.ok,
    `onboarding POST streak falhou (${onboardingSaveStreak.response.status}): ${JSON.stringify(onboardingSaveStreak.payload)}`,
  );
  assertProfile(onboardingSaveStreak.payload?.profile, initialProfile, 'POST /api/onboarding streak preserva perfil');
  assertOk(onboardingSaveStreak.payload?.streak?.days >= 2, 'POST /api/onboarding streak nao persistiu days >= 2');
  assertOk(onboardingSaveStreak.payload?.streak?.lastDay === today, 'POST /api/onboarding streak nao persistiu lastDay');

  const onboardingSaveProfileAgain = await request('/api/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(updatedProfile),
  });

  assertOk(
    onboardingSaveProfileAgain.response.ok,
    `onboarding POST perfil 2 falhou (${onboardingSaveProfileAgain.response.status}): ${JSON.stringify(onboardingSaveProfileAgain.payload)}`,
  );
  assertProfile(onboardingSaveProfileAgain.payload?.profile, updatedProfile, 'POST /api/onboarding perfil 2');
  assertOk(onboardingSaveProfileAgain.payload?.streak?.days >= 2, 'POST /api/onboarding perfil 2 apagou streak');
  assertOk(onboardingSaveProfileAgain.payload?.streak?.lastDay === today, 'POST /api/onboarding perfil 2 apagou streakLastDay');

  const onboardingAfter = await request('/api/onboarding', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(onboardingAfter.response.ok, `onboarding GET final falhou (${onboardingAfter.response.status}): ${JSON.stringify(onboardingAfter.payload)}`);
  assertProfile(onboardingAfter.payload?.profile, updatedProfile, 'GET /api/onboarding final');
  assertOk(onboardingAfter.payload?.streak?.days >= 2, 'GET /api/onboarding final nao trouxe streak persistida');
  assertOk(onboardingAfter.payload?.streak?.lastDay === today, 'GET /api/onboarding final nao trouxe streakLastDay persistida');

  const recommendation = await request('/api/recommendations/current', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(
    recommendation.response.ok,
    `recommendations/current falhou (${recommendation.response.status}): ${JSON.stringify(recommendation.payload)}`,
  );
  assertOk(recommendation.payload?.recommendation?.disciplineName === 'Matematica', 'recommendacao inicial deveria continuar em Matematica');
  assertOk(String(recommendation.payload?.recommendation?.reason || '').length > 10, 'recommendacao inicial veio sem reason utilizavel');

  const home = await request('/api/home', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(home.response.ok, `home falhou (${home.response.status}): ${JSON.stringify(home.payload)}`);
  assertOk(home.payload?.user?.email === email, 'home nao refletiu usuario correto');
  assertOk(home.payload?.decision?.currentWeakPoint === 'Matematica', 'home nao refletiu ponto fraco atual');
  assertOk(home.payload?.weeklyProgress?.goalMinutes === 480, 'home nao refletiu weeklyHours atualizado');

  const legacyLoad = await request('/api/onboarding/load', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(legacyLoad.response.ok, `legacy load falhou (${legacyLoad.response.status}): ${JSON.stringify(legacyLoad.payload)}`);
  assertOk(
    String(legacyLoad.response.headers.get('x-zerobase-legacy') || '').includes('deprecated'),
    'legacy load nao expôs header de deprecacao',
  );
  assertOk(legacyLoad.payload?.streakDays === onboardingAfter.payload?.streak?.days, 'legacy load divergiu do endpoint oficial em streakDays');
  assertOk(legacyLoad.payload?.streakLastDay === onboardingAfter.payload?.streak?.lastDay, 'legacy load divergiu do endpoint oficial em streakLastDay');

  const legacySave = await request('/api/onboarding/save', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      streakDays: 3,
      streakLastDay: today,
    }),
  });

  assertOk(legacySave.response.ok, `legacy save falhou (${legacySave.response.status}): ${JSON.stringify(legacySave.payload)}`);
  assertOk(
    String(legacySave.response.headers.get('x-zerobase-legacy') || '').includes('deprecated'),
    'legacy save nao expôs header de deprecacao',
  );
  assertOk(legacySave.payload?.streakDays >= 3, 'legacy save nao retornou streakDays >= 3');
  assertOk(legacySave.payload?.streakLastDay === today, 'legacy save nao retornou streakLastDay esperado');

  const onboardingAfterLegacy = await request('/api/onboarding', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(onboardingAfterLegacy.response.ok, `onboarding GET apos legacy save falhou (${onboardingAfterLegacy.response.status}): ${JSON.stringify(onboardingAfterLegacy.payload)}`);
  assertProfile(onboardingAfterLegacy.payload?.profile, updatedProfile, 'GET /api/onboarding apos legacy save preserva perfil');
  assertOk(onboardingAfterLegacy.payload?.streak?.days >= 3, 'legacy save nao refletiu no endpoint oficial');
  assertOk(onboardingAfterLegacy.payload?.streak?.lastDay === today, 'legacy save nao refletiu streakLastDay no endpoint oficial');

  return {
    email,
    recommendation: recommendation.payload?.recommendation ?? null,
    homeDecision: home.payload?.decision ?? null,
    finalOnboarding: onboardingAfterLegacy.payload ?? null,
    legacyHeaders: {
      load: legacyLoad.response.headers.get('x-zerobase-legacy'),
      save: legacySave.response.headers.get('x-zerobase-legacy'),
    },
  };
};

const runRecommendationAndHomeAudit = async () => {
  const timestamp = Date.now();
  const email = `recommendation.local.${timestamp}@gmail.com`;
  const password = 'SenhaSegura123';
  const name = 'Recommendation Local QA';

  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  assertOk(register.response.ok, `register recomendacao falhou (${register.response.status}): ${JSON.stringify(register.payload)}`);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  assertOk(login.response.ok, `login recomendacao falhou (${login.response.status}): ${JSON.stringify(login.payload)}`);
  const accessToken = login.payload?.session?.accessToken;
  assertOk(accessToken, 'login recomendacao nao retornou accessToken');

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const onboarding = await request('/api/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(initialProfile),
  });

  assertOk(onboarding.response.ok, `onboarding recomendacao falhou (${onboarding.response.status}): ${JSON.stringify(onboarding.payload)}`);

  const startSession1 = await request('/api/study-sessions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ limit: 5 }),
  });

  assertOk(startSession1.response.ok, `start session 1 falhou (${startSession1.response.status}): ${JSON.stringify(startSession1.payload)}`);
  const session1 = startSession1.payload?.session;
  assertOk(Array.isArray(session1?.questions) && session1.questions.length === 5, 'sessao 1 nao retornou 5 questoes');

  await answerSession(session1, authHeaders, (_question, subjectIndex, subjectKey) => {
    if (subjectKey === 'matematica') {
      return subjectIndex < 2 ? 'wrong' : 'correct';
    }

    return 'correct';
  });

  const finishSession1 = await request(`/api/study-sessions/${session1.sessionId}/finish`, {
    method: 'POST',
    headers: authHeaders,
  });

  assertOk(finishSession1.response.ok, `finish session 1 falhou (${finishSession1.response.status}): ${JSON.stringify(finishSession1.payload)}`);

  const recommendationAfterSession1 = await request('/api/recommendations/current', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(recommendationAfterSession1.response.ok, `recommendation 1 falhou (${recommendationAfterSession1.response.status}): ${JSON.stringify(recommendationAfterSession1.payload)}`);
  assertOk(recommendationAfterSession1.payload?.recommendation?.decisionType === 'error_rate_recent', 'recommendacao 1 nao saiu como error_rate_recent');
  assertOk(
    String(recommendationAfterSession1.payload?.recommendation?.reason || '').includes('Voce errou'),
    'recommendacao 1 continuou generica',
  );

  const homeAfterSession1 = await request('/api/home', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(homeAfterSession1.response.ok, `home 1 falhou (${homeAfterSession1.response.status}): ${JSON.stringify(homeAfterSession1.payload)}`);
  assertOk(homeAfterSession1.payload?.decision?.currentWeakPoint === 'Matematica', 'home 1 nao refletiu Matematica como ponto fraco atual');

  const startSession2 = await request('/api/study-sessions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ limit: 5 }),
  });

  assertOk(startSession2.response.ok, `start session 2 falhou (${startSession2.response.status}): ${JSON.stringify(startSession2.payload)}`);
  const session2 = startSession2.payload?.session;
  assertOk(Array.isArray(session2?.questions) && session2.questions.length === 5, 'sessao 2 nao retornou 5 questoes');

  await answerSession(session2, authHeaders, (_question, _subjectIndex, subjectKey) => (
    subjectKey === 'linguagens' ? 'wrong' : 'correct'
  ));

  const finishSession2 = await request(`/api/study-sessions/${session2.sessionId}/finish`, {
    method: 'POST',
    headers: authHeaders,
  });

  assertOk(finishSession2.response.ok, `finish session 2 falhou (${finishSession2.response.status}): ${JSON.stringify(finishSession2.payload)}`);

  const recommendationAfterSession2 = await request('/api/recommendations/current', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(recommendationAfterSession2.response.ok, `recommendation 2 falhou (${recommendationAfterSession2.response.status}): ${JSON.stringify(recommendationAfterSession2.payload)}`);
  assertOk(recommendationAfterSession2.payload?.recommendation?.decisionType === 'error_rate_recent', 'recommendacao 2 perdeu decisionType error_rate_recent');
  assertOk(recommendationAfterSession2.payload?.recommendation?.disciplineName === 'Linguagens', 'recommendacao 2 nao mudou para Linguagens');

  const homeAfterSession2 = await request('/api/home', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(homeAfterSession2.response.ok, `home 2 falhou (${homeAfterSession2.response.status}): ${JSON.stringify(homeAfterSession2.payload)}`);
  assertOk(homeAfterSession2.payload?.decision?.currentWeakPoint === 'Linguagens', 'home 2 nao refletiu Linguagens como ponto fraco atual');
  assertOk(
    String(homeAfterSession2.payload?.decision?.nextFocus || '').includes('Linguagens'),
    'home 2 nao atualizou o proximo foco',
  );

  return {
    email,
    sessionIds: [session1.sessionId, session2.sessionId],
    recommendationAfterSession1: recommendationAfterSession1.payload?.recommendation ?? null,
    recommendationAfterSession2: recommendationAfterSession2.payload?.recommendation ?? null,
    homeDecisionAfterSession2: homeAfterSession2.payload?.decision ?? null,
  };
};

const server = app.listen(PORT, '127.0.0.1');

try {
  await new Promise((resolve) => server.once('listening', resolve));

  const hybrid = await runHybridOnboardingAudit();
  const recommendation = await runRecommendationAndHomeAudit();

  console.log(JSON.stringify({
    success: true,
    baseUrl,
    hybrid,
    recommendation,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
