const get = function(selector, scope) {
  scope = scope ? scope : document;
  return scope.querySelector(selector);
};
const getAll = function(selector, scope) {
  scope = scope ? scope : document;
  return scope.querySelectorAll(selector);
};

const propertyGetter = (object, path) => {
  const getter = new Function('x', 'return x.' + path + ';');
  return getter(object);
};

const dom2txml = {
  options: {
    hover: true
  },
  init: function() {
    const scriptText = `
function tXml(S, options) {
    "use strict";
    options = options || {};

    var pos = options.pos || 0;

    var openBracket = "<";
    var openBracketCC = "<".charCodeAt(0);
    var closeBracket = ">";
    var closeBracketCC = ">".charCodeAt(0);
    var minus = "-";
    var minusCC = "-".charCodeAt(0);
    var slash = "/";
    var slashCC = "/".charCodeAt(0);
    var exclamation = "!";
    var exclamationCC = "!".charCodeAt(0);
    var singleQuote = "'";
    var singleQuoteCC = "'".charCodeAt(0);
    var doubleQuote = '"';
    var doubleQuoteCC = '"'.charCodeAt(0);

    function parseChildren() {
        var children = [];
        while (S[pos]) {
            if (S.charCodeAt(pos) == openBracketCC) {
                if (S.charCodeAt(pos + 1) === slashCC) {
                    pos = S.indexOf(closeBracket, pos);
                    if (pos + 1) pos += 1;
                    return children;
                } else if (S.charCodeAt(pos + 1) === exclamationCC) {
                    if (S.charCodeAt(pos + 2) == minusCC) {
                        //comment support
                        while (
                            pos !== -1 &&
                            !(
                                S.charCodeAt(pos) === closeBracketCC &&
                                S.charCodeAt(pos - 1) == minusCC &&
                                S.charCodeAt(pos - 2) == minusCC &&
                                pos != -1
                            )
                        ) {
                            pos = S.indexOf(closeBracket, pos + 1);
                        }
                        if (pos === -1) {
                            pos = S.length;
                        }
                    } else {
                        // doctypesupport
                        pos += 2;
                        while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
                            pos++;
                        }
                    }
                    pos++;
                    continue;
                }
                var node = parseNode();
                children.push(node);
            } else {
                var text = parseText();
                if (text.trim().length > 0) children.push(text);
                pos++;
            }
        }
        return children;
    }


    function parseText() {
        var start = pos;
        pos = S.indexOf(openBracket, pos) - 1;
        if (pos === -2) pos = S.length;
        return S.slice(start, pos + 1);
    }

    var nameSpacer = "\\n\\t>/= ";

    function parseName() {
        var start = pos;
        while (nameSpacer.indexOf(S[pos]) === -1 && S[pos]) {
            pos++;
        }
        return S.slice(start, pos);
    }

    var NoChildNodes = ["img", "br", "input", "meta", "link"];

    function parseNode() {
        var node = {};
        pos++;
        node.tagName = parseName();
        // parsing attributes
        var attrFound = false;
        while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
            var c = S.charCodeAt(pos);
            if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
                //if('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(S[pos])!==-1 ){
                var name = parseName();
                // search beginning of the string
                var code = S.charCodeAt(pos);
                while (
                    code &&
                    code !== singleQuoteCC &&
                    code !== doubleQuoteCC &&
                    !((code > 64 && code < 91) || (code > 96 && code < 123)) &&
                    code !== closeBracketCC
                ) {
                    pos++;
                    code = S.charCodeAt(pos);
                }
                if (!attrFound) {
                    node.attributes = {};
                    attrFound = true;
                }
                if (code === singleQuoteCC || code === doubleQuoteCC) {
                    var value = parseString();
                    if (pos === -1) {
                        return node;
                    }
                } else {
                    value = null;
                    pos--;
                }
                node.attributes[name] = value;
            }
            pos++;
        }
        // optional parsing of children
        if (S.charCodeAt(pos - 1) !== slashCC) {
            if (node.tagName == "script") {
                var start = pos + 1;
                pos = S.indexOf("</" + "script>", pos);
                node.children = [S.slice(start, pos - 1)];
                pos += 9;
            } else if (node.tagName == "style") {
                var start = pos + 1;
                pos = S.indexOf("</style>", pos);
                node.children = [S.slice(start, pos - 1)];
                pos += 8;
            } else if (NoChildNodes.indexOf(node.tagName) == -1) {
                pos++;
                node.children = parseChildren(name);
            }
        } else {
            pos++;
        }
        return node;
    }


    function parseString() {
        var startChar = S[pos];
        var startpos = ++pos;
        pos = S.indexOf(startChar, startpos);
        return S.slice(startpos, pos);
    }

    function findElements() {
        var r = new RegExp(
            "\\\s" + options.attrName + "\\\s*=['\\"]" + options.attrValue + "['\\"]"
        ).exec(S);
        if (r) {
            return r.index;
        } else {
            return -1;
        }
    }

    var out = null;
    if (options.attrValue !== undefined) {
        options.attrName = options.attrName || "id";
        var out = [];

        while ((pos = findElements()) !== -1) {
            pos = S.lastIndexOf("<", pos);
            if (pos !== -1) {
                out.push(parseNode());
            }
            S = S.substr(pos);
            pos = 0;
        }
    } else if (options.parseNode) {
        out = parseNode();
    } else {
        out = parseChildren();
    }

    if (options.filter) {
        out = tXml.filter(out, options.filter);
    }

    if (options.simplify) {
        out = tXml.simplify(out);
    }
    out.pos = pos;
    return out;
}
tXml.simplify = function simplify(children) {
    var out = {};
    if (!children.length) {
        return "";
    }

    if (children.length === 1 && typeof children[0] == "string") {
        return children[0];
    }
    // map each object
    children.forEach(function (child) {
        if (typeof child !== "object") {
            return;
        }
        if (!out[child.tagName]) out[child.tagName] = [];
        var kids = tXml.simplify(child.children || []);
        out[child.tagName].push(kids);
        if (child.attributes) {
            kids._attributes = child.attributes;
        }
    });

    for (var i in out) {
        if (out[i].length == 1) {
            out[i] = out[i][0];
        }
    }

    return out;
};

tXml.filter = function (children, f) {
    var out = [];
    children.forEach(function (child) {
        if (typeof child === "object" && f(child)) out.push(child);
        if (child.children) {
            var kids = tXml.filter(child.children, f);
            out = out.concat(kids);
        }
    });
    return out;
};

tXml.stringify = function TOMObjToXML(O) {
    var out = "";

    function writeChildren(O) {
        if (O)
            for (var i = 0; i < O.length; i++) {
                if (typeof O[i] == "string") {
                    out += O[i].trim();
                } else {
                    writeNode(O[i]);
                }
            }
    }

    function writeNode(N) {
        out += "<" + N.tagName;
        for (var i in N.attributes) {
            if (N.attributes[i] === null) {
                out += " " + i;
            } else if (N.attributes[i].indexOf('"') === -1) {
                out += " " + i + '="' + N.attributes[i].trim() + '"';
            } else {
                out += " " + i + "='" + N.attributes[i].trim() + "'";
            }
        }
        out += ">";
        writeChildren(N.children);
        out += "</" + N.tagName + ">";
    }
    writeChildren(O);

    return out;
};

tXml.toContentString = function (tDom) {
    if (Array.isArray(tDom)) {
        var out = "";
        tDom.forEach(function (e) {
            out += " " + tXml.toContentString(e);
            out = out.trim();
        });
        return out;
    } else if (typeof tDom === "object") {
        return tXml.toContentString(tDom.children);
    } else {
        return " " + tDom;
    }
};

tXml.getElementsById = function (S, id, simplified) {
    try {
        var out = tXml(S, {
            attrValue: id,
            simplify: simplified
        });
        return simplified ? out : out[0];
    } catch (e) {
        console.error(e);
        return null;
    }
};

tXml.getElementsByClassName = function (S, classname, simplified) {
    try {
        return tXml(S, {
            attrName: "class",
            attrValue: "[a-zA-Z0-9-s ]*" + classname + "[a-zA-Z0-9-s ]*",
            simplify: simplified
        });
    } catch (e) {
        console.error(e);
        return null;
    }
};

// NOTE: Added
tXml.getElementsByAttribute = function (S, attr_name, attr_value, simplified) {
    try {
        return tXml(S, {
            attrName: attr_name,
            attrValue: "[a-zA-Z0-9-s ]*" + attr_value + "[a-zA-Z0-9-s ]*",
            simplify: simplified
        });
    } catch (e) {
        console.error(e);
        return null;
    }
};

// NOTE: Added
tXml.getObjectValue = function (deep_object, path_string) {
    try {
        var accessor = new Function("object", "return object."+path_string+";");
        return accessor(deep_object, path_string) || null;
    } catch (e) {
        return null;
    }
};
`;

    const b = new Blob([scriptText], { type: 'text/javascript' });
    const u = URL.createObjectURL(b);
    const s = document.createElement('script');
    s.src = u;
    get('head').appendChild(s);
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
    while (el.parentElement) {
      parentNode = el.parentElement;
      path = `children[${this.findIndex(parentNode, el)}]${path ? '.' + path : ''}`;
      if (parentNode.nodeName.toLowerCase() === 'body') break;
      el = parentNode;
    }

    return `[1].${path}`;
  },
  findIndex: function(p, el) {
    const childNodes = Array.from(p.childNodes);

    for (let i = 0; i < childNodes.length; i++) {
      if (childNodes[i].isSameNode(el)) {
        return i;
      }
    }
    throw new Error("can't find element index");
  },
  testTxmlPath(result) {
    // const parsed = new tXml(document.documentElement.innerHTML);
    for (const selection of result.data) {
      for (const key in selection) {
        if (object.hasOwnProperty(key)) {
          console.log(key, object[key]);
          // if (!propertyGetter(parsed, selection[key])) {
          //   throw new Error(`tXml path for ${key} isn't correct!!`);
          // }
        }
      }
    }
  },
  generateJSON: function() {
    const result = this.grepJSONData();
    const fileName = this.getProjectName();
    // this.testTxmlPath(result);
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
