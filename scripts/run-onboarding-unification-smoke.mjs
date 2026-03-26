const baseUrl = (process.env.ONBOARDING_QA_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const timestamp = Date.now();
const email = `onboarding.unification.${timestamp}@gmail.com`;
const password = 'SenhaSegura123';
const name = 'Onboarding QA';
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
  assertOk(
    streak.lastDay === null || typeof streak.lastDay === 'string',
    `${label}: streak.lastDay invalido`,
  );
};

const main = async () => {
  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  assertOk(register.response.ok, `register falhou (${register.response.status}): ${JSON.stringify(register.payload)}`);
  const accessToken = register.payload?.session?.accessToken;
  assertOk(accessToken, 'register nao retornou accessToken');

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
    'initialRecommendation deveria iniciar em Matematica para weakestDisciplines[0]',
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
  assertOk(
    onboardingSaveProfileAgain.payload?.streak?.days >= 2,
    'POST /api/onboarding perfil 2 nao deveria apagar streak',
  );
  assertOk(
    onboardingSaveProfileAgain.payload?.streak?.lastDay === today,
    'POST /api/onboarding perfil 2 nao deveria apagar streakLastDay',
  );

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
  assertOk(recommendation.payload?.recommendation?.id, 'recommendacao nao retornou id');
  assertOk(
    recommendation.payload?.recommendation?.disciplineName === 'Matematica',
    'recommendacao inicial deveria continuar em Matematica',
  );
  assertOk(
    String(recommendation.payload?.recommendation?.reason || '').length > 10,
    'recommendacao inicial veio sem reason utilizavel',
  );

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

  assertOk(
    onboardingAfterLegacy.response.ok,
    `onboarding GET apos legacy save falhou (${onboardingAfterLegacy.response.status}): ${JSON.stringify(onboardingAfterLegacy.payload)}`,
  );
  assertProfile(onboardingAfterLegacy.payload?.profile, updatedProfile, 'GET /api/onboarding apos legacy save preserva perfil');
  assertOk(onboardingAfterLegacy.payload?.streak?.days >= 3, 'legacy save nao refletiu no endpoint oficial');
  assertOk(onboardingAfterLegacy.payload?.streak?.lastDay === today, 'legacy save nao refletiu streakLastDay no endpoint oficial');

  console.log(JSON.stringify({
    success: true,
    baseUrl,
    email,
    meBefore: {
      onboardingCompleted: meBefore.payload?.onboardingCompleted ?? null,
      profile: meBefore.payload?.profile ?? null,
    },
    onboardingAfter: onboardingAfter.payload,
    recommendation: recommendation.payload?.recommendation ?? null,
    home: {
      decision: home.payload?.decision ?? null,
      weeklyProgress: home.payload?.weeklyProgress ?? null,
    },
    legacy: {
      loadHeader: legacyLoad.response.headers.get('x-zerobase-legacy'),
      saveHeader: legacySave.response.headers.get('x-zerobase-legacy'),
      savePayload: legacySave.payload ?? null,
    },
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
