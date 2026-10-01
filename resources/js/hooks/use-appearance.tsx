import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyTheme = (appearance: Appearance) => {
    if (typeof document === 'undefined') return;
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());
    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const handleSystemThemeChange = () => {
    if (typeof localStorage === 'undefined') return;
    const currentAppearance = (localStorage.getItem('appearance') as Appearance) || 'system';
    applyTheme(currentAppearance);
};

export function initializeTheme() {
    if (typeof window === 'undefined') return;
    const savedAppearance = (localStorage.getItem('appearance') as Appearance) || 'system';
    applyTheme(savedAppearance);

    mediaQuery?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('appearance', mode);
        }
        applyTheme(mode);
        const resolvedIsDark = mode === 'dark' || (mode === 'system' && prefersDark());
        setIsDark(resolvedIsDark);
    };

    const toggleTheme = () => {
        if (isDark) {
            updateAppearance('light');
        } else {
            updateAppearance('dark');
        }
    };

    useEffect(() => {
        const savedAppearance = (localStorage.getItem('appearance') as Appearance | null) || 'system';
        setAppearance(savedAppearance);
        const resolvedIsDark = savedAppearance === 'dark' || (savedAppearance === 'system' && prefersDark());
        setIsDark(resolvedIsDark);
        applyTheme(savedAppearance);

        const onChange = () => {
            const current = (localStorage.getItem('appearance') as Appearance) || 'system';
            if (current === 'system') {
                const dark = prefersDark();
                setIsDark(dark);
                document.documentElement.classList.toggle('dark', dark);
            }
        };

        mediaQuery?.addEventListener('change', onChange);
        return () => mediaQuery?.removeEventListener('change', onChange);
    }, []);

    return { appearance, updateAppearance, isDark, toggleTheme };
}

