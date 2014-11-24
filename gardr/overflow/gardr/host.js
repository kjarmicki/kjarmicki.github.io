!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.gardrHost=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
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
},{}],2:[function(_dereq_,module,exports){
var VER = 1;
var TYPE = 'gardr';
var REFRESH_KEY = 'refresh-' + TYPE;
var FAILED_CLASS = TYPE + '-failed';

function validSize(v) {
    if (typeof v === 'string' && v.indexOf('px') !== -1) { return v; }
    if ( (typeof v === 'string' && v.indexOf('%') === -1) || typeof v === 'number') {
        return v + 'px';
    }
    return v;
}

function getOrigin(loc) {
    return loc.origin || (loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : ''));
}

function Iframe(id, options) {
    if (typeof id !== 'string' || !id) {
        throw new Error('Iframe missing id');
    }
    this.id = id;
    if (!options || typeof options.iframeUrl === 'undefined') {
        throw new Error('Iframe missing options and iframeUrl');
    }
    this.element = null;
    this.iframeUrl = options.iframeUrl;
    this.width = options.width || '100%';
    this.height = options.height || '100px';
    this.classes = options.classes || '';
    this.hidden = options.hidden;
    this.setData(options.data || {});
}

Iframe.prototype.remove = function() {
    this.wrapper.parentNode.removeChild(this.wrapper);
    this.wrapper = null;
    this.element = null;
    return this;
};

Iframe.prototype.resize = function(w, h) {
    if (w) { this.width = w; }
    if (h) { this.height = h; }
    this.element.style.width = validSize(this.width);
    this.element.style.height = validSize(this.height);
    return this;
};

Iframe.prototype.addFailedClass = function() {
    var val;
    if (this.wrapper && ((val = this.wrapper.className.indexOf()) === -1)) {
        this.wrapper.className = val + ' ' + FAILED_CLASS;
    }
};

Iframe.prototype.setData = function (data) {
    data.origin = getOrigin(document.location);
    data.id = this.id;
    this.data = data;
};

Iframe.prototype._getUrl = function(src) {
    var baseUrl = this.iframeUrl;
    if (typeof baseUrl != 'string') {
        throw new Error('iframeUrl must be a string');
    }
    var sep = baseUrl.indexOf('?') !== -1 ? '&' : '?';
    var refresh = src && src.indexOf(REFRESH_KEY) === -1 ? REFRESH_KEY + '=true&' : '';
    var params = JSON.stringify(this.data);
    var url = [
        baseUrl,
        sep,
        'ver=', VER,
        '&', refresh,
        '#', encodeURIComponent(params)
    ].join('');
    if (url.length >= 2083) {
        // IE has a limit for URLs longer than 2083 bytes, so fallback to iframe.name if the URL is too long
        url = url.split('#')[0];
        this.element.name = params;
    }
    return url;
};

Iframe.prototype.refresh = function () {
    this.element.src = this._getUrl(this.element.src);
};

Iframe.prototype._createIframeElement = function () {
    return document.createElement('iframe');
};

Iframe.prototype.makeIframe = function() {
    var wrapper = this.wrapper = document.createElement('div');
    var i = this.element = this._createIframeElement();
    var inner = document.createElement('div');
    var classes = [TYPE, TYPE + '-' + this.id];

    if (this.classes) {
        classes.push(this.classes);
    }
    if (this.hidden) {
        classes.push(TYPE + '-hidden');
        wrapper.style.display = 'none';
    }
    //wrapper.id = this.id;
    wrapper.className = (classes.join(' ')).toLowerCase();
    wrapper.setAttribute('data-' + TYPE, this.id);
    i.setAttribute('data-automation-id', this.id);
    i.src = this._getUrl();
    i.className = TYPE + '-iframe';
    // IE 7-8
    i.marginWidth = 0;
    i.marginHeight = 0;
    i.frameBorder = '0';
    i.allowTransparency = 'true';
    // Safari will will not show iframe until scroll with width/height == 0px
    //i.width = validSize(this.width);
    //i.height = this.height;
    i.style.width = validSize(this.width);
    i.style.height = validSize(this.height);
    i.style.border = '0';
    i.style.display = 'block';
    // stop scroll
    i.style.overflow = 'hidden';
    i.scrolling = 'no';



    inner.appendChild(i);
    inner.className = TYPE + '-inner';
    wrapper.appendChild(inner);
    return this;
};

module.exports = Iframe;

},{}],3:[function(_dereq_,module,exports){
var Manager = _dereq_('./manager.js');
var pluginHandler = _dereq_('gardr-core-plugin').pluginHandler;

module.exports = function (opts) {
    return new Manager(opts, pluginHandler);
};

module.exports.plugin = function (plugin) {
    pluginHandler.register(plugin);
};

},{"./manager.js":4,"gardr-core-plugin":8}],4:[function(_dereq_,module,exports){
(function (global){
/* jshint maxparams:4 */
'use strict';
var State = _dereq_('./state.js');
var extend = _dereq_('util-extend');
var Iframe = _dereq_('./iframe.js');
var PluginApi = _dereq_('gardr-core-plugin').PluginApi;
var xde = _dereq_('cross-domain-events');
var queryParams = _dereq_('query-params');
var eventListener = _dereq_('eventlistener');

var requiredOpts = ['iframeUrl'];


function getLogLevel(hash) {
    hash = hash || '';
    var params = queryParams.decode(hash.replace(/^#/, ''));
    if (params.loglevel) {
        return parseInt(params.loglevel, 10);
    }
    return 0;
}

function getLogTo(hash) {
    hash = hash || '';
    var params = queryParams.decode(hash.replace(/^#/, ''));
    return params.logto;
}

function addItemCallback (item, callback) {
    if (typeof callback != 'function') {
        return;
    }
    item._callbacks = item._callbacks || [];
    item._callbacks.push(callback);
}

function getItemCallbacks (item) {
    return item._callbacks || [];
}

function Manager(options, pluginHandler) {
    this.items = [];
    this.itemConfigs = {};

    options = options || {};
    this.callbacks = {};
    this.inject = {};

    this.flags = {};
    options.urlFragment = options.urlFragment || global.location.hash;
    this.logLevel = getLogLevel(options.urlFragment);
    this.logTo = getLogTo(options.urlFragment);

    if (this.logLevel > 0) {
        this.inject.loglevel=this.logLevel;
        if (this.logTo)  { this.inject.logto=this.logTo; }
    }

    requiredOpts.forEach(function (requiredOption) {
        if (!options[requiredOption]) { throw new Error('mising option for ' + requiredOption); }
        this[requiredOption] = options[requiredOption];
    }.bind(this));

    this.pluginApi = new PluginApi();
    pluginHandler.initPlugins(this.pluginApi, options);

    /*
        (ios-fix) backbutton cache buster, reload all ads.
    */

    eventListener.add(global, 'pageshow', function(e){
        if(e.persisted === true){
            /*
                TODO: Need to refactor lastOrder/priority to live in
                configuration instead, e.g. { name..., dependOn: ['top', 'top_ipad'] }
            */
            this.refreshAll(this.lastOrder);
        }
    }.bind(this), false);

    // this.sharedState = {};
    xde.on('rendered', function(msg) {
        var item = this._getById(msg.data.id);
        if (item) {
            item.rendered.width = msg.data.width;
            item.rendered.height = msg.data.height;
            this._resolve(item);
        }
    }.bind(this));
}
Manager._xde = xde;
Manager._Iframe = Iframe;
Manager._setIframe = function (newIframe) {
    Iframe = newIframe;
};

var proto = Manager.prototype;

proto.extendInframeData = function (o) {
    if (o) {
        extend(this.inject, o);
    }
};

proto._get = function (name) {
    return this.items.filter(function(item){
        return item.name === name;
    });
};

proto._getById = function(id) {
    for(var i=0, l=this.items.length; i<l; i++) {
        if (this.items[i].id === id) { return this.items[i]; }
    }
};

proto._getConfig = function (name) {
    return this.itemConfigs[name];
};

proto.config = function (name, configData) {
    this.itemConfigs[name] = configData || {};
};

/* Add data. "Queue" banner for render. */
proto.queue = function (name, obj) {
    var input = obj || {};
    if (!name) {
        throw new Error('Can\'t queue without a name');
    }
    var config = this._getConfig(name) || {};
    if (!config.container && !input.container) {
        //throw new Error('Can\'t queue without a container');
        input.container = document.body.appendChild( document.createElement('div') );
    }

    var item = State.create(name, extend( extend({}, config), input));
    this.items.push(item);
};

/* Insert iframe into page. */
proto.render = function (name, cb) {

    this._forEachWithName(name, function (item) {
        // Item has already been rendered
        if (item.isActive()) { return; }

        addItemCallback(item, cb);

        if (!item) {
            return this._failed(item, name + ' missing item');
        }
        if (!item.options.container || !item.options.url) {
            item.set(State.INCOMPLETE);
            return this._failed(item, name + ' missing queued config');
        }

        if (typeof item.options.container == 'string') {
            item.options.container = document.getElementById(item.options.container);
            if (!item.options.container) {
                return this._failed(item, name + ' missing container');
            }
        }

        this.pluginApi.trigger('item:beforerender', item);
        this.createIframe(item);

        item.set(State.ACTIVE);
        item.options.container.appendChild(item.iframe.wrapper);
    });
};

function commaStringToArray(list) {
    if (typeof list != 'string') {
        return [];
    }
    return list.split(',');
}

proto.renderAll = function(prioritized, cb) {
    if (typeof prioritized == 'function') {
        cb = prioritized;
        prioritized = undefined;
    }
    this.lastOrder = prioritized;

    var pri = commaStringToArray(prioritized);
    var loop = function () {
        if(pri.length > 0) {
            this.render(pri.shift(), function() {
                cb.apply(this, arguments);
                loop();
            });
        } else {
            this._renderUntouched(cb);
        }
    }.bind(this);

    loop();
};

proto._getItemData = function (item) {
    return extend(item.getData(), this.inject);
};

proto.createIframe = function (item) {
    if (!item.iframe) {
        // todo, check if actually iframe is on different domain
        item.iframe = new Iframe(item.id, {
            iframeUrl: this.iframeUrl,
            width: item.options.width,
            height: item.options.height,
            hidden: item.options.hidden,
            classes: '',
            data: this._getItemData(item)
        });

        item.iframe.makeIframe();
    }
};

proto._setCallback = function(name, cb) {
    var list = this.callbacks[name];
    if (!this.callbacks[name]) {
        list = this.callbacks[name] = [];
    }
    if (typeof cb == 'function') {
        list.push(cb);
    }
};

proto._runCallbacks = function(item, args) {
    var list = getItemCallbacks(item) || [];

    var length = list.length;
    while (length > 0) {
        list.shift().apply(global, args);
        length--;
    }
};

proto._resolve = function(item, error, ignoreNewState) {
    var type = 'done';
    if (error) { type = 'fail'; }

    if (item && ignoreNewState !== true) {
        item.rendered.times++;
        item.set(State.RESOLVED);
    }
    this.pluginApi.trigger('item:afterrender', item);
    if (item && typeof item.options[type] == 'function'){
        item.options[type](error, item);
    }
    if (item && item.isResolved() || error) {
        this._runCallbacks(item, [error, item]);
    }
};

proto._failed = function (item, message){
    if (item){
        item.set(State.FAILED);
    }
    this._resolve(item, new Error(message), true);
};

proto._checkResolvedStatus = function() {
    return this.items.every(function (item) {
        return item.isResolved();
    });
};

proto._forEachItem = function (fn) {
    this.items.forEach(fn.bind(this));
};

proto._forEachWithName = function (name, fn) {
    this._get(name).forEach(fn.bind(this));
};

proto._renderUntouched = function (cb) {
    this._forEachItem(function(item){
        if ( item.isActive() === false ){
            this.render(item.name, cb);
        }
    });
};

proto._refreshUntouched = function(cb) {
    this._forEachItem(function(item){
        if ( item.needsRefresh() === true ){
            this.refresh(item.name, cb);
        }
    });
};

proto.refresh = function(name, cb) {
    this._forEachWithName(name, function (item) {
        addItemCallback(item, cb);
        if (!item) { return cb(new Error('Missing config ' + name)); }
        if (item.isUsable()) {
            item.iframe.setData( this._getItemData(item) );
            item.set(State.REFRESHING);
            try{
                item.iframe.refresh();
            } catch(err){
                item.iframe = null;
                item.set(item.DESTROYED);
                // reset:
                this.render(name, cb);
            }
        } else {
            // todo: change to failed with master merge, + add test
            this._failed(item, 'item is not usable');
        }
    });
};

proto.refreshAll = function(prioritized, cb) {
    if (typeof prioritized == 'function') {
        cb = prioritized;
        prioritized = undefined;
    }

    this._forEachItem(function(item){
        item.set(State.NEEDS_REFRESH);
    });


    var pri = commaStringToArray(prioritized);
    var loop = function loop() {

        if(pri.length > 0) {
            this.refresh(pri.shift(), function() {
                cb.apply(this, arguments);
                loop();
            });
        } else {
            this._refreshUntouched(cb);
        }
    }.bind(this);
    loop();
};

module.exports = Manager;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./iframe.js":2,"./state.js":5,"cross-domain-events":6,"eventlistener":1,"gardr-core-plugin":8,"query-params":10,"util-extend":11}],5:[function(_dereq_,module,exports){
var extend = _dereq_('util-extend');
/*
    Banner state
        - communicated via manager via com.js
*/
var STATES = {
    CREATED: 0,
    REMOVED: 1,
    NEEDS_REFRESH: 2,
    DESTROYED: 3,

    ACTIVE: 10,
    REACTIVATED: 11,
    REFRESHING: 12,

    FAILED: 20,
    TIMED_OUT: 21,
    REJECTED: 22,
    /* NOT_VALID */
    INCOMPLETE: 23,
    /* RESIZED: 24, */

    RESOLVED: 30
};

var DEFAULTS = {
    state       : STATES.CREATED,
    name        : null,
    iframe      : null,
    options     : null,
    _callbacks  : null,
    rendered    : null
};

var DEFAULT_OPTIONS = {
    done        : null,
    url         : null,
    width       : null,
    height      : null,
    container   : null,
    retries     : 5,
    timeout     : 200,
    minSize     : 39,
    hidden      : false
};

var RENDERED = {
    times   : 0,
    width   : null,
    height  : null
};

var UNIQUE_TOKEN_REGEX = /(GARDR|PASTIES)_UNIQUE_ID/;
var uniqueCount = 0;

function State(name, options) {
    extend(this, DEFAULTS);
    this.rendered = extend({}, RENDERED);
    this.options = extend(extend({}, DEFAULT_OPTIONS), options);

    this.name = name;
    this.id = name + (++uniqueCount);
}

extend(State, STATES);
var proto = State.prototype;

proto.isActive = function() {
    return this.state >= 10;
};

proto.isResolved = function() {
    return this.state >= 30;
};

proto.isUsable = function() {
    return this.state !== State.REJECTED && this.state !== State.INCOMPLETE;
};

proto.needsRefresh = function () {
    return this.state === State.NEEDS_REFRESH;
};

var FAILED_MAX =  29;
proto.hasFailed = function(){
    return this.isActive() && this.state >= State.FAILED && this.state <= FAILED_MAX;
};

proto.set = function(input) {
    this.lastState = this.state;
    this.state = (typeof input == 'number') ? input : State[input];
};

proto.getData = function() {

    var url = this.options.url;
    // We cannot use a global regex because of this bug:
    // // http://stackoverflow.com/questions/3827456/what-is-wrong-with-my-date-regex/3827500#3827500
    while (url && UNIQUE_TOKEN_REGEX.test(url)) {
        url = url.replace(UNIQUE_TOKEN_REGEX, '' + new Date().getTime() + (this.id));
    }

    return {
        name: this.name,
        minSize: this.options.minSize,
        timeout: this.options.timeout,
        url: url,
        width: this.options.width,
        height: this.options.height
    };
};

State.create = function(name, options) {
    return new State(name, options);
};

State._UNIQUE_TOKEN_REGEX = UNIQUE_TOKEN_REGEX;

module.exports = State;

},{"util-extend":11}],6:[function(_dereq_,module,exports){
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

},{"eventlistener":1}],7:[function(_dereq_,module,exports){
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

},{}],8:[function(_dereq_,module,exports){
module.exports = {
    PluginApi: _dereq_('./PluginApi.js'),
    pluginHandler: _dereq_('./pluginHandler.js')
};

},{"./PluginApi.js":7,"./pluginHandler.js":9}],9:[function(_dereq_,module,exports){
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

},{}],10:[function(_dereq_,module,exports){
function encode (o, sep) {
    var list = [];
    var key;
    for (key in o) {
        if (o[key] != null && typeof o[key] != 'object' &&
                typeof o[key] != 'function') {
            list.push(encodeURIComponent(key) + '=' + encodeURIComponent(o[key]));
        }
    }
    return list.join(sep || '&');
}

var REXP_SPLIT = /&amp;|&|;/gmi;
function decode (str, sep) {
    sep = sep||REXP_SPLIT;
    var result = {};
    var expr = str.split(sep);
    var key, val, index;
    for (var i = 0, len = expr.length; i < len; i++) {
        index = expr[i].indexOf('=');
        key = expr[i].substring(0, index);
        val = expr[i].substring(index+1);
        if (val) {
            result[decodeURIComponent(key)] = decodeURIComponent(val);
        }
    }
    return result;
};

module.exports = {
    encode: encode,
    decode: decode
};
},{}],11:[function(_dereq_,module,exports){
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

},{}],12:[function(_dereq_,module,exports){
var gardrHost = _dereq_('gardr-host');
module.exports = gardrHost;

},{"gardr-host":3}]},{},[12])
(12)
});