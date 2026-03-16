import { useEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

function readLocalStorageValue<T>(key: string, initialValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    logger.error(`Erro ao carregar ${key}`, 'LocalStorage', error);
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const shouldSkipNextSaveRef = useRef(false);
  const [storedValue, setStoredValue] = useState<T>(() => readLocalStorageValue(key, initialValue));

  // Usar JSON.stringify para evitar loops infinitos quando initialValue for objeto
  const initialValueString = JSON.stringify(initialValue);

  useEffect(() => {
    shouldSkipNextSaveRef.current = true;
    setStoredValue(readLocalStorageValue(key, initialValue));
  }, [key, initialValueString]); // Depende da string, não da referência do objeto

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
