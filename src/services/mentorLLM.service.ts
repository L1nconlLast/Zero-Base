import type { MentorBriefingRequest, MentorOutput } from '../types/mentor';

class MentorLLMService {
  private readonly enabled = String(import.meta.env.VITE_MENTOR_LLM_ENABLED || 'false').toLowerCase() === 'true';

  async generateBriefing(_request?: MentorBriefingRequest): Promise<MentorOutput | null> {
    if (!this.enabled) {
      return null;
    }

    return null;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const mentorLLMService = new MentorLLMService();
