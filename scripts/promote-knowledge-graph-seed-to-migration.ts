import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const generatedSeedPath = path.join(
  rootDir,
  'supabase',
  'seed',
  'knowledge-graph',
  'generated',
  'knowledge_graph_seed.sql',
);

const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

const toTimestampPrefix = (date: Date): string => {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const sec = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${sec}`;
};

async function main(): Promise<void> {
  await mkdir(migrationsDir, { recursive: true });

  const suffix = '_knowledge_graph_generated_seed.sql';

  const targetFileName = `${toTimestampPrefix(new Date())}${suffix}`;
  const targetPath = path.join(migrationsDir, targetFileName);

  await copyFile(generatedSeedPath, targetPath);

  console.log(`Migration criada: supabase/migrations/${targetFileName}`);
  console.log('Proximo passo: executar apply_remote_migrations.ps1 para aplicar remoto.');
}

void main();