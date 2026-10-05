/** Opt-in preparation for content windows that know their natural height. */
define('package/quiqqer/bricks/bin/Controls/WindowContentReveal', ['Locale'], function (Locale) {
    'use strict';

    const registeredBricks = new Set();

    return {
        /** Open immediately unless preparation was explicitly requested. */
        open: function (win, loadContent, openWindow) {
            const opener = document.activeElement;
            const elm = win.getElm();
            const content = win.getContent();
            const closeButton = elm.querySelector('[name="close"]');
            win.$contentOpener = opener;
            win.setAttribute('contentCancelled', false);
            win.setAttribute('contentPending', true);
            content.setAttribute('aria-busy', 'true');
            elm.setAttribute('role', 'dialog');
            elm.setAttribute('aria-modal', 'true');

            if (!elm.getAttribute('aria-label')) {
                elm.setAttribute('aria-label', win.getAttribute('title') || Locale.get('quiqqer/bricks', 'window.title'));
            }

            if (closeButton) {
                closeButton.setAttribute('data-name', 'windowClose');
                closeButton.setAttribute('type', 'button');
                closeButton.setAttribute('aria-label', win.getAttribute('closeButtonText'));
                // The close button must remain above the window's loading overlay.
                closeButton.style.zIndex = '11';
            }

            const keepLoadingFocus = (event) => {
                if (event.key === 'Tab' && win.getAttribute('contentPending')) {
                    event.preventDefault();
                    closeButton?.focus({preventScroll: true});
                }
            };
            elm.addEventListener('keydown', keepLoadingFocus);

            const cancelled = new Promise((resolve) => {
                const cancel = () => {
                    win.setAttribute('contentCancelled', true);
                    win.setAttribute('contentPending', false);
                    elm.setAttribute('data-window-content-cancelled', '1');
                    content.removeAttribute('aria-busy');
                    elm.removeEventListener('keydown', keepLoadingFocus);
                    win.removeEvent('closeBegin', cancel);
                    win.removeEvent('destroy', cancel);
                    if (elm.contains(document.activeElement) && opener?.isConnected) {
                        opener.focus({preventScroll: true});
                    }
                    resolve();
                };
                win.addEvent('closeBegin', cancel);
                win.addEvent('destroy', cancel);
            });

            const fail = (error) => {
                if (win.getAttribute('contentCancelled')) {
                    return;
                }
                console.error(error);
                win.setAttribute('contentPending', false);
                content.removeAttribute('aria-busy');
                win.Loader.hide();
                const message = document.createElement('p');
                message.setAttribute('role', 'alert');
                message.textContent = Locale.get('quiqqer/bricks', 'window.loadError');
                content.replaceChildren(message);
            };

            if ([true, 1, '1'].includes(win.getAttribute('prepareContent'))) {
                const prepared = this.prepare(win, loadContent).then(() => {
                    if (!win.getAttribute('contentCancelled')) {
                        content.removeAttribute('aria-busy');
                        return openWindow();
                    }
                }).catch((error) => {
                    if (!win.getAttribute('contentCancelled')) {
                        win.destroy();
                        throw error;
                    }
                });
                return Promise.race([prepared, cancelled]);
            }

            const opening = openWindow();
            closeButton?.focus({preventScroll: true});
            // Keep loading independent of the opening promise: callers can release
            // their click lock once the window is visible, even on a slow request.
            Promise.resolve().then(loadContent).then(async () => {
                await document.fonts.ready;
                if (win.getAttribute('contentCancelled')) {
                    return;
                }
                win.setAttribute('contentPending', false);
                content.removeAttribute('aria-busy');
                win.fireEvent('contentReady', [win]);
                await opening;
                if (!win.getAttribute('contentCancelled')) {
                    await win.resize();
                }
            }).catch(fail);
            return Promise.race([opening, cancelled]);
        },

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
            const elm = win.getElm();
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
                if (win.getAttribute('contentCancelled')) {
                    return;
                }
                win.fireEvent('contentReady', [win]);
                // Start the opening animation at the measured, viewport-clamped
                // height instead of animating down from the unconstrained content.
                elm.style.height = win.getOpeningHeight() + 'px';
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
