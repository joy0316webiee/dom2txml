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
  init: function() {
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
      })
      .catch(err => {
        console.log(err);
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
  hasTags: function(event) {
    return event.target.parentNode.classList.contains('dom2txml-tag');
  },
  addTag: function(event) {
    if (!this.hasTags(event)) {
      event.preventDefault();
      this.removeHighlight(event);

      const el = event.target;
      const wrapper = document.createElement('div');
      wrapper.classList.add('dom2txml-tag');
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
      wrapper.innerHTML += `<div class="dom2txml-close"></div>`;
    }
  },
  removeTag: function(event) {
    event.preventDefault();
    event.target.parentElement.outerHTML = event.target.previousElementSibling.outerHTML;
  },
  removeAllTags: function(event) {
    event.preventDefault();
    getAll('.dom2txml-tag').forEach(function(el) {
      el.outerHTML = el.innerHTML;
    });
    // ensure every close btn is removed.
    getAll('.dom2txml-close').forEach(function(el) {
      el.remove();
    });
  },
  toggleExpansion: function() {
    const contentWrapper = get('#dom2txml-contentwrapper');
    const dom2txmlWrapper = get('#dom2txml-wrapper');
    const btn = get('#dom2txml-expandbtn');

    if (
      dom2txmlWrapper.classList.contains('expand') &&
      contentWrapper.classList.contains('expand')
    ) {
      // minimize
      dom2txmlWrapper.classList.remove('expand');
      contentWrapper.classList.remove('expand');
      btn.classList.remove('minimize');
    } else {
      // expand
      dom2txmlWrapper.classList.add('expand');
      contentWrapper.classList.add('expand');
      btn.classList.add('minimize');
    }
  },
  generateUniqueID: function() {
    return Math.random()
      .toString(36)
      .substr(2, 9);
  },
  addColumn: function(uid) {
    const table = get('#dom2txml-content');
    const newColumn = document.createElement('div');

    newColumn.classList.add('dom2txml-column');
    newColumn.classList.add('dom2txml-ext');
    newColumn.id = `dom2txml-column-${uid}`;
    newColumn.innerHTML = `
    <input class="dom2txml-ext dom2txml-columnname" id="dom2txml-fieldName-${uid}" value="Column Name" />
    <div class="dom2txml-ext dom2txml-deletecolumn" id="dom2txml-deleteColumn-${uid}"></div>
    <div class="dom2txml-container dom2txml-ext" id="dom2txml-container-${uid}"></div>
    <div class="dom2txml-ext dom2txml-addSelectionBtn" id="dom2txml-addSelection-${uid}">+ Add Selection</div>`;
    table.appendChild(newColumn);
  },
  deleteColumn: function(uid) {
    get(`#dom2txml-column-${uid}`).remove();
  },
  saveSelection: function(id) {
    // TODO: add converting functionality
    let html = '';
    getAll('.dom2txml-tag').forEach(tag => {
      html += `<p class="dom2txml-ext dom2txml-selectiontags">${this.createTxmlPath(
        tag.childNodes[0]
      )}</p>`;
    });
    get(`#dom2txml-container-${id}`).innerHTML += html;
  },
  createTxmlPath: function(el) {
    let path = '';
    let tmpNode = null;
    while (el.parentElement && el.parentElement.nodeName !== 'document') {
      tmpNode = el;
      el = el.parentElement;
      const index = this.findIndex(el, tmpNode);
      path = `${tmpNode.nodeName.toLowerCase()}${
        index !== null ? '[' + index + ']' : ''
      }${path ? '.' + path : ''}`;
    }
    return path;
  },
  findIndex: function(p, el) {
    const same = Array.from(p.childNodes).filter(ch => ch.nodeName === el.nodeName);
    if (same.length == 1) {
      return null;
    }
    for (let i = 0; i < same.length; i++) {
      if (same[i].isSameNode(el)) {
        return i;
      }
    }
    throw new Error("can't find element index");
  },
  generateJSON: function() {
    const result = this.grepJSONData();
    const fileName = this.getProjectName();

    chrome.runtime.sendMessage({
      name: 'download-json',
      data: JSON.stringify(result),
      filename: fileName
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
    });
  },
  grepJSONData: function() {
    const resultRows = this.generate2DArray();
    let data = [];

    for (let i = 0; i < resultRows.length - 1; i++) {
      let obj = {};
      for (let k = 0; k < resultRows[0].length; k++) {
        // turn 2darray into json object
        // then trim off the start/end double quote
        let value =
          typeof resultRows[i + 1][k] === 'string'
            ? resultRows[i + 1][k].replace(/^"(.+(?="$))"$/, '$1')
            : '';
        obj[resultRows[0][k]] = value;
      }
      data.push(obj);
    }

    return {
      type: 'single-page',
      name: this.getProjectName(),
      data: data
    };
  },
  generateCSV: function() {
    // no column id for csv
    const result = this.grepCSVData();
    const fileName = this.getProjectName();
    chrome.runtime.sendMessage({
      name: 'download-csv',
      data: result,
      filename: fileName
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase()
    });
  },
  grepCSVData: function() {
    const resultRows = this.generate2DArray();
    return resultRows
      .map(function(d) {
        return d.join();
      })
      .join('\n');
  },
  generate2DArray: function() {
    const columns = getAll('.dom2txml-column');
    let resultRows = new Array(this.getLongestColumnCount());
    let resultColumns = new Array(columns.length);
    for (let k = 0; k < resultRows.length; k++) {
      resultRows[k] = new Array(resultColumns);
    }

    columns.forEach((column, i) => {
      const tags = getAll('.dom2txml-selectiontags', column);
      tags.forEach((tag, j) => {
        resultRows[j][i] = `"${tag.innerText}"`;
      });
    });

    resultRows.unshift(this.getColumnHeaderArray());
    return resultRows;
  },
  getProjectName: function() {
    return get('#dom2txml-fileName').value || 'project_name';
  },
  getColumnHeaderArray: function() {
    const header = [];
    let prevValue = '';
    getAll('.dom2txml-columnname').forEach(function(name, index) {
      if (name.value === prevValue) {
        header.push(`${name.value} ${index}`); // ["Column Name", "Column Name 1"]
      } else {
        header.push(name.value); //["bakeries", "author"]
      }
      prevValue = name.value;
    });
    return header;
  },
  getLongestColumnCount: function() {
    const columns = getAll('.dom2txml-column');
    const result = [];
    // get longest column length
    columns.forEach(column => {
      const tags = getAll('.dom2txml-selectiontags', column);
      result.push(tags.length);
    });
    return Math.max(...result);
  }
};

dom2txml.init();

document.addEventListener('keypress', function(event) {
  const key = event.keyCode;
  if (key === 13 || key === 27) {
    event.preventDefault();
    event.target.blur();
    event.target.classList.add('animate-flash');

    setTimeout(function() {
      event.target.classList.remove('animate-flash');
    }, 300);
  }
});

document.addEventListener('click', function(event) {
  if (event.target.classList.contains('dom2txml-highlight')) {
    event.preventDefault();
    event.stopPropagation();

    dom2txml.addTag(event);
  }
  if (event.target.classList.contains('dom2txml-close')) {
    dom2txml.removeTag(event);
  }

  if (event.target.id.match('dom2txml-downloadJSON')) {
    dom2txml.generateJSON();
  }
  if (event.target.id.match('dom2txml-downloadCSV')) {
    dom2txml.generateCSV();
  }
  if (event.target.id.match('dom2txml-expandbtn')) {
    dom2txml.toggleExpansion();
  }
  if (event.target.id.match('dom2txml-quit')) {
    window.location.reload();
  }

  if (event.target.id.match('dom2txml-newColumn')) {
    const id = dom2txml.generateUniqueID();
    dom2txml.addColumn(id);
  }
  if (event.target.id.match('dom2txml-deleteColumn')) {
    const id = event.target.id.split('-')[2];
    dom2txml.deleteColumn(id);
  }
  if (event.target.id.match('dom2txml-addSelection')) {
    const id = event.target.id.split('-')[2];

    dom2txml.saveSelection(id);
    dom2txml.removeAllTags(event);
  }
});
