/**
 * 🚫 Extension Blocker - Prevents browser extensions from injecting scripts
 * This script must be loaded in the <head> section before any other scripts
 */

// Immediately invoked function expression (IIFE) to create a private scope
(function() {
    'use strict';

    // Store original methods
    const originalCreateElement = document.createElement;
    const originalQuerySelector = document.querySelector;
    const originalQuerySelectorAll = document.querySelectorAll;
    const originalGetElementsByTagName = document.getElementsByTagName;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalSetAttribute = Element.prototype.setAttribute;

    // Block patterns for extension scripts
    const BLOCKED_PATTERNS = [
        'injection-',
        'bundle-simple',
        'content-script',
        'tss-',
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        'extensions::',
        'extensionScripts',
        'extensionScripts_',
        'extensionScripts.'
    ];

    // Check if a URL should be blocked
    function shouldBlock(src) {
        if (!src) return false;
        return BLOCKED_PATTERNS.some(pattern => 
            src.toString().toLowerCase().includes(pattern.toLowerCase())
        );
    }

    // Override document.createElement
    document.createElement = function(tagName) {
        const element = originalCreateElement.apply(this, arguments);
        
        if (tagName.toLowerCase() === 'script') {
            // Intercept setAttribute calls on script elements
            const originalSetAttribute = element.setAttribute.bind(element);
            element.setAttribute = function(name, value) {
                if (name.toLowerCase() === 'src' && shouldBlock(value)) {
                    console.log('🚫 Blocked script from loading:', value);
                    return; // Block setting the src attribute
                }
                return originalSetAttribute.call(this, name, value);
            };
            
            // Intercept direct property assignment
            Object.defineProperty(element, 'src', {
                set: function(value) {
                    if (shouldBlock(value)) {
                        console.log('🚫 Blocked script src assignment:', value);
                        return; // Block setting the src property
                    }
                    this.setAttribute('src', value);
                },
                get: function() {
                    return this.getAttribute('src');
                }
            });
        }
        
        return element;
    };

    // Override Node.prototype.appendChild
    Node.prototype.appendChild = function(node) {
        if (node.tagName && node.tagName.toLowerCase() === 'script') {
            if (node.src && shouldBlock(node.src)) {
                console.log('🚫 Blocked script append:', node.src);
                return node; // Return the node without appending it
            }
            
            // Check inline scripts
            if (node.textContent && shouldBlock(node.textContent)) {
                console.log('🚫 Blocked inline script');
                return node; // Return the node without appending it
            }
        }
        return originalAppendChild.apply(this, arguments);
    };

    // Override Node.prototype.insertBefore
    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode.tagName && newNode.tagName.toLowerCase() === 'script') {
            if (newNode.src && shouldBlock(newNode.src)) {
                console.log('🚫 Blocked script insert:', newNode.src);
                return newNode; // Return the node without inserting it
            }
            
            // Check inline scripts
            if (newNode.textContent && shouldBlock(newNode.textContent)) {
                console.log('🚫 Blocked inline script on insert');
                return newNode; // Return the node without inserting it
            }
        }
        return originalInsertBefore.apply(this, arguments);
    };

    // Override Element.prototype.setAttribute
    Element.prototype.setAttribute = function(name, value) {
        if (this.tagName && this.tagName.toLowerCase() === 'script' && 
            name.toLowerCase() === 'src' && shouldBlock(value)) {
            console.log('🚫 Blocked script src set:', value);
            return; // Block setting the src attribute
        }
        return originalSetAttribute.apply(this, arguments);
    };

    // Block dynamic script evaluation
    const originalEval = window.eval;
    window.eval = function() {
        const stack = new Error().stack;
        if (stack.includes('extensions::') || 
            stack.includes('chrome-extension://') ||
            stack.includes('moz-extension://') ||
            stack.includes('safari-extension://')) {
            console.log('🚫 Blocked eval from extension');
            return undefined;
        }
        return originalEval.apply(this, arguments);
    };

    // Block Function constructor
    const originalFunction = window.Function;
    window.Function = function() {
        const stack = new Error().stack;
        if (stack.includes('extensions::') || 
            stack.includes('chrome-extension://') ||
            stack.includes('moz-extension://') ||
            stack.includes('safari-extension://')) {
            console.log('🚫 Blocked Function constructor from extension');
            return function(){}; // Return empty function
        }
        return originalFunction.apply(this, arguments);
    };

    // Block script text content
    const originalCreateTextNode = document.createTextNode;
    document.createTextNode = function(text) {
        if (typeof text === 'string' && shouldBlock(text)) {
            console.log('🚫 Blocked suspicious script content');
            return originalCreateTextNode('');
        }
        return originalCreateTextNode(text);
    };

    // Block dynamic imports from extensions
    const originalImport = window.importScripts;
    if (window.importScripts) {
        window.importScripts = function() {
            const stack = new Error().stack;
            if (stack.includes('extensions::') || 
                stack.includes('chrome-extension://') ||
                stack.includes('moz-extension://') ||
                stack.includes('safari-extension://')) {
                console.log('🚫 Blocked importScripts from extension');
                return;
            }
            return originalImport.apply(this, arguments);
        };
    }

    // Block WebSocket connections from extensions
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function() {
        const url = arguments[0];
        if (url && (url.includes('chrome-extension://') || 
                   url.includes('moz-extension://') ||
                   url.includes('safari-extension://'))) {
            console.log('🚫 Blocked WebSocket connection to extension');
            throw new Error('WebSocket connection to extensions is not allowed');
        }
        return new originalWebSocket(...arguments);
    };

    console.log('🛡️ Extension blocker active');
})();
