/**
 * Centralized API Base URL Configuration
 * Supports import.meta.env.VITE_API_URL (Vite) and process.env.REACT_APP_API_URL (CRA/Webpack).
 * Defaults to '' for same-origin serverless routing in production and preview.
 */
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' &&
    ((process as any).env?.REACT_APP_API_URL || (process as any).env?.VITE_API_URL)) ||
  '';

/**
 * Builds an absolute or relative API URL using the configured API base URL.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
