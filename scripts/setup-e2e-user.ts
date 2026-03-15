/**
 * setup-e2e-user.ts
 *
 * Cria (ou reutiliza) um usuário confirmado para testes E2E em producao.
 * Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.
 *
 * Uso:
 *   npx tsx scripts/setup-e2e-user.ts
 *
 * Gera (ou atualiza) o arquivo cypress.env.json com as credenciais E2E.
 * Esse arquivo é lido automaticamente pelo Cypress.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

config(); // carrega .env

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const E2E_EMAIL = process.env.E2E_LOGIN_EMAIL || 'e2e_test@zerobase.dev';
const E2E_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'E2eTest@2026';
const E2E_NAME = 'E2E Test';

if (!SUPABASE_URL) {
  console.error('❌  SUPABASE_URL não configurado. Verifique o .env.');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY não configurado.');
  console.error('   Obtenha em: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function provisionE2EUser() {
  console.log(`🔧  Provisionando usuário E2E: ${E2E_EMAIL}`);

  // 1. Verificar se o usuário já existe
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error('Erro ao listar usuários:', listError.message);
    process.exit(1);
  }

  const existingUser = listData.users.find((u) => u.email === E2E_EMAIL);

  let userId: string;

  if (existingUser) {
    console.log('  ↳ Usuário já existe. Atualizando senha e confirmando email...');
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      {
        password: E2E_PASSWORD,
        email_confirm: true,
        user_metadata: { name: E2E_NAME },
      },
    );
    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError.message);
      process.exit(1);
    }
    userId = updateData.user.id;
  } else {
    console.log('  ↳ Criando novo usuário...');
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { name: E2E_NAME },
    });
    if (createError) {
      console.error('Erro ao criar usuário:', createError.message);
      process.exit(1);
    }
    userId = createData.user.id;
  }

  console.log(`  ✅  Usuário confirmado: ${E2E_EMAIL} (id: ${userId})`);

  // 2. Gravar em cypress.env.json (lido automaticamente pelo Cypress)
  const cypressEnvPath = 'cypress.env.json';
  let existing: Record<string, string> = {};
  if (existsSync(cypressEnvPath)) {
    try {
      existing = JSON.parse(readFileSync(cypressEnvPath, 'utf-8'));
    } catch {
      // arquivo corrompido; sobrescreve
    }
  }

  const updated = {
    ...existing,
    E2E_LOGIN_EMAIL: E2E_EMAIL,
    E2E_LOGIN_PASSWORD: E2E_PASSWORD,
  };

  writeFileSync(cypressEnvPath, JSON.stringify(updated, null, 2) + '\n');
  console.log(`  ✅  cypress.env.json atualizado com credenciais E2E.`);
  console.log('\n🚀  Agora execute os testes:');
  console.log('     npx cypress run --spec "cypress/e2e/auth.cy.ts"');
}

provisionE2EUser().catch((err: unknown) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
