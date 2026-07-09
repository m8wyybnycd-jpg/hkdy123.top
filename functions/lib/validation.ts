/**
 * Validate that a URL uses a safe protocol (http, https, or is empty/relative).
 * Blocks javascript:, data:, vbscript:, file: etc.
 *
 * @param url - URL string to validate
 * @returns true if the URL is safe (or empty), false otherwise
 */
export function isSafeUrl(url: string): boolean {
  if (!url || url.trim() === "") return true;
  try {
    const parsed = new URL(url, "https://example.com");
    return ["http:", "https:"].includes(parsed.protocol) ||
           (url.startsWith("/") && !url.startsWith("//"));
  } catch {
    return false;
  }
}

/**
 * Validate a URL field and return an error message if invalid.
 * Use in admin endpoints to validate imageUrl/linkUrl inputs.
 *
 * @param url - URL string to validate
 * @param fieldName - Field name for error message
 * @returns null if valid, error message string if invalid
 */
export function validateUrl(url: string, fieldName: string): string | null {
  if (!isSafeUrl(url)) {
    return `${fieldName} 必须是 http:// 或 https:// 开头的有效URL`;
  }
  return null;
}
