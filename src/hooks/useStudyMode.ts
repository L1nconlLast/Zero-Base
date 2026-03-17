import { useLocalStorage } from './useLocalStorage';

export type StudyMode = 'exploration' | 'focus';

const STORAGE_KEY = 'zeroBaseStudyMode';

export function useStudyMode() {
  const [studyMode, setStudyMode] = useLocalStorage<StudyMode>(STORAGE_KEY, 'exploration');

  const toggleStudyMode = () => {
    setStudyMode((prev: StudyMode) => (prev === 'exploration' ? 'focus' : 'exploration'));
  };

  return { studyMode, setStudyMode, toggleStudyMode };
}
