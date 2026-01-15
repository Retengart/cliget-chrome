import type { Download, DownloadListResponse, Options } from '../shared/types';
import { sendMessage } from '../shared/messages';
import { formatFileSize } from '../shared/utils';
import { clearElement, copyToClipboard, el } from './components';

const PAGE_SIZE = 10;
let currentPage = 0;

// Show error message
function showError(container: HTMLElement, message: string): void {
  clearElement(container);
  container.appendChild(el('div', { class: 'error' }, [message]));
}

// Render download list
export async function renderDownloadList(container: HTMLElement): Promise<void> {
  clearElement(container);

  try {
    const response = await sendMessage({ type: 'getDownloadList', page: currentPage });
    // Clear badge silently, don't fail if it errors
    sendMessage({ type: 'clearBadge' }).catch(() => {});

    if (response.total === 0) {
      container.appendChild(
        el('div', { class: 'empty-state' }, ['No downloads in this session.'])
      );
      return;
    }

    const list = el('div', { class: 'download-list' });

    for (const download of response.downloads) {
      list.appendChild(renderDownloadItem(download, container));
    }

    container.appendChild(list);

    // Pagination
    if (response.total > PAGE_SIZE) {
      container.appendChild(renderPagination(response, container));
    }

    // Footer
    container.appendChild(renderFooter(container));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load downloads';
    showError(container, message);
  }
}

// Render single download item
function renderDownloadItem(download: Download, container: HTMLElement): HTMLElement {
  const row = el('div', { class: 'download-item' });

  // Show method indicator for non-GET requests
  const methodIndicator = download.method !== 'GET' ? `[${download.method}] ` : '';
  const nameSpan = el('span', { class: 'filename' }, [methodIndicator + (download.filename ?? 'Unknown')]);

  if (download.size) {
    nameSpan.appendChild(
      el('span', { class: 'file-size' }, [` (${formatFileSize(download.size)})`])
    );
  }

  row.appendChild(nameSpan);
  row.title = download.url;

  row.onclick = () => showCommand(download.id, container);

  return row;
}

// Render pagination controls
function renderPagination(response: DownloadListResponse, container: HTMLElement): HTMLElement {
  const totalPages = Math.ceil(response.total / PAGE_SIZE);
  const pagination = el('div', { class: 'pagination' });

  // Previous button
  const prevBtn = el('button', {
    class: 'page-btn',
    disabled: currentPage === 0,
    textContent: '◀',
  });
  prevBtn.onclick = () => {
    if (currentPage > 0) {
      currentPage--;
      renderDownloadList(container);
    }
  };
  pagination.appendChild(prevBtn);

  // Page indicator
  pagination.appendChild(
    el('span', { class: 'page-info' }, [`${currentPage + 1} / ${totalPages}`])
  );

  // Next button
  const nextBtn = el('button', {
    class: 'page-btn',
    disabled: currentPage >= totalPages - 1,
    textContent: '▶',
  });
  nextBtn.onclick = () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderDownloadList(container);
    }
  };
  pagination.appendChild(nextBtn);

  return pagination;
}

// Render footer with clear button
function renderFooter(container: HTMLElement): HTMLElement {
  const footer = el('div', { class: 'footer' });

  const clearBtn = el('button', { class: 'clear-btn', textContent: 'Clear all' });
  clearBtn.onclick = async () => {
    try {
      await sendMessage({ type: 'clearDownloads' });
      currentPage = 0;
      renderDownloadList(container);
    } catch {
      // Ignore errors on clear
    }
  };
  footer.appendChild(clearBtn);

  return footer;
}

// Show command for a download
async function showCommand(downloadId: string, container: HTMLElement): Promise<void> {
  clearElement(container);

  try {
    const options = await sendMessage({ type: 'getOptions' });
    const result = await sendMessage({ type: 'generateCommand', id: downloadId });

    if (!result.ok) {
      showError(container, result.error);
      addBackButton(container);
      return;
    }

    // Command display
    const textarea = el('textarea', {
      class: 'command-textarea',
      value: result.value,
      rows: 10,
      readOnly: true,
    });
    container.appendChild(textarea);

    // Action buttons
    const actions = el('div', { class: 'command-actions' });

    const copyBtn = el('button', { class: 'copy-btn', textContent: 'Copy' });
    copyBtn.onclick = () => copyToClipboard(result.value, copyBtn);
    actions.appendChild(copyBtn);

    const backBtn = el('button', { class: 'back-btn', textContent: 'Back' });
    backBtn.onclick = () => renderDownloadList(container);
    actions.appendChild(backBtn);

    container.appendChild(actions);

    // Inline options
    container.appendChild(renderInlineOptions(options, downloadId, container));

    // Auto-select
    textarea.focus();
    textarea.select();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate command';
    showError(container, message);
    addBackButton(container);
  }
}

// Add back button to error view
function addBackButton(container: HTMLElement): void {
  const actions = el('div', { class: 'command-actions' });
  const backBtn = el('button', { class: 'back-btn', textContent: 'Back' });
  backBtn.onclick = () => renderDownloadList(container);
  actions.appendChild(backBtn);
  container.appendChild(actions);
}

// Render inline options for command view
function renderInlineOptions(
  options: Options,
  downloadId: string,
  container: HTMLElement
): HTMLElement {
  const optionsDiv = el('div', { class: 'inline-options' });

  // Double quotes checkbox
  const doubleQuotesLabel = el('label', { class: 'checkbox-label' });
  const doubleQuotesInput = el('input', {
    type: 'checkbox',
    checked: options.doubleQuotes,
  });
  doubleQuotesInput.onchange = async () => {
    try {
      await sendMessage({ type: 'setOptions', options: { doubleQuotes: doubleQuotesInput.checked } });
      showCommand(downloadId, container);
    } catch {
      // Revert checkbox on error
      doubleQuotesInput.checked = options.doubleQuotes;
    }
  };
  doubleQuotesLabel.appendChild(doubleQuotesInput);
  doubleQuotesLabel.appendChild(document.createTextNode(' Double quotes (Windows)'));
  optionsDiv.appendChild(doubleQuotesLabel);

  return optionsDiv;
}

// Reset pagination when switching tabs
export function resetPagination(): void {
  currentPage = 0;
}
