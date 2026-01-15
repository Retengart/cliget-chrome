import type { Download, RequestBody } from '../shared/types';
import { getFilenameFromContentDisposition, getFilenameFromUrl } from '../shared/utils';
import { addDownload } from './downloads';

// Temporary request storage (in-memory, cleared on service worker restart)
// This is OK because we only need it during the request lifecycle
interface PendingRequest {
  id: string;
  method: string;
  url: string;
  timestamp: number;
  headers?: chrome.webRequest.HttpHeader[];
  payload?: chrome.webRequest.WebRequestBody;
}

const pendingRequests = new Map<string, PendingRequest>();
const PENDING_TIMEOUT = 10000; // 10 seconds

// Clean up stale pending requests
function cleanupPending(): void {
  const now = Date.now();
  for (const [id, req] of pendingRequests) {
    if (req.timestamp + PENDING_TIMEOUT < now) {
      pendingRequests.delete(id);
    }
  }
}

// Check if request type is trackable
function isTrackableType(type: string): boolean {
  return type === 'main_frame' || type === 'sub_frame';
}

// Convert Chrome's WebRequestBody to our RequestBody type
function convertRequestBody(body: chrome.webRequest.WebRequestBody | null): RequestBody | undefined {
  if (!body) return undefined;

  const result: RequestBody = {};

  if (body.error) {
    result.error = body.error;
  }

  if (body.formData) {
    result.formData = body.formData;
  }

  if (body.raw) {
    // Filter out items without bytes and convert
    result.raw = body.raw
      .filter((item): item is { bytes: ArrayBuffer } => item.bytes !== undefined)
      .map((item) => ({ bytes: item.bytes }));
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// Handle onBeforeRequest
export function onBeforeRequest(
  details: chrome.webRequest.WebRequestBodyDetails
): void {
  if (!isTrackableType(details.type) || details.tabId < 0) return;

  cleanupPending();

  pendingRequests.set(details.requestId, {
    id: details.requestId,
    method: details.method,
    url: details.url,
    timestamp: Date.now(),
    payload: details.requestBody ?? undefined,
  });
}

// Handle onSendHeaders
export function onSendHeaders(
  details: chrome.webRequest.WebRequestHeadersDetails
): void {
  const req = pendingRequests.get(details.requestId);

  if (req) {
    req.headers = details.requestHeaders;
  } else if (isTrackableType(details.type) && details.tabId >= 0) {
    cleanupPending();

    pendingRequests.set(details.requestId, {
      id: details.requestId,
      method: details.method,
      url: details.url,
      timestamp: Date.now(),
      headers: details.requestHeaders,
    });
  }
}

// Handle onResponseStarted
export function onResponseStarted(
  details: chrome.webRequest.WebResponseHeadersDetails
): void {
  const request = pendingRequests.get(details.requestId);
  if (!request) return;

  pendingRequests.delete(details.requestId);

  // Skip non-200 and cached responses
  const fromCache = (details as { fromCache?: boolean }).fromCache;
  if (details.statusCode !== 200 || fromCache) return;

  let contentType = '';
  let contentDisposition = '';
  let filename: string | undefined;
  let size: number | undefined;

  for (const header of details.responseHeaders ?? []) {
    const headerName = header.name.toLowerCase();

    if (headerName === 'content-type') {
      contentType = header.value?.toLowerCase() ?? '';
    } else if (headerName === 'content-disposition') {
      contentDisposition = header.value ?? '';
      try {
        filename = getFilenameFromContentDisposition(contentDisposition) ?? undefined;
      } catch {
        filename = undefined;
      }
    } else if (headerName === 'content-length') {
      size = parseInt(header.value ?? '0', 10) || undefined;
    }
  }

  // Skip if not an attachment and is a displayable content type
  if (!contentDisposition.toLowerCase().startsWith('attachment')) {
    const displayableTypes = [
      'text/html',
      'text/plain',
      'image/',
      'application/xhtml',
      'application/xml',
    ];
    if (displayableTypes.some((t) => contentType.startsWith(t))) {
      return;
    }
  }

  // Use URL filename as fallback
  if (!filename) {
    filename = getFilenameFromUrl(request.url);
  }

  const download: Download = {
    id: request.id,
    url: request.url,
    method: request.method,
    headers: request.headers ?? [],
    body: convertRequestBody(request.payload ?? null),
    filename,
    size,
    timestamp: Date.now(),
  };

  addDownload(download);
}

// Handle onBeforeRedirect (needed for proper request tracking)
export function onBeforeRedirect(): void {
  // No-op, but listener needed for request lifecycle
}

// Handle onErrorOccurred
export function onErrorOccurred(details: chrome.webRequest.WebResponseErrorDetails): void {
  pendingRequests.delete(details.requestId);
}

// Set up all listeners
export function setupWebRequestListeners(): void {
  chrome.webRequest.onBeforeRequest.addListener(
    onBeforeRequest,
    { urls: ['<all_urls>'] },
    ['requestBody']
  );

  chrome.webRequest.onSendHeaders.addListener(
    onSendHeaders,
    { urls: ['<all_urls>'] },
    ['requestHeaders']
  );

  chrome.webRequest.onResponseStarted.addListener(
    onResponseStarted,
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );

  chrome.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, { urls: ['<all_urls>'] });

  chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['<all_urls>'] });
}
