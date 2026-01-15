import { clearElement, el } from './components';
import { renderDownloadList, resetPagination } from './downloadList';
import { renderOptionsTab } from './optionsTab';

type TabId = 'downloads' | 'options';

let activeTab: TabId = 'downloads';

// Render tab bar
export function renderTabs(tabBar: HTMLElement, content: HTMLElement): void {
  clearElement(tabBar);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'downloads', label: 'Downloads' },
    { id: 'options', label: 'Options' },
  ];

  for (const tab of tabs) {
    const tabBtn = el('button', {
      class: ['tab-btn', tab.id === activeTab ? 'active' : ''].filter(Boolean),
      textContent: tab.label,
    });

    tabBtn.onclick = () => switchTab(tab.id, tabBar, content);
    tabBar.appendChild(tabBtn);
  }
}

// Switch to tab
export function switchTab(tabId: TabId, tabBar: HTMLElement, content: HTMLElement): void {
  if (tabId !== activeTab) {
    activeTab = tabId;
    if (tabId === 'downloads') {
      resetPagination();
    }
  }

  renderTabs(tabBar, content);
  renderTabContent(content);
}

// Render tab content
export function renderTabContent(content: HTMLElement): void {
  switch (activeTab) {
    case 'downloads':
      renderDownloadList(content);
      break;
    case 'options':
      renderOptionsTab(content);
      break;
  }
}
