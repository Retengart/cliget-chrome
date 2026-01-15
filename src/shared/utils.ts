// Shell argument escaping
export function escapeShellArg(arg: string, doubleQuotes: boolean): string {
  if (doubleQuotes) {
    const escaped = arg.replace(/["\\]/g, (m) => `\\${m[0]}`);
    return `"${escaped}"`;
  }
  const escaped = arg.replace(/'/g, () => `'\\''`);
  return `'${escaped}'`;
}

// Parse filename from Content-Disposition header
export function getFilenameFromContentDisposition(header: string): string | null {
  if (!header) return null;

  const headerL = header.toLowerCase();

  // Try filename*=utf-8'' format first (RFC 5987)
  let i = headerL.indexOf("filename*=utf-8''");
  if (i !== -1) {
    i += 17;
    let j = i;
    while (j < header.length && !/[\s;]/.test(header[j])) j++;
    try {
      return decodeURIComponent(header.slice(i, j));
    } catch {
      return header.slice(i, j);
    }
  }

  // Try filename="..." format
  i = headerL.indexOf('filename="');
  if (i !== -1) {
    i += 10;
    let j = i;
    // Fix: check j > i before accessing j-1 to avoid index -1
    while (j < header.length && !(header[j] === '"' && (j === i || header[j - 1] !== '\\'))) j++;
    try {
      return JSON.parse(header.slice(i - 1, j + 1));
    } catch {
      return header.slice(i, j);
    }
  }

  // Try filename= format (unquoted)
  i = headerL.indexOf('filename=');
  if (i !== -1) {
    i += 9;
    let j = i;
    while (j < header.length && !/[\s;]/.test(header[j])) j++;
    return header.slice(i, j);
  }

  return null;
}

// Extract filename from URL
export function getFilenameFromUrl(url: string): string {
  if (!url) return '';

  let j = url.indexOf('?');
  if (j === -1) j = url.indexOf('#');
  if (j === -1) j = url.length;

  const i = url.lastIndexOf('/', j);
  try {
    return decodeURIComponent(url.slice(i + 1, j));
  } catch {
    return url.slice(i + 1, j);
  }
}

// Format file size for display
export function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Parse exclude headers option (space-separated, case-insensitive)
export function parseExcludeHeaders(excludeHeaders: string): Set<string> {
  return new Set(
    excludeHeaders
      .split(/\s+/)
      .map((h) => h.toLowerCase())
      .filter(Boolean)
  );
}
