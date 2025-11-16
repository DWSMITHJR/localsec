// This script is injected directly into the HTML to block extensions before anything else loads
(function() {
    'use strict';

    // Block script elements
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.apply(this, arguments);
        if (tagName.toLowerCase() === 'script') {
            const originalSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
            Object.defineProperty(element, 'src', {
                get: function() { 
                    return originalSrc.get.call(this);
                },
                set: function(value) {
                    if (value && (
                        value.includes('bundle-simple.js') || 
                        value.includes('injection-') ||
                        value.includes('content-script')
                    )) {
                        console.log('🚫 Blocked script:', value);
                        return; // Block setting src
                    }
                    originalSrc.set.call(this, value);
                }
            });
        }
        return element;
    };

    // Block dynamic script evaluation
    window.eval = new Proxy(window.eval, {
        apply(target, thisArg, args) {
            if (args[0] && args[0].includes('bundle-simple')) {
                console.log('🚫 Blocked eval of bundle-simple');
                return null;
            }
            return target.apply(thisArg, args);
        }
    });

    // Block Function constructor
    window.Function = new Proxy(window.Function, {
        apply(target, thisArg, args) {
            const code = args[args.length - 1];
            if (typeof code === 'string' && code.includes('bundle-simple')) {
                console.log('🚫 Blocked Function constructor with bundle-simple');
                return function(){};
            }
            return target.apply(thisArg, args);
        }
    });

    console.log('🛡️ Early extension blocker active');
})();
