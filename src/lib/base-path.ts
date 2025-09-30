/**
 * Utility to handle basePath for API routes and assets
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Prepends the basePath to a URL path
 * @param path - The path to prepend basePath to
 * @returns The full path with basePath
 */
export function withBasePath(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Return path with basePath if it exists
  return BASE_PATH ? `${BASE_PATH}${cleanPath}` : cleanPath;
}

/**
 * Get the base path value
 */
export function getBasePath(): string {
  return BASE_PATH;
}
