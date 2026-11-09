import { useCallback, useEffect, useState } from "react";

const KEY = "ob-theme";

function initial() {
    if (typeof window === "undefined") return "light";
    try {
        const saved = window.localStorage.getItem(KEY);
        if (saved === "light" || saved === "dark") return saved;
    } catch {
        /* storage blocked — fall through to the OS preference */
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies data-theme to <html> and remembers the choice. */
export default function useTheme() {
    const [theme, setTheme] = useState(initial);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            window.localStorage.setItem(KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
    }, []);

    return { theme, setTheme, toggleTheme };
}
