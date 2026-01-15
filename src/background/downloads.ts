import type { Download, DownloadListResponse } from '../shared/types';

const STORAGE_KEY = 'downloads';
const BADGE_KEY = 'badgeCount';

// Load downloads from session storage
export async function loadDownloads(): Promise<Download[]> {
  const result = await chrome.storage.session.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? [];
}

// Save downloads to session storage
export async function saveDownloads(downloads: Download[]): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: downloads });
}

// Add a new download
export async function addDownload(download: Download): Promise<void> {
  const downloads = await loadDownloads();
  downloads.push(download);
  await saveDownloads(downloads);
  await incrementBadge();
}

// Get paginated download list
export async function getDownloadList(page: number, pageSize = 10): Promise<DownloadListResponse> {
  const downloads = await loadDownloads();
  const total = downloads.length;

  // Return in reverse order (newest first)
  const reversed = [...downloads].reverse();
  const start = page * pageSize;
  const end = start + pageSize;
  const pageDownloads = reversed.slice(start, end);

  return { downloads: pageDownloads, total, page, pageSize };
}

// Get download by ID
export async function getDownload(id: string): Promise<Download | undefined> {
  const downloads = await loadDownloads();
  return downloads.find((d) => d.id === id);
}

// Clear all downloads
export async function clearDownloads(): Promise<void> {
  await saveDownloads([]);
  await clearBadge();
}

// Badge management - atomic counter to avoid race conditions
export async function incrementBadge(): Promise<void> {
  const result = await chrome.storage.session.get(BADGE_KEY);
  const count = (result[BADGE_KEY] ?? 0) + 1;
  await chrome.storage.session.set({ [BADGE_KEY]: count });
  await chrome.action.setBadgeText({ text: count.toString() });
}

export async function clearBadge(): Promise<void> {
  await chrome.storage.session.set({ [BADGE_KEY]: 0 });
  await chrome.action.setBadgeText({ text: '' });
}

export async function getBadgeCount(): Promise<number> {
  const result = await chrome.storage.session.get(BADGE_KEY);
  return result[BADGE_KEY] ?? 0;
}
