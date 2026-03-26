const baseUrl = process.env.QA_BASE_URL || 'https://zero-base-three.vercel.app';
const timestamp = Date.now();
const email = `sprint3-${timestamp}@example.com`;
const password = 'SenhaSegura123';
const name = 'Sprint 3 QA';

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

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const assertOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
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
      weakestDisciplines: ['matematica', 'linguagens'],
    }),
  });

  assertOk(onboarding.response.ok, `onboarding falhou (${onboarding.response.status}): ${JSON.stringify(onboarding.payload)}`);

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

  console.log(JSON.stringify({
    success: true,
    email,
    sessionIds: [session1.sessionId, session2.sessionId],
    session1: {
      recommendation: recommendationAfterSession1.payload?.recommendation ?? null,
      homeDecision: homeAfterSession1.payload?.decision ?? null,
    },
    session2: {
      recommendation: recommendationAfterSession2.payload?.recommendation ?? null,
      homeDecision: homeAfterSession2.payload?.decision ?? null,
    },
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
