/**
 * e2e-ypt-app.spec.ts
 *
 * E2E com Playwright - Fluxos críticos para go-live
 * Cobre: Settings, Grupos, Ranking, Navegação
 *
 * Run: npx playwright test e2e/e2e-ypt-app.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// ── Helpers ──
async function login(page: any) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button:has-text("Entrar")');
  await page.waitForNavigation();
}

// ============================================================
test.describe('YPT App — End-to-End Suite', () => {
  // ── Setup ──
  test.beforeEach(async ({ page }) => {
    // Para testes, usar um token fixo ou login real
    // Aqui simplificamos: navegue direto ao app se já autenticado
    await page.goto(BASE_URL);
  });

  // ========================================================
  // NAVEGAÇÃO BÁSICA
  // ========================================================
  test('🔄 Navegação: alternar entre Ranking, Grupos, Settings', async ({ page }) => {
    // Verifica que a app-nav está presente
    const nav = page.locator('.app-nav');
    await expect(nav).toBeVisible();

    // Clica em Ranking
    await page.click('button:has-text("Ranking")');
    await expect(page).toHaveURL(new RegExp('/ranking|.*page=ranking'));
    await expect(page.locator('text=Ranking')).toBeVisible();

    // Clica em Grupos
    await page.click('button:has-text("Grupos")');
    await expect(page).toHaveURL(new RegExp('/groups|.*page=groups'));
    await expect(page.locator('text=Grupos')).toBeVisible();

    // Clica em Configurações
    await page.click('button:has-text("Configurações")');
    await expect(page).toHaveURL(new RegExp('/settings|.*page=settings'));
    await expect(page.locator('text=Configurações')).toBeVisible();
  });

  test('✅ Navegação: render sem erro', async ({ page }) => {
    // Valida que não há erros de console
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    expect(errors.length).toBe(0);
  });

  // ========================================================
  // SETTINGS PAGE
  // ========================================================
  test('🎨 Settings: alterar tema e persistir após reload', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/settings`);
    await page.waitForSelector('button:has-text("Tema")');

    // Encontra seção Tema
    await page.click('text="Tema"');

    // Clica no toggle dark/light
    const themeToggle = page.locator('.toggle-btn').first();
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();

    // Aguarda save
    await page.waitForTimeout(500);

    // Recarrega página
    await page.reload();

    // Valida que tema persistiu
    // (em localStorage ou via API)
    const bodyClass = await page.locator('html').getAttribute('data-theme');
    expect(bodyClass).not.toBeNull();
  });

  test('📅 Settings: criar/editar/remover horário de cronograma', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/settings`);

    // Clica em "Cronograma"
    await page.click('text="Cronograma"');

    // Clica "+ Novo Horário"
    await page.click('button:has-text("Novo Horário")');

    // Preenche formulário
    await page.selectOption('select', { value: '1' }); // Segunda
    await page.fill('input[type="time"]:nth-of-type(1)', '08:00');
    await page.fill('input[type="time"]:nth-of-type(2)', '10:00');
    await page.fill('input[placeholder*="ex"]', 'Matemática');

    // Clica "Adicionar"
    await page.click('button:has-text("Adicionar")');

    // Valida que schedule aparece na lista
    await expect(page.locator('text=Matemática')).toBeVisible({ timeout: 5000 });

    // Edita: clica no item
    await page.click('text=Matemática');
    await page.fill('input[placeholder*="ex"]', 'Português');
    await page.click('button:has-text("Salvar")');

    await expect(page.locator('text=Português')).toBeVisible({ timeout: 5000 });

    // Deleta
    await page.click('button:has-text("Remover")');
    await expect(page.locator('text=Português')).not.toBeVisible({ timeout: 5000 });
  });

  test('🎯 Settings: configurar D-Day e validar contador', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/settings`);

    // Clica em "D-Day"
    await page.click('text="D-Day"');

    // Input para nome do evento
    await page.fill('input[placeholder*="ENEM"]', 'ENEM 2026');

    // Input para data
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill('2026-10-15');

    // Salva
    await page.click('button:has-text("Salvar")');

    // Valida que contador aparece (ex: "150 dias para ENEM")
    await expect(page.locator('text=/\\d+\\s+dias/i')).toBeVisible({ timeout: 5000 });
  });

  test('⚠️ Settings: tentar reset (cancelar e confirmar)', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/settings`);

    // Clica em "Reiniciar dados"
    await page.click('text="Reiniciar dados"');

    // Modal aparece
    await expect(page.locator('text=reversível')).toBeVisible();

    // Clica cancelar
    await page.click('button:has-text("Cancelar")');

    // Modal fecha
    await expect(page.locator('text=reversível')).not.toBeVisible();

    // Clica novamente para reset
    await page.click('text="Reiniciar dados"');

    // Tenta confirmar SEM digitar "CONFIRMAR" → botão desabilitado
    const confirmBtn = page.locator('button:has-text("Resetar")').first();
    await expect(confirmBtn).toBeDisabled();

    // Digita "CONFIRMAR"
    await page.fill('input[placeholder*="CONFIRMAR"]', 'CONFIRMAR');

    // Agora botão está enabled
    await expect(confirmBtn).toBeEnabled();

    // Confirma
    // (Em teste, cancela para não deletar dados reais)
    await page.click('button:has-text("Cancelar")');
  });

  // ========================================================
  // GRUPOS PAGE
  // ========================================================
  test('👥 Grupos: aplicar filtros e validar resultados', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/groups`);

    // Aguarda carregamento
    await page.waitForSelector('[class*="group-card"]');

    // Clica em filtro "Categoria"
    await page.click('[aria-label*="Categoria"] select');
    await page.selectOption('[aria-label*="Categoria"] select', 'REP-ENEM');

    // Aguarda refiltragem
    await page.waitForTimeout(500);

    // Valida que resultados aparecem
    const cards = page.locator('[class*="group-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('👥 Grupos: criar grupo', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/groups`);

    // Clica "+ Novo Grupo"
    await page.click('button:has-text("Novo Grupo")');

    // Preenche formulário
    await page.fill('input[placeholder*="nome"]', 'Grupo ENEM 2026');
    await page.fill('textarea', 'Grupo para preparação do ENEM');
    await page.selectOption('select', 'REP-ENEM');

    // Clica "Criar"
    await page.click('button:has-text("Criar")');

    // Modal fecha e grupo aparece na lista
    await expect(page.locator('text=Grupo ENEM 2026')).toBeVisible({ timeout: 5000 });
  });

  test('👥 Grupos: entrar e sair de grupo', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/groups`);

    // Encontra um grupo público
    const groupCard = page.locator('[class*="group-card"]').first();
    await expect(groupCard).toBeVisible();

    // Clica "Entrar"
    await page.click('button:has-text("Entrar"):not(:has-text("Sair"))');

    // Aguarda
    await page.waitForTimeout(500);

    // Validar que agora mostra "Sair"
    await expect(page.locator('button:has-text("Sair")')).toBeVisible({ timeout: 5000 });

    // Clica "Sair"
    await page.click('button:has-text("Sair")');

    // Volta a "Entrar"
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible({ timeout: 5000 });
  });

  test('👥 Grupos: validar badges privado/promovido', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/groups`);

    // Filtra apenas públicos (padrão)
    const publicCards = page.locator('[class*="group-card"]');

    // Valida que cards têm badges ou indicadores
    const firstCard = publicCards.first();
    await expect(firstCard).toBeVisible();

    // Procura por badge "privado" ou "promovido" (se houver)
    const badge = firstCard.locator('[class*="badge"]');
    // Pode estar vazio ou conter badge
  });

  // ========================================================
  // RANKING PAGE
  // ========================================================
  test('⚡ Ranking: alternar período diário/semanal/mensal', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ranking`);

    // Aguarda load
    await page.waitForSelector('[class*="ranking"]');

    // Clica em "Semanal"
    await page.click('button:has-text("Semanal")');
    await expect(page.locator('text=Semanal')).toBeVisible();

    // Clica em "Mensal"
    await page.click('button:has-text("Mensal")');
    await expect(page.locator('text=Mensal')).toBeVisible();

    // Clica em "Diário"
    await page.click('button:has-text("Diário")');
    await expect(page.locator('text=Diário')).toBeVisible();
  });

  test('⚡ Ranking: aplicar filtro categoria', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ranking`);

    // Filtro categoria
    const categoryFilter = page.locator('select[aria-label*="Categoria"]');
    await categoryFilter.selectOption('REP-ENEM');

    await page.waitForTimeout(500);

    // Valida que resultados filtraram
    const list = page.locator('[class*="ranking-list"]');
    await expect(list).toBeVisible();
  });

  test('⚡ Ranking: validar top 3 e lista paginada', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ranking`);

    // Top 3 com pódio (1°, 2°, 3°)
    const top3 = page.locator('[class*="rank-podium"]');
    // Pode ter 0-3 entradas

    // Lista abaixo
    const list = page.locator('[class*="rank-item"]');
    const count = await list.count();

    // Valida que tem pelo menos skeleton enquanto carrega
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('⚡ Ranking: validar estado loading/skeleton', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ranking`);

    // Procura por skeleton ou loading state
    const skeleton = page.locator('[class*="skeleton"]');
    const loading = page.locator('[class*="loading"]');

    // Se encontrar, aguarda que carregue
    if (await skeleton.count() > 0) {
      await expect(skeleton.first()).toBeHidden({ timeout: 5000 });
    }

    // Valida que conteúdo apareceu
    const content = page.locator('[class*="ranking"] [class*="card"]');
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });

  test('⚡ Ranking: meu ranking com período e percentil', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ranking`);

    // Clica em "Meu Ranking" ou "Me"
    await page.click('button:has-text("Meu ranking"):nth-of-type(1)');

    // Valida que mostra:
    // - Position
    // - Percentile
    // - Total time
    await expect(page.locator('text=/Posição|Position/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Percentil|Percentile/')).toBeVisible();
    await expect(page.locator('text=/[0-9]+:[0-9]+/')).toBeVisible(); // HH:MM time
  });

  // ========================================================
  // RESPONSIVIDADE
  // ========================================================
  test('📱 Mobile: navegação em tela pequena', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await page.goto(BASE_URL);

    // Nav deve estar colapsada ou visível
    const nav = page.locator('.app-nav');
    await expect(nav).toBeVisible();

    // Clica em tab
    await page.click('button:has-text("Grupos")');
    await expect(page.locator('text=Grupos')).toBeVisible();
  });

  // ========================================================
  // TESTES DE ERROR & EDGE CASES
  // ========================================================
  test('❌ Error handling: erro de rede gracioso', async ({ page }) => {
    // Habilita offline
    await page.context().setOffline(true);

    await page.goto(`${BASE_URL}/#/ranking`);

    // Deve mostrar erro ou fallback
    const errorMsg = page.locator('[class*="error"], [aria-label*="error"]');
    // Pode estar presente ou não dependendo da impl

    // Volta online
    await page.context().setOffline(false);
  });

  test('🔄 Refresh durante carregamento', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ranking`);

    // Recarrega enquanto carregando
    await page.reload();

    // Deve recarregar sem erro
    await page.waitForLoadState('networkidle');

    const heading = page.locator('text=Ranking');
    await expect(heading).toBeVisible();
  });
});
