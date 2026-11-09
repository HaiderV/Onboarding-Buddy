export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path) {
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean}`;
}

export function apiFetch(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("ob_session") : null;
  const headers = { ...options.headers };
  if (token && !headers["X-Session-Token"]) {
    headers["X-Session-Token"] = token;
  }
  return fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });
}

export default apiFetch;

