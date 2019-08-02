'user strict';

chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.excuteScript(null, { file: 'content.js' });
});

chrome.runtime.onMessage.addListener(function(
  message,
  sender,
  sendResponse
) {});
