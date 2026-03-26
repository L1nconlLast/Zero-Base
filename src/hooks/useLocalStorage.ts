import { useCallback, useEffect, useRef, useState } from 'react';
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

function getValueSignature<T>(value: T): string {
  try {
    return JSON.stringify(value) ?? 'undefined';
  } catch {
    return String(value);
  }
}

export function useLocalStorage<T>(key: string, initialValue: T, options?: UseLocalStorageOptions) {
  const legacyKeys = options?.legacyKeys;
  const legacyKeysSignature = (legacyKeys || []).join('||');
  const initialValueSignature = getValueSignature(initialValue);
  const [storedValue, setStoredValue] = useState<T>(() => readLocalStorageValue(key, initialValue, legacyKeys));
  const storedValueRef = useRef(storedValue);

  useEffect(() => {
    const nextValue = readLocalStorageValue(key, initialValue, legacyKeys);
    storedValueRef.current = nextValue;
    setStoredValue(nextValue);
  }, [initialValueSignature, key, legacyKeysSignature]);

  useEffect(() => {
    storedValueRef.current = storedValue;
  }, [storedValue]);

  const persistValue = useCallback(
    (value: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        logger.error(`Erro ao salvar ${key}`, 'LocalStorage', error);
      }
    },
    [key],
  );

  const setValue = useCallback(
    (value: T | ((current: T) => T)) => {
      const currentValue = storedValueRef.current;
      const nextValue = value instanceof Function ? value(currentValue) : value;
      storedValueRef.current = nextValue;
      persistValue(nextValue);
      setStoredValue(nextValue);
    },
    [persistValue],
  );

  return [storedValue, setValue] as const;
}
