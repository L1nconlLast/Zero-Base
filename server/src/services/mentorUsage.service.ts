import { createClient } from '@supabase/supabase-js';

interface TokenUsagePayload {
  userId: string;
  model: string;
  provider: 'openai';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: string;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

class MentorUsageService {
  trackUsageFireAndForget(payload: TokenUsagePayload): void {
    if (!supabase) {
      return;
    }

    void (async () => {
      try {
        const { error } = await supabase
          .from('mentor_token_usage')
          .insert({
            user_id: payload.userId,
            model: payload.model,
            provider: payload.provider,
            prompt_tokens: payload.promptTokens,
            completion_tokens: payload.completionTokens,
            total_tokens: payload.totalTokens,
            created_at: payload.createdAt,
          });

        if (error) {
          console.warn('[mentor-usage] failed to save usage:', error.message);
        }
      } catch (error: unknown) {
        console.warn('[mentor-usage] unexpected tracking error:', error);
      }
    })();
  }
}

export const mentorUsageService = new MentorUsageService();
