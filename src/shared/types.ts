// Request body for POST requests
export interface RequestBody {
  raw?: Array<{ bytes: ArrayBuffer }>;
  formData?: Record<string, string[]>;
  error?: string;
}

// Download tracking
export interface Download {
  id: string;
  url: string;
  method: string;
  headers: chrome.webRequest.HttpHeader[];
  body?: RequestBody;
  filename?: string;
  size?: number;
  timestamp: number;
}

// Options stored in chrome.storage.local
export interface Options {
  doubleQuotes: boolean;
  excludeHeaders: string;
  aria2Options: string;
}

export const DEFAULT_OPTIONS: Options = {
  doubleQuotes: false,
  excludeHeaders: 'Accept-Encoding Connection',
  aria2Options: '',
};

// Result type for error handling
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Paginated download list response
export interface DownloadListResponse {
  downloads: Download[];
  total: number;
  page: number;
  pageSize: number;
}

// Message types (discriminated union)
export type Message =
  | { type: 'getDownloadList'; page: number }
  | { type: 'generateCommand'; id: string }
  | { type: 'getOptions' }
  | { type: 'setOptions'; options: Partial<Options> }
  | { type: 'resetOptions' }
  | { type: 'clearDownloads' }
  | { type: 'clearBadge' };

// Response types mapped to message types
export type MessageResponse<T extends Message['type']> = T extends 'getDownloadList'
  ? DownloadListResponse
  : T extends 'generateCommand'
    ? Result<string>
    : T extends 'getOptions'
      ? Options
      : T extends 'setOptions'
        ? Options
        : T extends 'resetOptions'
          ? Options
          : T extends 'clearDownloads'
            ? void
            : T extends 'clearBadge'
              ? void
              : never;
