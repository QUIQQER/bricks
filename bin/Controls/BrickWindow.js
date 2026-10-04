define('package/quiqqer/bricks/bin/Controls/BrickWindow', [

    'qui/QUI',
    'qui/controls/windows/SimpleWindow',
    'Ajax',
    'package/quiqqer/bricks/bin/Controls/WindowContentReveal'

], function (QUI, SimpleWindow, QUIAjax, WindowContentReveal) {
    "use strict";

    return new Class({

        Type: 'package/quiqqer/bricks/bin/Controls/BrickWindow',
        Extends: SimpleWindow,

        options: {
            brickId: false,
            prepareContent: false,
            preserveInitialHeight: false,
            // Opt-in for content sizing controls: maxHeight is a working height,
            // not a ceiling for their natural content height.
            contentAutoHeight: false,
            // parameters handed to the rendered brick, e.g. {context: '...'}.
            // The server applies them prefixed, so they can never overwrite a
            // brick setting; a brick opts in by reading the prefixed value.
            brickParams: false
        },

        initialize: function (options) {
            this.parent(options);

            if (options?.preserveInitialHeight === undefined) {
                this.setAttribute('preserveInitialHeight', Number(options?.maxHeight) > 0);
            }

            this.$contentPromise = null;
        },

        open: function (callback) {
            return WindowContentReveal.open(
                this,
                () => this.$loadContent(),
                () => SimpleWindow.prototype.open.call(this, callback)
            );
        },

        $loadContent: function () {
            if (this.getAttribute('contentCancelled')) {
                return Promise.resolve();
            }

            if (this.$contentPromise) {
                return this.$contentPromise;
            }

            this.Loader.show();

            const params = {
                'package': 'quiqqer/bricks',
                brickId: this.getAttribute('brickId')
            };

            const brickParams = this.getAttribute('brickParams');

            if (brickParams && typeof brickParams === 'object') {
                params.brickParams = JSON.stringify(brickParams);
            }

            this.$contentPromise = new Promise((resolve, reject) => {
                params.onError = reject;

                QUIAjax.get('package_quiqqer_bricks_ajax_brick_render', (html) => {
                    if (this.getAttribute('contentCancelled')) {
                        resolve();
                        return;
                    }
                    this.$Content.innerHTML = html;
                    QUI.parse(this.$Content).then(() => {
                        if (!this.getAttribute('contentCancelled')) {
                            this.Loader.hide();
                        }
                        resolve();
                    }).catch(reject);
                }, params);
            });

            return this.$contentPromise;
        }
    });
});
