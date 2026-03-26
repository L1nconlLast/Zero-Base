const E2E_LOGIN_EMAIL = Cypress.env('E2E_LOGIN_EMAIL') as string;
const E2E_LOGIN_PASSWORD = Cypress.env('E2E_LOGIN_PASSWORD') as string;
const SUPABASE_URL = Cypress.env('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE_KEY = Cypress.env('SUPABASE_SERVICE_ROLE_KEY') as string;

const groupName = `Grupo QA ${Date.now()}`;

const createApiHeaders = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
});

const querySingle = <T>(pathWithQuery: string) =>
  cy.request<T[]>({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/${pathWithQuery}`,
    headers: createApiHeaders(),
  }).its('body').then((rows) => {
    expect(rows.length).to.be.greaterThan(0);
    return rows[0];
  });

const assertAttachmentPersisted = (fileName: string, expectedMimeType: string) => {
  const params = new URLSearchParams({
    select: 'file_name,mime_type,url',
    file_name: `eq.${fileName}`,
  });

  return querySingle<{ file_name: string; mime_type: string; url: string }>(`group_message_attachments?${params.toString()}`)
    .then((row) => {
      expect(row.file_name).to.eq(fileName);
      expect(row.mime_type).to.eq(expectedMimeType);
      cy.request(row.url).its('status').should('eq', 200);
    });
};

describe('Grupos - validacao operacional', () => {
  before(() => {
    expect(E2E_LOGIN_EMAIL, 'E2E_LOGIN_EMAIL').to.be.a('string').and.not.be.empty;
    expect(E2E_LOGIN_PASSWORD, 'E2E_LOGIN_PASSWORD').to.be.a('string').and.not.be.empty;
    expect(SUPABASE_URL, 'SUPABASE_URL').to.be.a('string').and.not.be.empty;
    expect(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY').to.be.a('string').and.not.be.empty;
  });

  it('valida CTA, uploads, feed e ranking do grupo', () => {
    cy.login(E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD);
    cy.closeOptionalOverlays();

    cy.contains('button', /^Grupos$/i, { timeout: 20000 }).click({ force: true });
    cy.contains('Grupos de Estudo', { timeout: 20000 }).should('be.visible');

    cy.get('input[placeholder="Nome do grupo"]').clear().type(groupName);
    cy.get('input[placeholder*="Descrição"]').clear().type('Grupo de validação operacional.');
    cy.contains('button', /^Criar grupo$/i).click();

    cy.contains(groupName, { timeout: 20000 }).should('be.visible');
    cy.contains('Ao vivo', { timeout: 10000 }).should('be.visible');
    cy.contains('Entrar em sessão agora').should('be.visible').click();

    cy.get('[data-testid="study-focus-container"], [data-testid="study-focus-timer-ready"]', { timeout: 20000 }).should('exist');

    cy.contains('button', /^Grupos$/i, { timeout: 20000 }).click({ force: true });
    cy.contains('Grupos de Estudo', { timeout: 20000 }).should('be.visible');
    cy.contains(groupName, { timeout: 10000 }).should('be.visible');

    cy.contains('button', /^Chat$/i).click();

    const imageFileName = `qa-image-${Date.now()}.png`;
    const pdfFileName = `qa-pdf-${Date.now()}.pdf`;
    const docxFileName = `qa-docx-${Date.now()}.docx`;
    const txtFileName = `qa-text-${Date.now()}.txt`;

    const imageContent = Cypress.Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yF9kAAAAASUVORK5CYII=',
      'base64',
    );
    const pdfContent = Cypress.Buffer.from('%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8');
    const docxContent = Cypress.Buffer.from('Fake docx payload for upload validation', 'utf8');
    const txtContent = Cypress.Buffer.from('Arquivo de texto para validação operacional.', 'utf8');

    const uploadFile = (options: {
      fileName: string;
      mimeType: string;
      contents: Cypress.Buffer;
      message?: string;
    }) => {
      cy.get('input[type="file"]').selectFile({
        contents: options.contents,
        fileName: options.fileName,
        mimeType: options.mimeType,
        lastModified: Date.now(),
      }, { force: true });

      if (options.message) {
        cy.get('input[placeholder*="Escreva uma mensagem"]').clear().type(options.message);
      }

      cy.contains('button', /^Enviar$/i, { timeout: 10000 }).click();
      cy.contains(options.fileName, { timeout: 20000 }).should('be.visible');
      cy.get('input[placeholder*="Escreva uma mensagem"]').should('be.visible');
      assertAttachmentPersisted(options.fileName, options.mimeType);
    };

    uploadFile({
      fileName: imageFileName,
      mimeType: 'image/png',
      contents: imageContent,
    });
    cy.get(`img[alt="${imageFileName}"]`, { timeout: 20000 }).should('be.visible');

    uploadFile({
      fileName: pdfFileName,
      mimeType: 'application/pdf',
      contents: pdfContent,
      message: 'PDF de validação',
    });

    uploadFile({
      fileName: docxFileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      contents: docxContent,
      message: 'DOCX de validação',
    });

    uploadFile({
      fileName: txtFileName,
      mimeType: 'text/plain',
      contents: txtContent,
      message: 'TXT de validação',
    });

    const groupParams = new URLSearchParams({
      select: 'id',
      name: `eq.${groupName}`,
    });
    const userParams = new URLSearchParams({
      select: 'id',
      email: `eq.${E2E_LOGIN_EMAIL}`,
    });

    cy.wrap(null)
      .then(() => querySingle<{ id: string }>(`groups?${groupParams.toString()}`))
      .then((groupRow) => {
        cy.wrap(groupRow.id).as('groupId');
      });

    cy.wrap(null)
      .then(() => querySingle<{ id: string }>(`users?${userParams.toString()}`))
      .then((userRow) => {
        cy.wrap(userRow.id).as('userId');
      });

    cy.get<string>('@groupId').then((groupId) => {
      cy.get<string>('@userId').then((userId) => {
        cy.contains('button', /^Ao vivo$/i).click();

        cy.request({
          method: 'POST',
          url: `${SUPABASE_URL}/rest/v1/group_activities`,
          headers: {
            ...createApiHeaders(),
            Prefer: 'return=representation',
            'Content-Type': 'application/json',
          },
          body: [{
            group_id: groupId,
            user_id: userId,
            type: 'study_started',
            metadata: { source: 'cypress_realtime_probe' },
          }],
        }).its('status').should('be.oneOf', [200, 201]);

        cy.contains(/entrou em sessão/i, { timeout: 20000 }).should('be.visible');
      });
    });

    cy.contains('button', /^Desafios$/i).click();
    cy.contains('button', /Criar meta semanal automática/i, { timeout: 20000 }).click();
    cy.contains('button', /Usar progresso automático da semana/i, { timeout: 20000 }).click();
    cy.contains(/Progresso semanal sincronizado|Progresso atualizado/i, { timeout: 20000 }).should('be.visible');

    cy.contains('button', /^Ao vivo$/i).click();
    cy.contains(/atualizou .* min/i, { timeout: 20000 }).should('be.visible');

    cy.contains('button', /^Ranking$/i).click();
    cy.contains(/atividades/i, { timeout: 20000 }).should('be.visible');
  });
});
