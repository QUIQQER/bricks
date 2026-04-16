define('package/quiqqer/bricks/bin/vendor/gridstack/GridStack', [
    'package/quiqqer/bricks/bin/vendor/gridstack/gridstack-all',
    'css!package/quiqqer/bricks/bin/vendor/gridstack/gridstack.min.css'
], function (GridStackModule) {
    "use strict";

    if (GridStackModule && GridStackModule.GridStack) {
        return GridStackModule.GridStack;
    }

    if (typeof window !== 'undefined' && window.GridStack) {
        return window.GridStack;
    }

    if (typeof self !== 'undefined' && self.GridStack) {
        return self.GridStack;
    }

    return GridStackModule;
});
