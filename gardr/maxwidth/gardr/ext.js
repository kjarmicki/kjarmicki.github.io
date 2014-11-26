!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gardrExt=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var computedStyle = _dereq_('computed-style');

var CLIPPING_OVERFLOW_VALUES = ['scroll', 'hidden', 'auto', 'overlay'];
var FILTER_POSITION_VALUES = ['absolute', 'fixed'];

var rectStore = null;

function toArray (thing) {
    return Array.prototype.slice.call(thing);
}

function filterChildren (children) {

    return toArray(children).filter(function (child) {
        var position = computedStyle(child, 'position');
        child._rect = child.getBoundingClientRect(); // store rect for later

        return (
            FILTER_POSITION_VALUES.indexOf(position) === -1 &&
            !(child._rect.width === 0 && child._rect.height === 0)
        );
    });

}

var storeNodeRect = function (node) {

    var children = filterChildren(node.children);
    var overflow = computedStyle(node, 'overflow');

    if (rectStore === null) {
        rectStore = {
            top: node._rect.top,
            right: node._rect.right,
            bottom: node._rect.bottom,
            left: node._rect.left
        };
    }

    rectStore.top       = Math.min(rectStore.top, node._rect.top);
    rectStore.right     = Math.max(rectStore.right, node._rect.right);
    rectStore.bottom    = Math.max(rectStore.bottom, node._rect.bottom);
    rectStore.left      = Math.min(rectStore.left, node._rect.left);

    if (CLIPPING_OVERFLOW_VALUES.indexOf(overflow) === -1) {
        children.forEach(function (el) {
            storeNodeRect(el);
        });
    }

};

function run (baseNode) {

    if (!baseNode) {
        return;
    }

    // reset
    rectStore = null;
    
    filterChildren(baseNode.children).forEach(function (el) {
        storeNodeRect(el);
    });

    return {
        width: rectStore ? rectStore.right - rectStore.left : 0,
        height: rectStore ? rectStore.bottom - rectStore.top : 0
    };
}

module.exports = run;

},{"computed-style":9}],2:[function(_dereq_,module,exports){
var xde = _dereq_('cross-domain-events');
var extend = _dereq_('util-extend');

function rendered (posId, targetWindow, opts) {
    xde.sendTo(targetWindow, 'rendered', extend(opts || {}, {id: posId}));
}

function comClient (posId, targetWindow, origin) {
    if (typeof targetWindow !== 'object' || !window.postMessage) {
        throw new Error('targetWindow must be a Window object');
    }

    if (typeof origin !== 'string') {
        throw new Error('origin must be a string');
    }

    xde.targetOrigin = origin;
    return {
        rendered : rendered.bind(null, posId, targetWindow)
    };
}

comClient._setXde = function (_xde) {
    xde = _xde;
};


module.exports = comClient;

},{"cross-domain-events":10,"util-extend":16}],3:[function(_dereq_,module,exports){
(function (global){
/* jshint evil: true */
var comClient   = _dereq_('./comClient.js');
var getAppender = _dereq_('./log/getAppender.js');
var logger      = _dereq_('./log/logger.js');
var eventListener = _dereq_('eventlistener');
var childrenSize  = _dereq_('./childrensize.js');
var pluginCore   = _dereq_('gardr-core-plugin');
var defineOpts   = _dereq_('define-options');
var extend       = _dereq_('util-extend');

var defaultOpts = {
    allowedDomains: []
};

var rDomainName = /^[a-zA-Z0-9.-]+$/;
function isDomainValid (domainName) {
    if (!rDomainName.test(domainName)) {
        throw new Error('allowedDomains should only contain the hostname. Invalid domain: ' + domainName);
    }
}

function readParams (allowedDomains) {
    // Params are passed as a JSON in the url fragment by default. IE has a limit for URLs longer than 2083 bytes, so
    // fallback to iframe.name if there is no url fragment.
    // We can't only rely on iframe.name because WebViews from native apps don't use an iframe, and it's currently no
    // easy way to define window.name synchronously before the document is loaded on iOS.

    // Don't use location.hash until Firefox fixes this bug: https://bugzilla.mozilla.org/show_bug.cgi?id=483304
    var urlFragment = decodeURIComponent(document.location.href.split('#')[1]);
    var params = JSON.parse(urlFragment || window.name);
    checkAllowedDomains(allowedDomains, params);
    return params;
}

function checkAllowedDomains (allowedDomains, params) {
    var a=document.createElement('a');
    a.href=params.url;
    if (a.protocol.indexOf('http') === -1) {
        throw new Error('url protocol is ' + a.protocol.replace(':','') + ', but have to be http/https');
    }
    var sameDomain = (!a.hostname || a.hostname == location.hostname);
    if (!sameDomain && allowedDomains.indexOf(a.hostname) == -1) {
        throw new Error('Script ' + params.url + ' is not on a allowed domain.');
    }
}

var validate = defineOpts({
    allowedDomains : '?|string[] - Required array with allowed domains'
});
function validateOpts (options) {
    validate(options);
    options.allowedDomains.forEach(isDomainValid);
}

var bootStrap = function (options) {
    options =  extend(extend({}, defaultOpts), options);
    validateOpts(options);
    var gardr = global.gardr = {};
    var pluginApi = new pluginCore.PluginApi();

    gardr.params = readParams(options.allowedDomains);
    pluginCore.pluginHandler.initPlugins(pluginApi, options);

    pluginApi.trigger('params:parsed', gardr.params);
    gardr.id = gardr.params.id;

    gardr.log = logger.create(gardr.id, gardr.params.loglevel, getAppender(gardr.params.logto));

    // TODO requestAnimationFrame polyfill

    gardr.log.debug('Loading url: ' + gardr.params.url);

    document.write(['<div id="gardr"><scr', 'ipt src="', gardr.params.url, '" ></scr', 'ipt></div>'].join(''));

    gardr.container = document.getElementById('gardr');
    gardr.container.style.overflow = 'hidden'; // avoid iOS Safari bug http://stackoverflow.com/q/6721310
    pluginApi.trigger('element:containercreated', gardr.container);

    var com = comClient(gardr.id, window.parent, gardr.params.origin);
    eventListener.add(global, 'load', function () {
        // phantomjs doesn't calculate sizes correctly unless we give it a break
        setTimeout(function () {
            var size = childrenSize(gardr.container);
            pluginApi.trigger('banner:rendered', size);
            com.rendered(size);
        }, 0);
    });
};

bootStrap._setComClient = function (client) {
    comClient = client;
};

bootStrap.plugin = function (plugin) {
    pluginCore.pluginHandler.register(plugin);
};

module.exports = bootStrap;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./childrensize.js":1,"./comClient.js":2,"./log/getAppender.js":6,"./log/logger.js":7,"define-options":11,"eventlistener":12,"gardr-core-plugin":14,"util-extend":16}],4:[function(_dereq_,module,exports){
var insertCSS = _dereq_('../../style/insertCss.js');
var outDiv = null;
var startTime = new Date().getTime();
var OUTPUT_ID = 'logoutput';

function addOutDivToBody () {
    if (document.body) {
        document.body.appendChild(outDiv);
    } else {
        setTimeout(addOutDivToBody, 0);
    }
}

function generateCSS() {
    var rules = [
        ['{',
            'position:absolute',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'overflow:scroll',
            'padding:10px',
            'opacity:0.8',
            'background-color:black',
            'color:white',
            'font-family:monospace',
            'font-weight:bold',
            'font-size:10px',
            'z-index:9999',
            'white-space:nowrap',
            'border:5px solid transparent',
            'box-sizing:border-box',
            'background-clip:padding-box',
            'border-radius:10px',
        '}'].join(';'),
        '.info {color:blue}',
        '.warn {color:orange}',
        '.error {color:red}'
    ].map(function (rule) {
        return ['#',OUTPUT_ID,' ',rule].join('');
    });
    insertCSS(rules.join('\n'));
}

function createOverlay () {
    var div = document.createElement('div');
    div.id = OUTPUT_ID;
    return div;
}

var levelToText = {
    1: 'ERROR',
    2: 'WARN',
    3: 'INFO',
    4: 'DEBUG'
};
function logMessage (logObj) {
    var level = levelToText[logObj.level];
    var scriptErr = (logObj.url && logObj.line);
    var out = [
        '<span class="' + level.toLowerCase() + '">',
        '<span class="time">', (logObj.time - startTime), ' ms</span>',
        levelToText[logObj.level],
        logObj.msg
    ];

    if (scriptErr) {
        out.push.call(out, '<a href="'+logObj.url+'" target="_blank" class="script">',
            logObj.url+':'+logObj.line, '</a>');
    }
    out.push('</span>');
    return out.join(' ');
}

var timer = null;
var docFrag = null;
function appendLogMessage (el) {
    clearTimeout(timer);
    docFrag = docFrag || document.createDocumentFragment();
    docFrag.appendChild(el);
    timer = setTimeout(function () {
        outDiv.appendChild(docFrag);
        docFrag = null;
    }, 50);
}

function logOut (logObj) {
    if (!outDiv) {
        outDiv = createOverlay();
        insertCSS(generateCSS());
        addOutDivToBody();
    }
    var div = document.createElement('div');
    div.innerHTML = logMessage(logObj);
    appendLogMessage(div);
}

logOut.reset = function () {
    clearTimeout(timer);
    if (outDiv) {
        if (outDiv.parentElement) {
            outDiv.parentElement.removeChild(outDiv);
        }
        outDiv = null;
    }
    if (docFrag) {
        docFrag = null;
    }
};

module.exports = logOut;
},{"../../style/insertCss.js":8}],5:[function(_dereq_,module,exports){
(function (global){
var levelToText = {
    1: 'ERROR',
    2: 'WARN',
    3: 'INFO',
    4: 'DEBUG'
};
function log (logObj) {
	var level = levelToText[logObj.level];
	var str = [
		logObj.name,
        (logObj.time),
        level,
        logObj.msg,
    ].join(' ');
    global.console.log(str);
}

module.exports = log;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(_dereq_,module,exports){
var consoleAppender = _dereq_('./appender/console.js');
var bannerAppender = _dereq_('./appender/banner.js');

module.exports = function (logTo) {
	return (logTo === 'console' ? consoleAppender : bannerAppender);
};
},{"./appender/banner.js":4,"./appender/console.js":5}],7:[function(_dereq_,module,exports){
/* jshint noarg:false */
var extend = _dereq_('util-extend');
var eventListener = _dereq_('eventlistener');
var CALLSTACK_MAX_DEPTH = 10;
var FN_NAME_REGEX = /function ([\w\d\-_]+)\s*\(/;

function getName(f) {
    return f.name || (FN_NAME_REGEX.test(f.toString()) ? RegExp.$1 : '{anonymous}');
}

function makeLogFn (out, name) {
    return function (level) {
        return function (objOrMsg) {
            if (typeof objOrMsg === 'string') {
                objOrMsg = {msg: objOrMsg};
            }
            out( extend({
                level: level,
                name: name,
                time: new Date().getTime()
            }, objOrMsg) );
        };
    };
}

function retrieveErrorData (evt, caller) {
    var output = {
        msg: evt.message,
        url: evt.filename,
        line: evt.lineno,
        stack: []
    };
    try {
        var i = CALLSTACK_MAX_DEPTH;
        while (caller && i--) {
            output.stack.push(getName(caller));
            caller = caller.caller;
        }
    } catch (e) {}
    return output;
}

function create(name, strLevel, out) {
	var level = parseInt(strLevel || '0', 10);
    var log = makeLogFn(out, name);
    var noop = function () {};
    var logInstance = {
        level: level,
        error:  (level >= 1 ? log(1) : noop),
        warn:   (level >= 2 ? log(2) : noop),
        info:   (level >= 3 ? log(3) : noop),
        debug:  (level >= 4 ? log(4) : noop),
    };

    if (level > 0) {
        eventListener.add(window, 'error', function (e) {
            var caller = arguments.callee && arguments.callee.caller;
            logInstance.error( retrieveErrorData(e, caller) );
        }, false);
    }
    
    return logInstance;
}

module.exports = {
	create: create
};
},{"eventlistener":12,"util-extend":16}],8:[function(_dereq_,module,exports){
module.exports = function(css) {
    var head = document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
};

},{}],9:[function(_dereq_,module,exports){
// This code has been refactored for 140 bytes
// You can see the original here: https://github.com/twolfson/computedStyle/blob/04cd1da2e30fa45844f95f5cb1ac898e9b9ef050/lib/computedStyle.js
var computedStyle = function (el, prop, getComputedStyle) {
  getComputedStyle = window.getComputedStyle;

  // In one fell swoop
  return (
    // If we have getComputedStyle
    getComputedStyle ?
      // Query it
      // TODO: From CSS-Query notes, we might need (node, null) for FF
      getComputedStyle(el) :

    // Otherwise, we are in IE and use currentStyle
      el.currentStyle
  )[
    // Switch to camelCase for CSSOM
    // DEV: Grabbed from jQuery
    // https://github.com/jquery/jquery/blob/1.9-stable/src/css.js#L191-L194
    // https://github.com/jquery/jquery/blob/1.9-stable/src/core.js#L593-L597
    prop.replace(/-(\w)/gi, function (word, letter) {
      return letter.toUpperCase()
    })
  ]
}

module.exports = computedStyle;
},{}],10:[function(_dereq_,module,exports){
(function (win, events) {
    var DEFAULT_ORIGIN = '*';
    var xde, eventListeners;
    var onlyStrings;

    function onMessage(evt) {
        var parsedData;

        if (xde.targetOrigin != DEFAULT_ORIGIN && evt.origin !== xde.targetOrigin) {
            return;
        }

        parsedData = evt.data;
        if (typeof evt.data == 'string') {
            try {
                parsedData = JSON.parse(evt.data);
            } catch (e) {}
        }

        if (!parsedData || parsedData.__xde !== true) {
            return;
        }

        parsedData.origin = evt.origin;
        parsedData.source = evt.source;

        var listeners = eventListeners[parsedData.name];
        if (listeners && listeners.length > 0) {
            listeners.forEach(function(fn){
                fn(parsedData);
            });
        }
    }

    function validateName (name) {
        if (!name || typeof name != 'string') { throw new Error('Event name has to be a string'); };
    }

    function validateNameAndFn (name, fn) {
        validateName(name);
        if (typeof fn != "function" ) { throw new Error('Callback function has to be given'); }
    }

    xde = {
        on: function (name, fn) {
            validateNameAndFn(name, fn);

            if (typeof eventListeners[name] == 'undefined') {
                eventListeners[name] = [];
            }
            eventListeners[name].push(fn);
        },

        off: function (name, fn) {
            validateNameAndFn(name, fn);
            var listeners = eventListeners[name];
            if (!listeners) {
                return;
            }
            eventListeners[name] = listeners.filter(function (listener) {
                return listener !== fn;
            });
        },

        sendTo: function (otherWindow, name, data) {
            validateName(name);
            try {
                if (otherWindow && otherWindow.contentWindow) {
                    otherWindow = otherWindow.contentWindow;
                }
            } catch(e) {}
            if ( !otherWindow || !otherWindow.postMessage ) {
                throw new TypeError('otherWindow does not support postMessage');
            }

            var msg = {
                name : name,
                data : data,
                __xde : true
            };
            if (onlyStrings) {
                msg = JSON.stringify(msg);
            }
            otherWindow.postMessage(msg, this.targetOrigin); // TODO fix security issue
        },

        targetOrigin: DEFAULT_ORIGIN,

        _reset: function (forceStringify) {
            eventListeners = {};
            this.targetOrigin = DEFAULT_ORIGIN;
            onlyStrings = forceStringify || false;
            try{win.postMessage({toString:function(){onlyStrings=true;}},"*");}catch(e){}
        }
    };

    xde._reset();
    events.add(window, 'message', onMessage, false);

    if(typeof exports === 'object') {
        module.exports = xde;
    } else {
        win.xde = xde;
    }
})(this, this.eventListener || _dereq_('eventlistener'));

},{"eventlistener":12}],11:[function(_dereq_,module,exports){
var is = {
    'array'    : function (a) { return Array.isArray(a); },
    'boolean'  : function (b) { return typeof b == 'boolean' || b instanceof Boolean; },
    'function' : function (f) { return typeof f == 'function'; },
    'number'   : function (n) { return !isNaN(n) && (typeof n == 'number' || n instanceof Number); },
    'object'   : function (o) { return typeof o == 'object'; },
    'string'   : function (s) { return typeof s == 'string' || s instanceof String; },
    '?'        : function (v) { return v == null; },
    '*'        : function () { return true; }
};
var rArrayWithType = /[a-z]+\[\]$/;
var rDocString = /\s*-\s*/;

module.exports = function (def, required) {
    Object.keys(def).forEach(function (key) {
        var type = def[key].split(rDocString)[0];
        type.split('|').forEach(function (type) {
            if (!(type.replace('[]','') in is)) {
                throw new Error('Invalid type: \'' + type + '\'');
            }
        });
    });

    return function validateOpts (opts) {
        var keys = Object.keys(def);
        opts = opts || {};
        keys.forEach(validateKey);


        function validateKey (key) {
            var typeDef = def[key].split(rDocString);
            validateType(key, opts[key], typeDef[0], typeDef[1]);
        }

        function validateType (key, value, shouldBe, docString) {
            docString = (docString ? '. DOC: ' + docString : '');
            var correctType = shouldBe.split('|').some(function (type) {
                if (rArrayWithType.test(type)) {
                    type = type.replace('[]','');
                    return is.array(value) && value.every(function (v) { return is[type](v); });
                }
                return is[type](value);
            });
            if (correctType) { return; }
            if (value == null) {
                throw new TypeError(key + ' is required. Valid types: ' + shouldBe + docString);
            }
            throw new TypeError(key + ' has to be of type ' + shouldBe + ' but was ' + typeof value + docString);
        }
    };
};

},{}],12:[function(_dereq_,module,exports){
(function(root,factory){
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.eventListener = factory();
  }
}(this, function () {
	function wrap(standard, fallback) {
		return function (el, evtName, listener, useCapture) {
			if (el[standard]) {
				el[standard](evtName, listener, useCapture);
			} else if (el[fallback]) {
				el[fallback]('on' + evtName, listener);
			}
		}
	}

    return {
		add: wrap('addEventListener', 'attachEvent'),
		remove: wrap('removeEventListener', 'detachEvent')
	};
}));
},{}],13:[function(_dereq_,module,exports){
var data = {};
var i = 0;

function get (id, property) {
    if (data[id]) { return data[id][property]; }
}

function set (id, property, value) {
    data[id] = data[id] || {};
    data[id][property] = value;
}

function subscribe (id, subject, fn) {
    if (typeof id != 'number' && typeof subject != 'string' && typeof fn != 'function') {
        throw new Error('Invalid arguments');
    }
    var listeners = get(id, 'listeners');
    if (!listeners[subject]) {
        listeners[subject] = [];
    }
    listeners[subject].push(fn);
}

function publish (id, subject) {
    var subscribers = get(id, 'listeners')[subject];
    var args = Array.prototype.slice.call(arguments, 2);
    if (!subscribers) { return; }
    subscribers.forEach(function (fn) {
        fn.apply(null, args);
    });
}

var PluginApi = function () {
    this.id = i++;

    set(this.id, 'listeners', {});
    this.on      = subscribe.bind(null, this.id);
    this.trigger = publish.bind(null, this.id)

    this._reset = function () { set(this.id, 'listeners', {}); };
};

module.exports = PluginApi;

},{}],14:[function(_dereq_,module,exports){
module.exports = {
    PluginApi: _dereq_('./PluginApi.js'),
    pluginHandler: _dereq_('./pluginHandler.js')
};

},{"./PluginApi.js":13,"./pluginHandler.js":15}],15:[function(_dereq_,module,exports){
var plugins = [];

module.exports = {
    register: function (plugin) {
        if (typeof plugin !== 'function') {
            throw new Error('Plugin has to be a function');
        }
        plugins.push(plugin);
    },

    initPlugins : function (pluginApi, options) {
        if (!pluginApi) {
            throw new Error('Expected a PluginApi instance');
        }
        delete pluginApi._reset;
        if (Object.freeze) { Object.freeze(pluginApi); }
        plugins.forEach(function (plugin) {
            plugin(pluginApi, options || {});
        });
    },

    _reset: function () {
        plugins.length = 0;
    }
};

},{}],16:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = extend;
function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || typeof add !== 'object') return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

},{}],17:[function(_dereq_,module,exports){
var gardrExt = _dereq_('gardr-ext');
gardrExt({
    allowedDomains: ['localhost', '127.0.0.1']
});

},{"gardr-ext":3}]},{},[17])
(17)
});