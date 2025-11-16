/**
 * 🚫 EXTENSION BLOCKER - Prevents browser extensions from injecting scripts
 * This script must be loaded BEFORE any other scripts in the <head> section
 */

(function() {
    'use strict';

    // Store original methods
    const originalCreateElement = document.createElement;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalSetAttribute = Element.prototype.setAttribute;

    // Block extension scripts
    function isExtensionScript(src) {
        if (!src) return false;
        return (
            src.includes('chrome-extension://') ||
            src.includes('moz-extension://') ||
            src.includes('safari-extension://') ||
            src.includes('injection-') ||
            src.includes('content-script') ||
            src.includes('bundle-simple')
        );
    }

    // Override createElement to block script creation
    document.createElement = function(tagName) {
        const element = originalCreateElement.apply(this, arguments);
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute.bind(element);
            element.setAttribute = function(name, value) {
                if (name.toLowerCase() === 'src' && isExtensionScript(value)) {
                    console.log('🚫 Blocked extension script:', value);
                    return; // Block setting src for extension scripts
                }
                return originalSetAttribute(name, value);
            };
        }
        return element;
    };

    // Override appendChild to block script injection
    Node.prototype.appendChild = function(node) {
        if (node.tagName && node.tagName.toLowerCase() === 'script') {
            if (node.src && isExtensionScript(node.src)) {
                console.log('🚫 Blocked extension script injection:', node.src);
                return node; // Return the node without appending
            }
        }
        return originalAppendChild.apply(this, arguments);
    };

    // Override insertBefore to block script injection
    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode.tagName && newNode.tagName.toLowerCase() === 'script') {
            if (newNode.src && isExtensionScript(newNode.src)) {
                console.log('🚫 Blocked extension script insertion:', newNode.src);
                return newNode; // Return the node without inserting
            }
        }
        return originalInsertBefore.apply(this, arguments);
    };

    // Override setAttribute to block script src setting
    Element.prototype.setAttribute = function(name, value) {
        if (this.tagName && this.tagName.toLowerCase() === 'script' && 
            name.toLowerCase() === 'src' && isExtensionScript(value)) {
            console.log('🚫 Blocked extension script src:', value);
            return; // Block setting src for extension scripts
        }
        return originalSetAttribute.apply(this, arguments);
    };

    // Block mutation observers used by some extensions
    const originalObserve = MutationObserver.prototype.observe;
    MutationObserver.prototype.observe = function(target, options) {
        if (options && options.childList) {
            const originalCallback = this.callback || this._callback;
            this.callback = this._callback = function(mutations) {
                mutations = mutations.filter(mutation => {
                    return !Array.from(mutation.addedNodes).some(node => 
                        node.tagName && 
                        node.tagName.toLowerCase() === 'script' && 
                        node.src && 
                        isExtensionScript(node.src)
                    );
                });
                if (mutations.length > 0) {
                    return originalCallback.call(this, mutations, this);
                }
            };
        }
        return originalObserve.call(this, target, options);
    };

    // Block dynamic script evaluation
    const originalEval = window.eval;
    window.eval = function() {
        const stack = new Error().stack;
        if (stack.includes('extensions::') || stack.includes('chrome-extension://')) {
            console.log('🚫 Blocked extension eval');
            return undefined;
        }
        return originalEval.apply(this, arguments);
    };

    // Block Function constructor
    const originalFunction = window.Function;
    window.Function = function() {
        const stack = new Error().stack;
        if (stack.includes('extensions::') || stack.includes('chrome-extension://')) {
            console.log('🚫 Blocked extension Function constructor');
            return function(){}; // Return empty function
        }
        return originalFunction.apply(this, arguments);
    };

    // Block script text content
    const originalCreateTextNode = document.createTextNode;
    document.createTextNode = function(text) {
        if (typeof text === 'string' && 
            (text.includes('injection-') || 
             text.includes('contentScript') || 
             text.includes('browser-extension'))) {
            console.log('🚫 Blocked suspicious script content');
            return originalCreateTextNode('');
        }
        return originalCreateTextNode(text);
    };

    console.log('🛡️ Extension blocker active');
})();
