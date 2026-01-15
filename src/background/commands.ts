import type { Download, Options, RequestBody, Result } from '../shared/types';
import { escapeShellArg, parseExcludeHeaders } from '../shared/utils';
import { getDownload } from './downloads';

// Generate aria2c command for GET requests
function generateAria2Command(download: Download, options: Options): string {
  const parts = ['aria2c'];
  const excludeHeaders = parseExcludeHeaders(options.excludeHeaders);

  for (const header of download.headers) {
    const headerName = header.name.toLowerCase();
    const headerValue = header.value ?? '';

    if (excludeHeaders.has(headerName) || !headerValue) continue;

    if (headerName === 'referer') {
      parts.push(`--referer ${escapeShellArg(headerValue, options.doubleQuotes)}`);
    } else if (headerName === 'user-agent') {
      parts.push(`--user-agent ${escapeShellArg(headerValue, options.doubleQuotes)}`);
    } else {
      const h = escapeShellArg(`${header.name}: ${headerValue}`, options.doubleQuotes);
      parts.push(`--header ${h}`);
    }
  }

  parts.push(escapeShellArg(download.url, options.doubleQuotes));

  if (download.filename) {
    parts.push(`--out ${escapeShellArg(download.filename, options.doubleQuotes)}`);
  }

  if (options.aria2Options.trim()) {
    parts.push(options.aria2Options.trim());
  }

  return parts.join(' ');
}

// Convert request body to curl data arguments
function formatCurlBody(body: RequestBody, doubleQuotes: boolean): string[] {
  const parts: string[] = [];

  if (body.formData) {
    // Form data: use --data-urlencode for each field
    for (const [key, values] of Object.entries(body.formData)) {
      for (const value of values) {
        parts.push(`--data-urlencode ${escapeShellArg(`${key}=${value}`, doubleQuotes)}`);
      }
    }
  } else if (body.raw && body.raw.length > 0) {
    // Raw binary data: convert to string if possible
    try {
      const decoder = new TextDecoder();
      const rawData = body.raw
        .map((item) => decoder.decode(item.bytes))
        .join('');
      parts.push(`--data-raw ${escapeShellArg(rawData, doubleQuotes)}`);
    } catch {
      parts.push('# Warning: binary data could not be converted');
    }
  }

  return parts;
}

// Generate curl command for POST/PUT requests
function generateCurlCommand(download: Download, options: Options): string {
  const parts = ['curl'];
  const excludeHeaders = parseExcludeHeaders(options.excludeHeaders);

  // Method
  if (download.method !== 'GET') {
    parts.push(`-X ${download.method}`);
  }

  // Headers
  for (const header of download.headers) {
    const headerName = header.name.toLowerCase();
    const headerValue = header.value ?? '';

    if (excludeHeaders.has(headerName) || !headerValue) continue;

    // Skip content-length for POST as curl calculates it
    if (headerName === 'content-length' && download.body) continue;

    const h = escapeShellArg(`${header.name}: ${headerValue}`, options.doubleQuotes);
    parts.push(`-H ${h}`);
  }

  // Request body
  if (download.body) {
    parts.push(...formatCurlBody(download.body, options.doubleQuotes));
  }

  // URL
  parts.push(escapeShellArg(download.url, options.doubleQuotes));

  // Output file
  if (download.filename) {
    parts.push(`-o ${escapeShellArg(download.filename, options.doubleQuotes)}`);
  }

  return parts.join(' ');
}

// Generate command based on HTTP method
function generateDownloadCommand(download: Download, options: Options): string {
  if (download.method === 'GET') {
    return generateAria2Command(download, options);
  }
  // POST, PUT, etc. - use curl
  return generateCurlCommand(download, options);
}

// Generate command with error handling
export async function generateCommand(id: string, options: Options): Promise<Result<string>> {
  const download = await getDownload(id);

  if (!download) {
    return { ok: false, error: 'Download not found' };
  }

  try {
    const command = generateDownloadCommand(download, options);
    return { ok: true, value: command };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
