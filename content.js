const get = function(selector, scope) {
  scope = scope ? scope : document;
  return scope.querySelector(selector);
};
const getAll = function(selector, scope) {
  scope = scope ? scope : document;
  return scope.querySelectorAll(selector);
};

const dom2txml = {
  options: {
    hover: true
  },
  setup: function() {
    // load css to generated background.html
    get('head').insertAdjacentHTML(
      'beforeEnd',
      `<link href=${chrome.extension.getURL('content/content.css')} rel="stylesheet" />`
    );

    // load content.html to generated background.html
    fetch(chrome.runtime.getURL('content/content.html'))
      .then(response => response.text())
      .then(data => {
        // disable dom2txml html injection if the extension is already active
        if (!get('#dom2txml-wrapper')) {
          document.body.innerHTML += data;
          document.body.style.paddingBottom = '200px';
        }
        // every element on the page has to be selectevent listeners
        getAll('body').forEach(el => {
          el.addEventListener('mouseover', dom2txml.addHighlight, false);
          el.addEventListener('mouseout', dom2txml.removeHighlight, false);
        });

        // dom2txml.renderFromLocalStorage();
      })
      .catch(err => {
        //console.log(err);
      });
  },
  addHighlight: function(event) {
    const hasDom2txmlTags =
      event.target.classList.contains('dom2txml-ext') ||
      event.target.classList.contains('dom2txml-tag') ||
      event.target.parentNode.classList.contains('dom2txml-tag') ||
      event.target.parentNode.getElementsByClassName('dom2txml-tag').length > 0;

    if (!hasDom2txmlTags && dom2txml.options.hover) {
      event.target.classList.add('dom2txml-highlight');
    }
  },
  removeHighlight: function(event) {
    event.target.classList.remove('dom2txml-highlight');
  },
  renderFromLocalStorage: function() {}
};

dom2txml.setup();
