import type { Message, MessageResponse } from './types';

// Send typed message from popup to background with error handling
export function sendMessage<T extends Message>(
  message: T
): Promise<MessageResponse<T['type']>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
}
