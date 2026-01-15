import type { Options } from '../shared/types';
import { sendMessage } from '../shared/messages';
import { clearElement, el } from './components';

// Show error message
function showError(container: HTMLElement, message: string): void {
  clearElement(container);
  container.appendChild(el('div', { class: 'error' }, [message]));
}

// Render options tab
export async function renderOptionsTab(container: HTMLElement): Promise<void> {
  clearElement(container);

  let options;
  try {
    options = await sendMessage({ type: 'getOptions' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load options';
    showError(container, message);
    return;
  }

  const form = el('div', { class: 'options-form' });

  // Double quotes
  form.appendChild(
    renderCheckbox(
      'doubleQuotes',
      'Escape with double-quotes',
      'Use double quotation marks (") for command-line arguments. Enable for Windows.',
      options.doubleQuotes,
      (value) => updateOption('doubleQuotes', value)
    )
  );

  // Exclude headers
  form.appendChild(
    renderTextInput(
      'excludeHeaders',
      'Exclude headers',
      'Space-separated list of headers to exclude from the generated command.',
      options.excludeHeaders,
      (value) => updateOption('excludeHeaders', value)
    )
  );

  // Extra aria2 arguments
  form.appendChild(
    renderTextInput(
      'aria2Options',
      'Extra aria2 arguments',
      'Additional command-line arguments to append to the aria2c command.',
      options.aria2Options,
      (value) => updateOption('aria2Options', value)
    )
  );

  container.appendChild(form);

  // Reset button
  const footer = el('div', { class: 'options-footer' });
  const resetBtn = el('button', { class: 'reset-btn', textContent: 'Reset to defaults' });
  resetBtn.onclick = async () => {
    await sendMessage({ type: 'resetOptions' });
    renderOptionsTab(container);
  };
  footer.appendChild(resetBtn);
  container.appendChild(footer);
}

// Update single option
async function updateOption<K extends keyof Options>(key: K, value: Options[K]): Promise<void> {
  await sendMessage({ type: 'setOptions', options: { [key]: value } });
}

// Render checkbox input
function renderCheckbox(
  id: string,
  label: string,
  help: string,
  value: boolean,
  onChange: (value: boolean) => void
): HTMLElement {
  const wrapper = el('div', { class: 'option-row' });

  const input = el('input', { type: 'checkbox', id, checked: value });
  input.onchange = () => onChange(input.checked);

  const labelEl = el('label', { htmlFor: id, title: help }, [label]);

  wrapper.appendChild(input);
  wrapper.appendChild(labelEl);

  return wrapper;
}

// Render text input
function renderTextInput(
  id: string,
  label: string,
  help: string,
  value: string,
  onChange: (value: string) => void
): HTMLElement {
  const wrapper = el('div', { class: 'option-row text-row' });

  const labelEl = el('label', { htmlFor: id, title: help }, [label + ':']);
  wrapper.appendChild(labelEl);

  const input = el('input', { type: 'text', id, value });
  input.onchange = () => onChange(input.value);
  wrapper.appendChild(input);

  return wrapper;
}
