import { renderTabs, renderTabContent } from './tabs';

document.addEventListener('DOMContentLoaded', () => {
  const tabBar = document.getElementById('tab-bar');
  const content = document.getElementById('content');

  if (!tabBar || !content) {
    console.error('Required elements not found');
    return;
  }

  renderTabs(tabBar, content);
  renderTabContent(content);
});
