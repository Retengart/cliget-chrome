import type { Options } from '../shared/types';
import { DEFAULT_OPTIONS } from '../shared/types';

// Get options from storage
export async function getOptions(): Promise<Options> {
  const result = await chrome.storage.local.get(DEFAULT_OPTIONS);
  return result as Options;
}

// Set options (partial update)
export async function setOptions(values: Partial<Options>): Promise<Options> {
  await chrome.storage.local.set(values);
  return getOptions();
}

// Reset options to defaults
export async function resetOptions(): Promise<Options> {
  await chrome.storage.local.clear();
  await chrome.storage.local.set(DEFAULT_OPTIONS);
  return DEFAULT_OPTIONS;
}

// Initialize options on install
export function initializeOptions(): void {
  chrome.runtime.onInstalled.addListener(async () => {
    const result = await chrome.storage.local.get(null);
    if (Object.keys(result).length === 0) {
      await chrome.storage.local.set(DEFAULT_OPTIONS);
    }
  });
}
