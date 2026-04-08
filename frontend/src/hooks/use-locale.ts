'use client';

import { useState, useCallback, useMemo } from 'react';
import { Locale, getTranslator } from '@/lib/i18n';

/**
 * Lightweight locale hook. Stores the current locale in React state
 * and provides a memoized translator function.
 *
 * Usage:
 *   const { locale, toggleLocale, t } = useLocale();
 */
export function useLocale() {
  const [locale, setLocale] = useState<Locale>('en');

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'en' ? 'pt' : 'en'));
  }, []);

  const t = useMemo(() => getTranslator(locale), [locale]);

  return { locale, toggleLocale, t } as const;
}
