import type { Message, MessageResponse } from '../shared/types';
import { clearBadge, clearDownloads, getDownloadList } from './downloads';
import { generateCommand } from './commands';
import { getOptions, initializeOptions, resetOptions, setOptions } from './options';
import { setupWebRequestListeners } from './webRequest';

// Initialize extension
initializeOptions();
setupWebRequestListeners();

// Set badge background color
chrome.action.setBadgeBackgroundColor({ color: '#4a90d9' });

// Message handler
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: MessageResponse<Message['type']>) => void) => {
    handleMessage(message).then(sendResponse);
    return true; // Always async
  }
);

async function handleMessage(message: Message): Promise<MessageResponse<Message['type']>> {
  switch (message.type) {
    case 'getDownloadList':
      return getDownloadList(message.page);

    case 'generateCommand': {
      const options = await getOptions();
      return generateCommand(message.id, options);
    }

    case 'getOptions':
      return getOptions();

    case 'setOptions':
      return setOptions(message.options);

    case 'resetOptions':
      return resetOptions();

    case 'clearDownloads':
      await clearDownloads();
      return;

    case 'clearBadge':
      await clearBadge();
      return;

    default: {
      const _exhaustive: never = message;
      throw new Error(`Unknown message type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
