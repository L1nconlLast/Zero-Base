const baseUrl = process.env.QA_BASE_URL || 'https://zero-base-three.vercel.app';
const timestamp = Date.now();
const email = `sprint2-${timestamp}@example.com`;
const password = 'SenhaSegura123';
const name = 'Sprint 2 QA';

const questionAnswerMap = new Map([
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
]);

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

const main = async () => {
  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  assertOk(register.response.ok, `register falhou (${register.response.status}): ${JSON.stringify(register.payload)}`);
  const accessToken = register.payload?.session?.accessToken;
  assertOk(accessToken, 'register nao retornou accessToken');

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const onboarding = await request('/api/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      examType: 'enem',
      level: 'iniciante',
      weeklyHours: 6,
      preferredGoal: 'aprovacao',
      weakestDisciplines: ['matematica'],
    }),
  });

  assertOk(onboarding.response.ok, `onboarding falhou (${onboarding.response.status}): ${JSON.stringify(onboarding.payload)}`);

  const homeBefore = await request('/api/home', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(homeBefore.response.ok, `home antes da sessao falhou (${homeBefore.response.status}): ${JSON.stringify(homeBefore.payload)}`);

  const startSession = await request('/api/study-sessions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ limit: 5 }),
  });

  assertOk(startSession.response.ok, `start session falhou (${startSession.response.status}): ${JSON.stringify(startSession.payload)}`);
  const session = startSession.payload?.session;
  assertOk(session?.sessionId, 'sessao nao retornou sessionId');
  assertOk(Array.isArray(session?.questions) && session.questions.length === 5, 'sessao nao retornou 5 questoes');

  for (const question of session.questions) {
    const expectedText = questionAnswerMap.get(question.prompt);
    assertOk(expectedText, `questao sem resposta mapeada no smoke: ${question.prompt}`);

    const chosenOption = question.options.find((option) => option.text === expectedText);
    assertOk(chosenOption, `alternativa correta nao encontrada para: ${question.prompt}`);

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

  const finish = await request(`/api/study-sessions/${session.sessionId}/finish`, {
    method: 'POST',
    headers: authHeaders,
  });

  assertOk(finish.response.ok, `finish falhou (${finish.response.status}): ${JSON.stringify(finish.payload)}`);
  assertOk(finish.payload?.total === 5, `finish total invalido: ${JSON.stringify(finish.payload)}`);
  assertOk(finish.payload?.correct === 5, `finish correct invalido: ${JSON.stringify(finish.payload)}`);

  const homeAfter = await request('/api/home', {
    method: 'GET',
    headers: authHeaders,
  });

  assertOk(homeAfter.response.ok, `home depois da sessao falhou (${homeAfter.response.status}): ${JSON.stringify(homeAfter.payload)}`);
  assertOk(homeAfter.payload?.weeklyProgress?.sessionsCompleted >= 1, 'home nao refletiu sessao concluida');
  assertOk(homeAfter.payload?.lastSession, 'home nao trouxe ultimo resultado');
  assertOk(homeAfter.payload?.activeStudySession === null, 'home ainda reporta sessao ativa apos finish');

  console.log(JSON.stringify({
    success: true,
    email,
    sessionId: session.sessionId,
    homeBefore: {
      sessionsCompleted: homeBefore.payload?.weeklyProgress?.sessionsCompleted ?? null,
      studyMinutes: homeBefore.payload?.weeklyProgress?.studyMinutes ?? null,
    },
    finish: {
      total: finish.payload.total,
      correct: finish.payload.correct,
      accuracy: finish.payload.accuracy,
    },
    homeAfter: {
      sessionsCompleted: homeAfter.payload?.weeklyProgress?.sessionsCompleted ?? null,
      studyMinutes: homeAfter.payload?.weeklyProgress?.studyMinutes ?? null,
      lastSession: homeAfter.payload?.lastSession ?? null,
    },
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
