"use strict";

// Utility functions
function escapeShellArg(arg, doubleQuotes) {
  let ret = "";

  if (doubleQuotes) {
    ret = arg.replace(/["\\]/g, (m) => `\\${m.slice(0, 1)}`);
    return `"${ret}"`;
  }

  ret = arg.replace(/'/g, (m) => `'\\${m.slice(0, 1)}'`);
  return `'${ret}'`;
}

function getFilenameFromContentDisposition(header) {
  let headerL = header.toLowerCase();

  let i;
  i = headerL.indexOf("filename*=utf-8''");
  if (i !== -1) {
    i += 17;
    let j = i;
    while (j < headerL.length && !/[\s;]/.test(headerL[j])) ++j;

    return decodeURIComponent(header.slice(i, j));
  }

  i = headerL.indexOf('filename="');
  if (i !== -1) {
    i += 10;
    let j = i;
    while (
      j < headerL.length &&
      !(header[j] === '"' && headerL.slice(j - 1, j + 1) !== '\\"')
    )
      ++j;

    return JSON.parse(header.slice(i - 1, j + 1));
  }

  i = headerL.indexOf("filename=");
  if (i !== -1) {
    i += 9;
    let j = i;
    while (j < headerL.length && !/[\s;]/.test(headerL[j])) ++j;

    return header.slice(i, j);
  }

  return null;
}

function getFilenameFromUrl(url) {
  let j = url.indexOf("?");
  if (j === -1) j = url.indexOf("#");
  if (j === -1) j = url.length;

  let i = url.lastIndexOf("/", j);

  return decodeURIComponent(url.slice(i + 1, j));
}

// Aria2 command generator
function generateAria2Command(url, method, headers, payload, filename, options) {
  if (method !== "GET") throw new Error("Unsupported HTTP method");

  const parts = ["aria2c"];

  for (let header of headers) {
    let headerName = header.name.toLowerCase();

    if (headerName === "referer") {
      parts.push(`--referer ${escapeShellArg(header.value, options.doubleQuotes)}`);
    } else if (headerName === "user-agent") {
      parts.push(`--user-agent ${escapeShellArg(header.value, options.doubleQuotes)}`);
    } else {
      let h = escapeShellArg(`${header.name}: ${header.value}`, options.doubleQuotes);
      parts.push(`--header ${h}`);
    }
  }

  parts.push(escapeShellArg(url, options.doubleQuotes));

  if (filename) parts.push(`--out ${escapeShellArg(filename, options.doubleQuotes)}`);

  if (options.aria2Options) parts.push(options.aria2Options);

  return parts.join(" ");
}

const MAX_ITEMS = 10;

const downloads = new Map();
const currentRequests = new Map();

const defaultOptions = {
  doubleQuotes: false,
  excludeHeaders: "Accept-Encoding Connection",
  aria2Options: "",
};

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(defaultOptions, (result) => {
    if (Object.keys(result).length === 0) {
      chrome.storage.local.set(defaultOptions);
    }
  });
});

function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.local.get(defaultOptions, (res) => {
      resolve(res);
    });
  });
}

function setOptions(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => {
      getOptions().then((options) => {
        resolve(options);
      });
    });
  });
}

function resetOptions() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      chrome.storage.local.set(defaultOptions, () => {
        getOptions().then((options) => {
          resolve(options);
        });
      });
    });
  });
}

function clear() {
  downloads.clear();
}

function getDownloadList() {
  const list = [];
  for (let [reqId, req] of downloads) {
    list.push({
      id: reqId,
      url: req.url,
      filename: req.filename,
      size: req.size,
    });
  }
  return list;
}

function generateCommand(reqId, options) {
  const request = downloads.get(reqId);
  if (!request) throw new Error("Request not found");

  let excludeHeaders = options.excludeHeaders
    .split(" ")
    .map((h) => h.toLowerCase());

  let headers = request.headers.filter(
    (h) => excludeHeaders.indexOf(h.name.toLowerCase()) === -1
  );

  return generateAria2Command(
    request.url,
    request.method,
    headers,
    request.payload,
    request.filename,
    options
  );
}

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const [action, ...args] = message;

  if (action === "getOptions") {
    getOptions().then(sendResponse);
    return true;
  } else if (action === "setOptions") {
    setOptions(args[0]).then(sendResponse);
    return true;
  } else if (action === "resetOptions") {
    resetOptions().then(sendResponse);
    return true;
  } else if (action === "getDownloadList") {
    sendResponse(getDownloadList());
    return false;
  } else if (action === "clear") {
    clear();
    sendResponse();
    return false;
  } else if (action === "generateCommand") {
    try {
      const command = generateCommand(args[0], args[1]);
      sendResponse(command);
    } catch (err) {
      sendResponse(err.message);
    }
    return false;
  }
});

function onBeforeRequest(details) {
  if (
    (details.type === "main_frame" || details.type === "sub_frame") &&
    details.tabId >= 0
  ) {
    const now = Date.now();

    // Just in case of a leak
    currentRequests.forEach((req, reqId) => {
      if (req.timestamp + 10000 < now) currentRequests.delete(reqId);
    });

    const req = {
      id: details.requestId,
      method: details.method,
      url: details.url,
      timestamp: now,
      payload: details.requestBody,
    };
    currentRequests.set(details.requestId, req);
  }
}

function onSendHeaders(details) {
  const req = currentRequests.get(details.requestId);
  if (req) {
    req.headers = details.requestHeaders;
  } else if (
    (details.type === "main_frame" || details.type === "sub_frame") &&
    details.tabId >= 0 &&
    details.method === "GET"
  ) {
    const now = Date.now();

    // Just in case of a leak
    currentRequests.forEach((r, reqId) => {
      if (r.timestamp + 10000 < now) currentRequests.delete(reqId);
    });

    currentRequests.set(details.requestId, {
      id: details.requestId,
      method: details.method,
      url: details.url,
      timestamp: now,
      headers: details.requestHeaders,
    });
  }
}

function onResponseStarted(details) {
  const request = currentRequests.get(details.requestId);

  if (!request) return;

  currentRequests.delete(details.requestId);

  if (details.statusCode !== 200 || details.fromCache) return;

  let contentType, contentDisposition;

  for (let header of details.responseHeaders) {
    let headerName = header.name.toLowerCase();
    if (headerName === "content-type") {
      contentType = header.value.toLowerCase();
    } else if (headerName === "content-disposition") {
      contentDisposition = header.value.toLowerCase();
      request.filename = getFilenameFromContentDisposition(header.value);
    } else if (headerName === "content-length") {
      request.size = +header.value;
    }
  }

  if (!contentDisposition || !contentDisposition.startsWith("attachment"))
    if (
      contentType.startsWith("text/html") ||
      contentType.startsWith("text/plain") ||
      contentType.startsWith("image/") ||
      contentType.startsWith("application/xhtml") ||
      contentType.startsWith("application/xml")
    )
      return;

  if (!request.filename)
    request.filename = getFilenameFromUrl(request.url);

  downloads.set(details.requestId, request);

  chrome.action.getBadgeText({}, (text) => {
    let count = text ? parseInt(text) + 1 : 1;
    chrome.action.setBadgeText({ text: count.toString() });
  });

  if (downloads.size > MAX_ITEMS) {
    let keys = Array.from(downloads.keys());
    keys.slice(0, keys.length - MAX_ITEMS).forEach((k) => downloads.delete(k));
  }
}

function onBeforeRedirect() {
  // Need to listen to this event otherwise the request might have issues
}

function onErrorOccurred(details) {
  currentRequests.delete(details.requestId);
}

// Set up web request listeners
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequest,
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onSendHeaders.addListener(
  onSendHeaders,
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

chrome.webRequest.onResponseStarted.addListener(
  onResponseStarted,
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.webRequest.onBeforeRedirect.addListener(
  onBeforeRedirect,
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  onErrorOccurred,
  { urls: ["<all_urls>"] }
);

// Set badge background color
chrome.action.setBadgeBackgroundColor({ color: "#4a90d9" }); 