'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useState, useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'qms-theme';
let currentTheme: ThemePreference = 'system';
const themeListeners = new Set<() => void>();
const subscribeToTheme = (listener: () => void) => { themeListeners.add(listener); return () => themeListeners.delete(listener); };
const getThemeSnapshot = () => {
  if (typeof document !== 'undefined') {
    const domPreference = document.documentElement.dataset.theme;
    if (isThemePreference(domPreference)) return domPreference;
  }
  return currentTheme;
};
const getServerThemeSnapshot = (): ThemePreference => 'system';

function publishTheme(theme: ThemePreference) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  themeListeners.forEach(listener => listener());
}

const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☼' },
  { value: 'dark', label: 'Dark', icon: '◐' },
  { value: 'system', label: 'System', icon: '◑' },
];

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.colorScheme = isDark ? 'dark' : 'light';

  const themeColor = document.querySelector<HTMLMetaElement>('#qms-theme-color');
  if (themeColor) themeColor.content = isDark ? '#0B1220' : '#F5F7FA';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Storage can be disabled; the system preference remains a useful default.
    }
    const preference = isThemePreference(stored) ? stored : 'system';
    applyTheme(preference);
    publishTheme(preference);

    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemPreference = () => {
      if (document.documentElement.dataset.theme === 'system') applyTheme('system');
    };
    systemPreference.addEventListener('change', syncSystemPreference);
    return () => systemPreference.removeEventListener('change', syncSystemPreference);
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Keep the current tab usable when storage is unavailable.
    }
    applyTheme(next);
    publishTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeMenu({ mobile = false }: { mobile?: boolean }) {
  const { theme, setTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const selectedLabel = themeOptions.find(option => option.value === theme)?.label;

  return (
    <div className={`theme-control${mobile ? ' mobile-theme-control' : ''}`}>
      <button
        type="button"
        className="theme-trigger"
        aria-label={`Tampilan: ${selectedLabel}. Ubah tema`}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className="theme-trigger-icon" aria-hidden="true">◐</span>
        <span className="theme-trigger-copy"><b>Tampilan</b><small>{selectedLabel}</small></span>
        <span className="theme-trigger-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="theme-popover" role="radiogroup" aria-label="Pilih tema">
          <span className="theme-popover-title">Tampilan</span>
          {themeOptions.map(option => (
            <button
              key={option.value}
              type="button"
              className={`theme-option${theme === option.value ? ' selected' : ''}`}
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => { setTheme(option.value); setOpen(false); }}
            >
              <span className="theme-option-icon" aria-hidden="true">{option.icon}</span>
              <span>{option.label}</span>
              {theme === option.value && <span className="theme-option-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
