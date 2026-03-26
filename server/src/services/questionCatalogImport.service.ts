import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger.service';

type Difficulty = 'facil' | 'medio' | 'dificil';
type QuestionType = 'multiple_choice' | 'true_false' | 'discursive';
type Objective = 'enem' | 'concurso' | 'both';

export interface RawQuestionImportRow {
  [key: string]: unknown;
}

export interface QuestionImportInput {
  batchName: string;
  format: 'json' | 'csv';
  payload: string | RawQuestionImportRow[];
  sourceId?: string;
  sourceName?: string;
  dryRun?: boolean;
}

export interface NormalizedQuestionOption {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
  correct: boolean;
}

export interface NormalizedQuestionImportRow {
  statement: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  objective: Objective;
  year: number | null;
  topicId: string | null;
  topicName: string | null;
  subjectName: string | null;
  area: string | null;
  subarea: string | null;
  boardName: string | null;
  examName: string | null;
  organization: string | null;
  jobName: string | null;
  sourceName: string | null;
  documentType: 'edital' | 'prova' | 'gabarito' | 'matriz' | 'cartilha' | 'outro' | null;
  documentTitle: string | null;
  documentUrl: string | null;
  explanation: string | null;
  options: NormalizedQuestionOption[];
  metadata: Record<string, unknown>;
  hashes: {
    statementHash: string;
    optionsHash: string;
    combinedHash: string;
  };
  raw: RawQuestionImportRow;
}

export interface QuestionImportResult {
  batchId: string | null;
  totalRows: number;
  processedRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  preview: Array<{
    statement: string;
    subjectName: string | null;
    topicName: string | null;
    questionType: QuestionType;
    objective: Objective;
  }>;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const KNOWN_OPTION_KEYS = [
  ['A', ['option_a', 'alternativa_a', 'opcao_a', 'a']],
  ['B', ['option_b', 'alternativa_b', 'opcao_b', 'b']],
  ['C', ['option_c', 'alternativa_c', 'opcao_c', 'c']],
  ['D', ['option_d', 'alternativa_d', 'opcao_d', 'd']],
  ['E', ['option_e', 'alternativa_e', 'opcao_e', 'e']],
] as const;

const toSlug = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const hashText = (value: string): string => createHash('sha256').update(value).digest('hex');

const toCanonicalText = (value: string): string => normalizeWhitespace(value).toLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const stringifyIfNeeded = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return null;
};

const sanitizeUnknownRecord = (value: unknown): RawQuestionImportRow => {
  if (!isRecord(value)) {
    throw new Error('Cada linha de importacao precisa ser um objeto.');
  }

  return value;
};

const normalizeRecordKeys = (row: RawQuestionImportRow): RawQuestionImportRow => {
  const normalized: RawQuestionImportRow = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value;
    normalized[toSlug(key)] = value;
  });

  return normalized;
};

const pickFirstString = (row: RawQuestionImportRow, aliases: string[]): string | null => {
  for (const alias of aliases) {
    const directValue = stringifyIfNeeded(row[alias]);
    if (directValue) return directValue;

    const normalizedValue = stringifyIfNeeded(row[toSlug(alias)]);
    if (normalizedValue) return normalizedValue;
  }

  return null;
};

const pickDocumentType = (value: string | null): NormalizedQuestionImportRow['documentType'] => {
  if (!value) return null;
  const normalized = toSlug(value);
  if (normalized.includes('edital')) return 'edital';
  if (normalized.includes('gabarito')) return 'gabarito';
  if (normalized.includes('matriz')) return 'matriz';
  if (normalized.includes('cartilha')) return 'cartilha';
  if (normalized.includes('prova')) return 'prova';
  return 'outro';
};

const parseYear = (value: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  if (!match) return null;
  const year = Number(match[0]);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return year;
};

const normalizeDifficulty = (value: string | null): Difficulty => {
  const normalized = toSlug(value || '');
  if (['facil', 'easy', 'basic', 'basico', 'iniciante'].includes(normalized)) return 'facil';
  if (['dificil', 'hard', 'advanced', 'avancado'].includes(normalized)) return 'dificil';
  return 'medio';
};

const normalizeQuestionType = (value: string | null, row: RawQuestionImportRow): QuestionType => {
  const normalized = toSlug(value || '');

  if (normalized.includes('discurs')) return 'discursive';
  if (normalized.includes('true_false') || normalized.includes('certo') || normalized.includes('errado')) return 'true_false';
  if (normalized.includes('discursive')) return 'discursive';

  const hasOptions = KNOWN_OPTION_KEYS.some(([, aliases]) => pickFirstString(row, [...aliases]));
  return hasOptions ? 'multiple_choice' : 'discursive';
};

const normalizeObjective = (value: string | null): Objective => {
  const normalized = toSlug(value || '');
  if (normalized === 'enem') return 'enem';
  if (normalized.startsWith('concurso')) return 'concurso';
  if (normalized === 'ambos' || normalized === 'both' || normalized === 'enem_concurso') return 'both';
  return 'both';
};

const parseJsonAlternatives = (value: unknown): Array<{ letter?: string; text?: string; correct?: boolean }> => {
  const fallback: Array<{ letter?: string; text?: string; correct?: boolean }> = [];

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return { text: entry };
        }
        if (isRecord(entry)) {
          return {
            letter: stringifyIfNeeded(entry.letter) || stringifyIfNeeded(entry.letra) || undefined,
            text: stringifyIfNeeded(entry.text) || stringifyIfNeeded(entry.texto) || undefined,
            correct: entry.correct === true || entry.correta === true,
          };
        }
        return null;
      })
      .filter((entry): entry is { letter?: string; text?: string; correct?: boolean } => Boolean(entry));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseJsonAlternatives(parsed);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const resolveCorrectLetter = (value: string | null): 'A' | 'B' | 'C' | 'D' | 'E' | null => {
  if (!value) return null;
  const compact = value.trim().toUpperCase();
  if (OPTION_LETTERS.includes(compact as typeof OPTION_LETTERS[number])) {
    return compact as 'A' | 'B' | 'C' | 'D' | 'E';
  }

  const normalized = toSlug(value);
  if (normalized === 'certo' || normalized === 'true') return 'A';
  if (normalized === 'errado' || normalized === 'false') return 'B';
  return null;
};

const parseOptions = (row: RawQuestionImportRow, questionType: QuestionType): NormalizedQuestionOption[] => {
  const jsonAlternatives = parseJsonAlternatives(row.alternativas ?? row.alternatives ?? row.options);
  const directCorrectLetter = resolveCorrectLetter(
    pickFirstString(row, ['correct_option', 'gabarito', 'answer', 'correct_answer', 'resposta', 'alternativa_correta']),
  );
  const directCorrectText = toCanonicalText(
    pickFirstString(row, ['correct_answer_text', 'gabarito_texto', 'resposta_texto']) || '',
  );

  const fromJson = jsonAlternatives.map((entry, index) => {
    const fallbackLetter = OPTION_LETTERS[index] || OPTION_LETTERS[0];
    const upperLetter = (entry.letter || '').toUpperCase();
    const letter = OPTION_LETTERS.includes(upperLetter as 'A')
      ? upperLetter as 'A' | 'B' | 'C' | 'D' | 'E'
      : fallbackLetter;
    const text = normalizeWhitespace(entry.text || '');
    return text
      ? {
        letter,
        text,
        correct: Boolean(entry.correct),
      }
      : null;
  }).filter((entry): entry is NormalizedQuestionOption => Boolean(entry));

  const fromColumns = KNOWN_OPTION_KEYS.map(([letter, aliases]) => {
    const text = pickFirstString(row, aliases);
    return text
      ? {
        letter,
        text: normalizeWhitespace(text),
        correct: false,
      }
      : null;
  }).filter((entry): entry is NormalizedQuestionOption => Boolean(entry));

  let options = fromJson.length > 0 ? fromJson : fromColumns;

  if (options.length === 0 && questionType === 'true_false') {
    options = [
      { letter: 'A', text: 'Certo', correct: false },
      { letter: 'B', text: 'Errado', correct: false },
    ];
  }

  if (options.length === 0) return [];

  if (!options.some((option) => option.correct)) {
    if (directCorrectLetter) {
      options = options.map((option) => ({ ...option, correct: option.letter === directCorrectLetter }));
    } else if (directCorrectText) {
      options = options.map((option) => ({ ...option, correct: toCanonicalText(option.text) === directCorrectText }));
    }
  }

  return options;
};

const buildQuestionMetadata = (row: RawQuestionImportRow): Record<string, unknown> => {
  const metadata: Record<string, unknown> = {};

  const tags = pickFirstString(row, ['tags', 'etiquetas']);
  if (tags) metadata.tags = tags.split(',').map((tag) => normalizeWhitespace(tag)).filter(Boolean);

  const externalId = pickFirstString(row, ['external_id', 'codigo_externo', 'question_code']);
  if (externalId) metadata.externalId = externalId;

  const sourceUrl = pickFirstString(row, ['source_url', 'link_origem']);
  if (sourceUrl) metadata.sourceUrl = sourceUrl;

  return metadata;
};

const buildQuestionHashes = (statement: string, options: NormalizedQuestionOption[]) => {
  const normalizedStatement = toCanonicalText(statement);
  const normalizedOptions = options
    .map((option) => `${option.letter}:${option.correct ? '1' : '0'}:${toCanonicalText(option.text)}`)
    .join('|');

  return {
    statementHash: hashText(normalizedStatement),
    optionsHash: hashText(normalizedOptions),
    combinedHash: hashText(`${normalizedStatement}|${normalizedOptions}`),
  };
};

export const parseQuestionImportPayload = (
  format: 'json' | 'csv',
  payload: string | RawQuestionImportRow[],
): RawQuestionImportRow[] => {
  if (Array.isArray(payload)) {
    return payload.map(sanitizeUnknownRecord);
  }

  if (format === 'json') {
    const parsed = JSON.parse(payload) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Payload JSON de importacao precisa ser um array de objetos.');
    }
    return parsed.map(sanitizeUnknownRecord);
  }

  const input = payload.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  const [headerRow, ...valueRows] = rows;
  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  const headers = headerRow.map((header) => toSlug(header));
  return valueRows.map((valueRow) => {
    const row: RawQuestionImportRow = {};
    headers.forEach((header, headerIndex) => {
      row[header] = valueRow[headerIndex] ?? '';
    });
    return row;
  });
};

export const normalizeQuestionImportRow = (raw: RawQuestionImportRow): NormalizedQuestionImportRow => {
  const row = normalizeRecordKeys(raw);
  const statement = pickFirstString(row, ['enunciado', 'statement', 'question', 'prompt', 'pergunta']);

  if (!statement) {
    throw new Error('Linha sem enunciado.');
  }

  const questionType = normalizeQuestionType(pickFirstString(row, ['question_type', 'tipo', 'tipo_questao']), row);
  const options = parseOptions(row, questionType);

  if (questionType === 'multiple_choice' && options.length < 2) {
    throw new Error('Questao de multipla escolha precisa ter pelo menos 2 alternativas.');
  }

  if ((questionType === 'multiple_choice' || questionType === 'true_false') && !options.some((option) => option.correct)) {
    throw new Error('Questao objetiva sem gabarito.');
  }

  return {
    statement: normalizeWhitespace(statement),
    difficulty: normalizeDifficulty(pickFirstString(row, ['difficulty', 'nivel', 'dificuldade'])),
    questionType,
    objective: normalizeObjective(pickFirstString(row, ['objective', 'objetivo', 'track', 'domain'])),
    year: parseYear(pickFirstString(row, ['year', 'ano'])),
    topicId: pickFirstString(row, ['topic_id', 'topico_id']),
    topicName: pickFirstString(row, ['topic', 'topico', 'assunto']),
    subjectName: pickFirstString(row, ['subject', 'disciplina', 'subject_name']),
    area: pickFirstString(row, ['area']),
    subarea: pickFirstString(row, ['subarea', 'sub_area']),
    boardName: pickFirstString(row, ['board', 'banca']),
    examName: pickFirstString(row, ['exam', 'concurso', 'exam_name']),
    organization: pickFirstString(row, ['organization', 'orgao', 'instituicao']),
    jobName: pickFirstString(row, ['job', 'cargo']),
    sourceName: pickFirstString(row, ['source', 'origem', 'source_name']),
    documentType: pickDocumentType(pickFirstString(row, ['document_type', 'tipo_documento'])),
    documentTitle: pickFirstString(row, ['document_title', 'titulo_documento', 'edital']),
    documentUrl: pickFirstString(row, ['document_url', 'url_documento', 'url_edital']),
    explanation: pickFirstString(row, ['explanation', 'explicacao', 'comentario']),
    options,
    metadata: buildQuestionMetadata(row),
    hashes: buildQuestionHashes(statement, options),
    raw,
  };
};

const chunkArray = <T>(value: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
};

class QuestionCatalogImportService {
  private topicIdCache = new Map<string, string>();

  private disciplineIdCache = new Map<string, string>();

  private sourceIdCache = new Map<string, string>();

  private boardIdCache = new Map<string, string>();

  private examIdCache = new Map<string, string>();

  private jobIdCache = new Map<string, string>();

  private documentIdCache = new Map<string, string>();

  isConfigured(): boolean {
    return Boolean(supabase);
  }

  private getClient() {
    if (!supabase) {
      throw new Error('Supabase nao configurado no backend (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).');
    }
    return supabase;
  }

  private async resolveDisciplineIdByName(subjectName: string | null): Promise<string | null> {
    if (!subjectName) return null;

    const cacheKey = toSlug(subjectName);
    if (this.disciplineIdCache.has(cacheKey)) {
      return this.disciplineIdCache.get(cacheKey) || null;
    }

    const client = this.getClient();
    const { data, error } = await client
      .from('disciplinas')
      .select('id, nome')
      .eq('ativo', true)
      .limit(500);

    if (error) {
      throw new Error(`resolveDisciplineIdByName failed: ${error.message}`);
    }

    const match = (data || []).find((entry) => toSlug(entry.nome) === cacheKey);
    if (!match) return null;

    this.disciplineIdCache.set(cacheKey, match.id);
    return match.id;
  }

  private async resolveTopicId(normalized: NormalizedQuestionImportRow): Promise<string | null> {
    if (normalized.topicId) return normalized.topicId;
    if (!normalized.topicName) return null;

    const disciplineId = await this.resolveDisciplineIdByName(normalized.subjectName);
    const cacheKey = `${disciplineId || 'all'}:${toSlug(normalized.topicName)}`;
    if (this.topicIdCache.has(cacheKey)) {
      return this.topicIdCache.get(cacheKey) || null;
    }

    const client = this.getClient();
    let query = client
      .from('topicos')
      .select('id, nome, disciplina_id')
      .eq('ativo', true)
      .limit(disciplineId ? 500 : 5000);

    if (disciplineId) {
      query = query.eq('disciplina_id', disciplineId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`resolveTopicId failed: ${error.message}`);
    }

    const matches = (data || []).filter((entry) => toSlug(entry.nome) === toSlug(normalized.topicName || ''));
    if (matches.length !== 1) return null;

    this.topicIdCache.set(cacheKey, matches[0].id);
    return matches[0].id;
  }

  private async resolveSourceId(explicitSourceId?: string, sourceName?: string | null): Promise<string> {
    if (explicitSourceId) return explicitSourceId;

    const fallbackSourceName = sourceName || 'Curadoria interna Zero Base';
    const cacheKey = toSlug(fallbackSourceName);
    if (this.sourceIdCache.has(cacheKey)) {
      return this.sourceIdCache.get(cacheKey)!;
    }

    const client = this.getClient();
    const payload = {
      name: normalizeWhitespace(fallbackSourceName),
      slug: cacheKey,
      type: cacheKey.includes('enem') || cacheKey.includes('inep')
        ? 'official'
        : cacheKey.includes('dataset')
          ? 'public_dataset'
          : cacheKey.includes('curadoria')
            ? 'curated'
            : 'internal',
    };

    const { data, error } = await client
      .from('question_sources')
      .upsert(payload, { onConflict: 'slug' })
      .select('id')
      .single();

    if (error) {
      throw new Error(`resolveSourceId failed: ${error.message}`);
    }

    this.sourceIdCache.set(cacheKey, data.id);
    return data.id;
  }

  private async resolveBoardId(boardName: string | null): Promise<string | null> {
    if (!boardName) return null;

    const cacheKey = toSlug(boardName);
    if (this.boardIdCache.has(cacheKey)) {
      return this.boardIdCache.get(cacheKey) || null;
    }

    const client = this.getClient();
    const { data, error } = await client
      .from('exam_boards')
      .upsert(
        {
          name: normalizeWhitespace(boardName),
          slug: cacheKey,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`resolveBoardId failed: ${error.message}`);
    }

    this.boardIdCache.set(cacheKey, data.id);
    return data.id;
  }

  private async resolveExamId(normalized: NormalizedQuestionImportRow, boardId: string | null): Promise<string | null> {
    if (!normalized.examName) return null;

    const identityKey = `${toSlug(normalized.examName)}|${toSlug(normalized.organization || '')}|${normalized.year || 0}`;
    if (this.examIdCache.has(identityKey)) {
      return this.examIdCache.get(identityKey) || null;
    }

    const client = this.getClient();
    const { data, error } = await client
      .from('exams')
      .upsert(
        {
          name: normalizeWhitespace(normalized.examName),
          slug: toSlug(normalized.examName),
          identity_key: identityKey,
          organization: normalized.organization,
          board_id: boardId,
          year: normalized.year,
          exam_type: normalized.objective === 'enem' ? 'enem' : 'concurso-publico',
        },
        { onConflict: 'identity_key' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`resolveExamId failed: ${error.message}`);
    }

    this.examIdCache.set(identityKey, data.id);
    return data.id;
  }

  private async resolveJobId(normalized: NormalizedQuestionImportRow, examId: string | null): Promise<string | null> {
    if (!normalized.jobName || !examId) return null;

    const cacheKey = `${examId}:${toSlug(normalized.jobName)}`;
    if (this.jobIdCache.has(cacheKey)) {
      return this.jobIdCache.get(cacheKey) || null;
    }

    const client = this.getClient();
    const { data, error } = await client
      .from('jobs')
      .upsert(
        {
          exam_id: examId,
          name: normalizeWhitespace(normalized.jobName),
          slug: toSlug(normalized.jobName),
          career_area: normalized.area,
        },
        { onConflict: 'exam_id,slug' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`resolveJobId failed: ${error.message}`);
    }

    this.jobIdCache.set(cacheKey, data.id);
    return data.id;
  }

  private async resolveDocumentId(
    normalized: NormalizedQuestionImportRow,
    sourceId: string,
    examId: string | null,
    jobId: string | null,
  ): Promise<string | null> {
    if (!normalized.documentTitle && !normalized.documentUrl) return null;

    const documentType = normalized.documentType || 'outro';
    const identityKey = `${documentType}|${toSlug(normalized.documentTitle || normalized.documentUrl || 'documento')}|${normalized.year || 0}`;
    if (this.documentIdCache.has(identityKey)) {
      return this.documentIdCache.get(identityKey) || null;
    }

    const client = this.getClient();
    const { data, error } = await client
      .from('official_documents')
      .upsert(
        {
          source_id: sourceId,
          exam_id: examId,
          job_id: jobId,
          document_type: documentType,
          title: normalizeWhitespace(normalized.documentTitle || normalized.documentUrl || 'Documento'),
          slug: toSlug(normalized.documentTitle || normalized.documentUrl || 'documento'),
          identity_key: identityKey,
          organization: normalized.organization,
          year: normalized.year,
          url: normalized.documentUrl,
        },
        { onConflict: 'identity_key' },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`resolveDocumentId failed: ${error.message}`);
    }

    this.documentIdCache.set(identityKey, data.id);
    return data.id;
  }

  private async createBatch(input: QuestionImportInput, sourceId: string | null, totalRows: number): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client
      .from('question_import_batches')
      .insert({
        source_id: sourceId,
        batch_name: normalizeWhitespace(input.batchName),
        status: 'processing',
        total_rows: totalRows,
        metadata: {
          format: input.format,
        },
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`createBatch failed: ${error.message}`);
    }

    return data.id;
  }

  private async seedBatchRows(batchId: string, rows: RawQuestionImportRow[]): Promise<void> {
    const client = this.getClient();
    const payload = rows.map((row, index) => ({
      batch_id: batchId,
      row_number: index + 1,
      raw_payload: row,
    }));

    for (const chunk of chunkArray(payload, 100)) {
      const { error } = await client.from('question_import_rows').insert(chunk);
      if (error) {
        throw new Error(`seedBatchRows failed: ${error.message}`);
      }
    }
  }

  private async updateBatchProgress(
    batchId: string,
    progress: { status: string; processedRows: number; successRows: number; duplicateRows: number; errorRows: number },
  ): Promise<void> {
    const client = this.getClient();
    const { error } = await client
      .from('question_import_batches')
      .update({
        status: progress.status,
        processed_rows: progress.processedRows,
        success_rows: progress.successRows,
        duplicate_rows: progress.duplicateRows,
        error_rows: progress.errorRows,
      })
      .eq('id', batchId);

    if (error) {
      throw new Error(`updateBatchProgress failed: ${error.message}`);
    }
  }

  private async updateBatchRow(
    batchId: string,
    rowNumber: number,
    payload: {
      normalizedStatus: 'normalized' | 'imported' | 'duplicate' | 'error' | 'skipped';
      normalizedPayload?: Record<string, unknown>;
      errorMessage?: string;
      questionId?: string;
      statementHash?: string;
    },
  ): Promise<void> {
    const client = this.getClient();
    const { error } = await client
      .from('question_import_rows')
      .update({
        normalized_status: payload.normalizedStatus,
        normalized_payload: payload.normalizedPayload || {},
        error_message: payload.errorMessage || null,
        question_id: payload.questionId || null,
        statement_hash: payload.statementHash || null,
      })
      .eq('batch_id', batchId)
      .eq('row_number', rowNumber);

    if (error) {
      throw new Error(`updateBatchRow failed: ${error.message}`);
    }
  }

  private async findDuplicateQuestion(hash: string): Promise<string | null> {
    const client = this.getClient();
    const { data, error } = await client
      .from('questoes')
      .select('id')
      .eq('hash_questao', hash)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`findDuplicateQuestion failed: ${error.message}`);
    }

    return data?.id || null;
  }

  private async insertQuestion(
    normalized: NormalizedQuestionImportRow,
    resolved: {
      sourceId: string;
      topicId: string;
      boardId: string | null;
      examId: string | null;
      jobId: string | null;
      documentId: string | null;
    },
  ): Promise<string> {
    const client = this.getClient();

    const { data, error } = await client
      .from('questoes')
      .insert({
        topico_id: resolved.topicId,
        enunciado: normalized.statement,
        nivel: normalized.difficulty,
        fonte: normalized.sourceName,
        ano: normalized.year,
        explicacao: normalized.explanation,
        assunto: normalized.topicName || normalized.area,
        source_id: resolved.sourceId,
        banca_id: resolved.boardId,
        concurso_id: resolved.examId,
        cargo_id: resolved.jobId,
        documento_oficial_id: resolved.documentId,
        question_type: normalized.questionType,
        objetivo: normalized.objective,
        is_official: Boolean(resolved.documentId) || normalized.objective === 'enem',
        is_original_commentary: Boolean(normalized.explanation),
        can_be_used_in_leveling: normalized.difficulty !== 'dificil',
        can_be_used_in_mock_exam: true,
        metadata: normalized.metadata,
        hash_enunciado: normalized.hashes.statementHash,
        hash_alternativas: normalized.hashes.optionsHash,
        hash_questao: normalized.hashes.combinedHash,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`insertQuestion failed: ${error.message}`);
    }

    if (normalized.options.length > 0) {
      const { error: alternativesError } = await client
        .from('alternativas')
        .insert(
          normalized.options.map((option) => ({
            questao_id: data.id,
            letra: option.letter,
            texto: option.text,
            correta: option.correct,
          })),
        );

      if (alternativesError) {
        throw new Error(`insertQuestion alternatives failed: ${alternativesError.message}`);
      }
    }

    if (normalized.explanation) {
      const { error: explanationError } = await client
        .from('question_explanations')
        .insert({
          question_id: data.id,
          explanation_type: 'full',
          content: normalized.explanation,
          author_type: 'internal',
        });

      if (explanationError) {
        throw new Error(`insertQuestion explanation failed: ${explanationError.message}`);
      }
    }

    return data.id;
  }

  async importQuestions(input: QuestionImportInput): Promise<QuestionImportResult> {
    const rows = parseQuestionImportPayload(input.format, input.payload);
    const preview: QuestionImportResult['preview'] = [];

    let batchId: string | null = null;
    let processedRows = 0;
    let importedRows = 0;
    let duplicateRows = 0;
    let errorRows = 0;

    if (!input.dryRun) {
      const resolvedSourceId = await this.resolveSourceId(input.sourceId, input.sourceName || null);
      batchId = await this.createBatch(input, resolvedSourceId, rows.length);
      await this.seedBatchRows(batchId, rows);
    }

    for (const [index, rawRow] of rows.entries()) {
      const rowNumber = index + 1;

      try {
        const normalized = normalizeQuestionImportRow(rawRow);

        if (preview.length < 5) {
          preview.push({
            statement: normalized.statement,
            subjectName: normalized.subjectName,
            topicName: normalized.topicName,
            questionType: normalized.questionType,
            objective: normalized.objective,
          });
        }

        const topicId = await this.resolveTopicId(normalized);
        if (!topicId) {
          throw new Error('Topico nao resolvido. Informe topic_id ou um topico/disciplina valido no catalogo.');
        }

        const resolvedSourceId = await this.resolveSourceId(input.sourceId, normalized.sourceName || input.sourceName || null);
        const boardId = await this.resolveBoardId(normalized.boardName);
        const examId = await this.resolveExamId(normalized, boardId);
        const jobId = await this.resolveJobId(normalized, examId);
        const documentId = await this.resolveDocumentId(normalized, resolvedSourceId, examId, jobId);

        const duplicateQuestionId = await this.findDuplicateQuestion(normalized.hashes.combinedHash);
        if (duplicateQuestionId) {
          duplicateRows += 1;
          processedRows += 1;

          if (batchId) {
            await this.updateBatchRow(batchId, rowNumber, {
              normalizedStatus: 'duplicate',
              normalizedPayload: {
                statement: normalized.statement,
                topicId,
                boardId,
                examId,
                jobId,
              },
              questionId: duplicateQuestionId,
              statementHash: normalized.hashes.statementHash,
            });
          }

          continue;
        }

        if (!input.dryRun) {
          const insertedQuestionId = await this.insertQuestion(normalized, {
            sourceId: resolvedSourceId,
            topicId,
            boardId,
            examId,
            jobId,
            documentId,
          });

          importedRows += 1;

          if (batchId) {
            await this.updateBatchRow(batchId, rowNumber, {
              normalizedStatus: 'imported',
              normalizedPayload: {
                statement: normalized.statement,
                topicId,
                boardId,
                examId,
                jobId,
              },
              questionId: insertedQuestionId,
              statementHash: normalized.hashes.statementHash,
            });
          }
        }

        processedRows += 1;
      } catch (error) {
        errorRows += 1;
        processedRows += 1;

        if (batchId) {
          await this.updateBatchRow(batchId, rowNumber, {
            normalizedStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido na importacao.',
          });
        }
      }
    }

    if (batchId) {
      const status = errorRows > 0 ? 'completed_with_errors' : 'completed';
      await this.updateBatchProgress(batchId, {
        status,
        processedRows,
        successRows: importedRows,
        duplicateRows,
        errorRows,
      });
    }

    logger.info('question-catalog-import-finished', {
      feature: 'question-catalog',
      batchId: batchId || 'dry-run',
      totalRows: rows.length,
      processedRows,
      importedRows,
      duplicateRows,
      errorRows,
      dryRun: Boolean(input.dryRun),
    });

    return {
      batchId,
      totalRows: rows.length,
      processedRows,
      importedRows,
      duplicateRows,
      errorRows,
      preview,
    };
  }
}

export const questionCatalogImportService = new QuestionCatalogImportService();
