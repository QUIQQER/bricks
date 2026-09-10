/** Opt-in preparation for content windows that know their natural height. */
define('package/quiqqer/bricks/bin/Controls/WindowContentReveal', [], function () {
    'use strict';

    const registeredBricks = new Set();

    return {
        registerBrick: function (brickId) {
            brickId = Number(brickId);

            if (brickId > 0) {
                registeredBricks.add(brickId);
            }
        },

        shouldPrepare: function (brickId) {
            brickId = Number(brickId);

            if (registeredBricks.has(brickId)) {
                return true;
            }

            return brickId > 0 && document.querySelector(
                '[data-open-brick-id="' + brickId + '"][data-window-auto-height="1"]'
            ) !== null;
        },

        prepare: async function (win, loadContent) {
            const opener = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            const previousBusy = opener?.getAttribute('aria-busy') ?? null;
            const previousCursor = opener?.style.cursor ?? '';
            const elm = win.create();
            const previousVisibility = elm.style.visibility;

            if (opener) {
                opener.setAttribute('aria-busy', 'true');
                opener.style.cursor = 'progress';
            }

            win.setAttribute('contentPending', true);
            elm.style.position = 'fixed';
            elm.style.top = '0';
            elm.style.width = win.getOpeningWidth() + 'px';
            elm.style.visibility = 'hidden';
            win.inject(document.body);

            try {
                await loadContent();
                await document.fonts.ready;
                win.fireEvent('contentReady', [win]);
            } finally {
                win.setAttribute('contentPending', false);
                elm.style.visibility = previousVisibility;

                if (opener) {
                    if (previousBusy === null) {
                        opener.removeAttribute('aria-busy');
                    } else {
                        opener.setAttribute('aria-busy', previousBusy);
                    }

                    opener.style.cursor = previousCursor;
                }
            }
        }
    };
});
