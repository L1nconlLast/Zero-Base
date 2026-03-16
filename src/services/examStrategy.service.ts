import {
  buildMentorStrategyMessage,
  detectConcursoDiscipline,
  detectEnemArea,
  detectEnemSubject,
  detectOrganizer,
  getConcursoDisciplineSummary,
  getEnemAreaSummary,
  getEnemSubjectSummary,
  getOrganizerSummary,
} from './mentorStrategy.shared';

class ExamStrategyService {
  detectOrganizer = detectOrganizer;

  detectEnemArea = detectEnemArea;

  detectEnemSubject = detectEnemSubject;

  detectConcursoDiscipline = detectConcursoDiscipline;

  getEnemSubjectSummary = getEnemSubjectSummary;

  getEnemAreaSummary = getEnemAreaSummary;

  getOrganizerSummary = getOrganizerSummary;

  getConcursoDisciplineSummary = getConcursoDisciplineSummary;

  buildMessageForMentor(input: string): string | null {
    return buildMentorStrategyMessage(input);
  }
}

export const examStrategyService = new ExamStrategyService();
