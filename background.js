'user strict';

chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(null, { file: 'content.js' });
});

chrome.runtime.onMessage.addListener(function(message, _, __) {
  if (message.name === 'download-json') {
    let blob = new Blob([message.data], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `${message.filename || 'dom2txml'}.json`
    });
  }
  if (message.name === 'download-csv') {
    let blob = new Blob([message.data], { type: 'text/csv' });
    let url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `${message.filename || 'dom2txml'}.csv`
    });
  }
});
