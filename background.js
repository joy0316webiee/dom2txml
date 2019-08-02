'user strict';

chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(null, { file: 'content.js' });
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {});
