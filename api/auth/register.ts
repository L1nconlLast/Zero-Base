import { publicSupabase, adminSupabase, sendError, sendJson, serializeSession } from '../_lib/supabase';
import { ensureCoreUserRecords } from '../_lib/mvp';

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Metodo nao permitido.');
    return;
  }

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (name.length < 3 || !email || password.length < 8) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Payload invalido para cadastro.');
    return;
  }

  if (!publicSupabase) {
    sendError(res, 503, 'SUPABASE_NOT_CONFIGURED', 'Supabase nao configurado no servidor.');
    return;
  }

  try {
    let session = null;
    let authUser = null;

    if (adminSupabase) {
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          language: 'pt',
        },
      });

      if (error) {
        const normalized = error.message.toLowerCase();
        if (normalized.includes('already') || normalized.includes('duplicate')) {
          sendError(res, 409, 'EMAIL_ALREADY_REGISTERED', 'Este email ja esta cadastrado.');
          return;
        }

        throw error;
      }

      authUser = data.user;

      const loginResult = await publicSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginResult.error || !loginResult.data.session || !loginResult.data.user) {
        throw loginResult.error || new Error('Nao foi possivel iniciar sessao apos o cadastro.');
      }

      session = loginResult.data.session;
      authUser = loginResult.data.user;
    } else {
      const signUpResult = await publicSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            language: 'pt',
          },
        },
      });

      if (signUpResult.error) {
        const normalized = signUpResult.error.message.toLowerCase();
        if (normalized.includes('already') || normalized.includes('registered')) {
          sendError(res, 409, 'EMAIL_ALREADY_REGISTERED', 'Este email ja esta cadastrado.');
          return;
        }

        throw signUpResult.error;
      }

      authUser = signUpResult.data.user;
      session = signUpResult.data.session;

      if (!session) {
        const loginResult = await publicSupabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginResult.error || !loginResult.data.session || !loginResult.data.user) {
          throw loginResult.error || new Error('Cadastro criado, mas a sessao automatica falhou.');
        }

        session = loginResult.data.session;
        authUser = loginResult.data.user;
      }
    }

    if (!authUser) {
      throw new Error('Nao foi possivel resolver o usuario autenticado.');
    }

    await ensureCoreUserRecords(authUser);

    sendJson(res, 200, {
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        name,
      },
      session: serializeSession(session),
    });
  } catch (error: any) {
    sendError(res, 500, 'INTERNAL_ERROR', error?.message || 'Erro ao cadastrar usuario.');
  }
}
