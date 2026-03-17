import { useEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

function readLocalStorageValue<T>(key: string, initialValue: T, legacyKeys?: string[]): T {
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }

    for (const legacyKey of legacyKeys || []) {
      const legacyItem = window.localStorage.getItem(legacyKey);
      if (!legacyItem) continue;

      const parsedLegacy = JSON.parse(legacyItem);
      window.localStorage.setItem(key, JSON.stringify(parsedLegacy));
      return parsedLegacy;
    }

    return initialValue;
  } catch (error) {
    logger.error(`Erro ao carregar ${key}`, 'LocalStorage', error);
    return initialValue;
  }
}

interface UseLocalStorageOptions {
  legacyKeys?: string[];
}

export function useLocalStorage<T>(key: string, initialValue: T, options?: UseLocalStorageOptions) {
  const shouldSkipNextSaveRef = useRef(false);
  const legacyKeys = options?.legacyKeys;
  const [storedValue, setStoredValue] = useState<T>(() => readLocalStorageValue(key, initialValue, legacyKeys));

  useEffect(() => {
    shouldSkipNextSaveRef.current = true;
    setStoredValue(readLocalStorageValue(key, initialValue, legacyKeys));
  }, [initialValue, key, legacyKeys]);

  // Salvar no localStorage quando o valor mudar
  useEffect(() => {
    if (shouldSkipNextSaveRef.current) {
      shouldSkipNextSaveRef.current = false;
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      logger.error(`Erro ao salvar ${key}`, 'LocalStorage', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
