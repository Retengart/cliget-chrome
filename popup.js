"use strict";

function escapeShellArg(arg, doubleQuotes) {
  let ret = "";

  if (doubleQuotes) {
    ret = arg.replace(/["\\]/g, (m) => `\\${m.slice(0, 1)}`);
    return `"${ret}"`;
  }

  ret = arg.replace(/'/g, (m) => `'\\${m.slice(0, 1)}'`);
  return `'${ret}'`;
}

function fileSizeToText(size) {
  let unit = "B";
  if (size >= 1024) {
    size /= 1024;
    unit = "KB";

    if (size >= 1024) {
      size /= 1024;
      unit = "MB";

      if (size >= 1024) {
        size /= 1024;
        unit = "GB";
      }
    }
  }

  return `${size.toFixed(1)} ${unit}`;
}

function renderOptionsElement(body, type, name, value, label, help, callback) {
  const labelEl = document.createElement("label");
  labelEl.title = help;
  labelEl.htmlFor = name;

  const input = document.createElement("input");
  input.id = name;
  input.name = name;
  input.type = type;
  if (type === "checkbox") input.checked = value;
  else input.value = value;

  input.onchange = callback;

  if (type === "text") {
    labelEl.classList.add("text-input", "browser-style");
    labelEl.appendChild(document.createTextNode(label + ":"));
    labelEl.appendChild(input);
    body.appendChild(labelEl);
  } else {
    labelEl.appendChild(document.createTextNode(label));
    body.appendChild(input);
    body.appendChild(labelEl);
  }
}

function renderOptions(body, options, callback) {
  function onchange(event) {
    let ops = {};
    let target = event.target;
    if (target.type === "checkbox") ops[target.name] = target.checked;
    else if (target.type === "text") ops[target.name] = target.value;

    callback(ops);
  }

  function resetCallback() {
    callback();
  }

  let reset = document.createElement("button");
  reset.classList.add("reset", "browser-style");
  reset.onclick = resetCallback;
  reset.textContent = "Reset";
  body.appendChild(reset);

  let common = document.createElement("div");
  common.classList.add("common", "browser-style");
  renderOptionsElement(
    common,
    "checkbox",
    "doubleQuotes",
    options.doubleQuotes,
    "Escape with double-quotes",
    'Use double quotation marks (") for command-line arguments. Enable this if you plan to *execute* the commands on a Windows machine.',
    onchange
  );
  renderOptionsElement(
    common,
    "text",
    "excludeHeaders",
    options.excludeHeaders,
    "Exclude headers",
    "Exclude request headers from the generated command.",
    onchange
  );

  let extra = document.createElement("div");
  extra.classList.add("extra", "browser-style");
  renderOptionsElement(
    extra,
    "text",
    "aria2Options",
    options.aria2Options,
    "Extra aria2 arguments",
    "Add extra command-line arguments to be appended to the aria2c command.",
    onchange
  );

  body.appendChild(common);
  body.appendChild(extra);
}

function showCommand(requestId, options) {
  if (!options) {
    chrome.runtime.sendMessage(["getOptions"], (opts) => {
      showCommand(requestId, opts);
    });
    return;
  }

  chrome.runtime.sendMessage(["generateCommand", requestId, options], (cmd) => {
    const body = document.body;
    while (body.firstChild) body.removeChild(body.firstChild);

    const textArea = document.createElement("textarea");
    textArea.classList.add("browser-style");
    textArea.cols = 80;
    textArea.rows = 15;
    textArea.value = cmd;

    let optionsDiv = document.createElement("div");
    optionsDiv.classList.add("options");
    renderOptions(optionsDiv, options, (optionsUpdate) => {
      if (!optionsUpdate)
        chrome.runtime.sendMessage(["resetOptions"], (newOptions) => {
          showCommand(requestId, newOptions);
        });
      else
        chrome.runtime.sendMessage(["setOptions", optionsUpdate], (newOptions) => {
          showCommand(requestId, newOptions);
        });
    });
    body.appendChild(textArea);
    body.appendChild(optionsDiv);
    textArea.focus();
    textArea.select();
  });
}

function showList(downloadList, highlight) {
  const body = document.body;
  while (body.firstChild) body.removeChild(body.firstChild);

  if (!downloadList.length) {
    let el = document.createElement("div");
    el.style.margin = "20px";
    el.textContent = "No downloads for this session.";
    body.appendChild(el);
    return;
  }

  for (let i = downloadList.length - 1; i >= 0; --i) {
    const req = downloadList[i];

    const row = document.createElement("div");
    row.classList.add("panel-section", "panel-section-tabs");
    if (highlight-- > 0) row.classList.add("highlight");
    body.appendChild(row);

    const buttonElement = document.createElement("div");
    buttonElement.classList.add("panel-section-tabs-button");
    buttonElement.title = req.url;
    buttonElement.onclick = function () {
      showCommand(req.id);
    };

    let fileNameSpan = document.createElement("span");
    if (req.size) {
      fileNameSpan.textContent = req.filename + " ";
      let sizeSpan = document.createElement("span");
      sizeSpan.classList.add("file-size");
      sizeSpan.textContent = `(${fileSizeToText(req.size)})`;
      fileNameSpan.appendChild(sizeSpan);
    } else {
      fileNameSpan.textContent = req.filename;
    }

    buttonElement.appendChild(fileNameSpan);
    row.appendChild(buttonElement);

    if (i) {
      let sep = document.createElement("div");
      sep.classList.add("panel-section-separator");
      body.appendChild(sep);
    }
  }

  let footer = document.createElement("div");
  footer.classList.add("panel-section", "panel-section-footer");
  body.appendChild(footer);
  let clearButton = document.createElement("div");
  clearButton.classList.add("panel-section-footer-button");
  clearButton.textContent = "Clear all";
  clearButton.onclick = function () {
    chrome.runtime.sendMessage(["clear"], () => window.close());
  };
  footer.appendChild(clearButton);
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage(["getDownloadList"], (list) => {
    chrome.action.getBadgeText({}, (text) => {
      let highlight = text ? parseInt(text) : 0;
      chrome.action.setBadgeText({ text: "" });
      showList(list, highlight);
    });
  });
}); 