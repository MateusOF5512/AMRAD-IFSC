'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { mapLanguageToLocale } from '@/lib/i18n';
import '@/lib/i18n'; // ensure i18next is initialized
import { useTranslation } from 'react-i18next';

/**
 * LanguageProvider syncs the i18next language with the authenticated user's
 * language preference stored in their profile. It must be rendered inside
 * AuthProvider so the user object is already hydrated.
 * 
 * It also preloads the language from localStorage on mount to avoid showing
 * the default language before the user's preferred language loads.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);

  // Preload language from localStorage on mount
  useEffect(() => {
    // Try to load language from localStorage immediately (before AuthProvider hydrates)
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const locale = mapLanguageToLocale(userData.language);
        if (i18n.language !== locale) {
          i18n.changeLanguage(locale);
        }
      }
    } catch (err) {
      // localStorage not available or invalid data, fallback to default
      console.debug('Could not preload language from localStorage:', err);
    }
  }, []); // Run once on mount

  // Sync language when AuthStore user changes (for real-time updates)
  useEffect(() => {
    const locale = mapLanguageToLocale(user?.language);
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [user?.language, i18n]);

  return <>{children}</>;
}
