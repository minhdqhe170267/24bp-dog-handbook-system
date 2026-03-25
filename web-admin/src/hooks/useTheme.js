import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'web-admin-theme';
const VALID_THEMES = ['light', 'dark'];

const resolveInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (VALID_THEMES.includes(savedTheme)) return savedTheme;

  return 'light';
};

const resolveTransitionOrigin = (input) => {
  if (!input) return null;
  const source = input?.nativeEvent || input;

  if (typeof source?.x === 'number' && typeof source?.y === 'number') {
    return { x: source.x, y: source.y };
  }

  if (typeof source?.clientX === 'number' && typeof source?.clientY === 'number') {
    return { x: source.clientX, y: source.clientY };
  }

  const target = source?.currentTarget || source?.target;
  if (target && typeof target.getBoundingClientRect === 'function') {
    const rect = target.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  return null;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const runThemeTransition = useCallback((nextTheme, originInput) => {
    if (!VALID_THEMES.includes(nextTheme)) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      setThemeState(nextTheme);
      return;
    }

    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = document.startViewTransition?.bind(document);

    if (!startViewTransition || prefersReducedMotion) {
      setThemeState(nextTheme);
      return;
    }

    const origin = resolveTransitionOrigin(originInput);
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    root.setAttribute('data-theme-transition', 'circular');

    const transition = startViewTransition(() => {
      setThemeState(nextTheme);
    });

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 560,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      .catch(() => {
        // no-op: fallback already applied by state update
      });

    transition.finished.finally(() => {
      root.removeAttribute('data-theme-transition');
    });
  }, []);

  const setTheme = useCallback(
    (nextTheme, options = {}) => {
      if (!VALID_THEMES.includes(nextTheme)) return;
      if (nextTheme === theme) return;

      const shouldAnimate = options?.animate !== false;
      if (!shouldAnimate) {
        setThemeState(nextTheme);
        return;
      }

      runThemeTransition(nextTheme, options?.origin ?? options?.event ?? options);
    },
    [runThemeTransition, theme]
  );

  const toggleTheme = useCallback(
    (originInput) => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      runThemeTransition(nextTheme, originInput);
    },
    [runThemeTransition, theme]
  );

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
