define('package/quiqqer/bricks/bin/Controls/BrickWindow', [

    'qui/QUI',
    'qui/controls/windows/SimpleWindow',
    'Ajax'

], function (QUI, SimpleWindow, QUIAjax) {
    "use strict";

    return new Class({

        Type: 'package/quiqqer/bricks/bin/Controls/BrickWindow',
        Extends: SimpleWindow,

        Binds: [
            '$onOpen'
        ],

        options: {
            brickId: false,
            prepareContent: false,
            // parameters handed to the rendered brick, e.g. {context: '...'}.
            // The server applies them prefixed, so they can never overwrite a
            // brick setting; a brick opts in by reading the prefixed value.
            brickParams: false
        },

        initialize: function (options) {
            this.parent(options);
            this.$contentPromise = null;

            this.addEvents({
                onOpen: this.$onOpen
            });
        },

        open: function (callback) {
            if (!this.$shouldPrepareContent()) {
                return this.parent(callback);
            }

            return new Promise((resolve, reject) => {
                require([
                    'package/quiqqer/bricks/bin/Controls/WindowContentReveal'
                ], resolve, reject);
            }).then((WindowContentReveal) => {
                return WindowContentReveal.prepare(this, () => this.$loadContent());
            }).then(() => {
                return SimpleWindow.prototype.open.call(this, callback);
            }).catch((error) => {
                console.error(error);
                this.destroy();
                throw error;
            });
        },

        $shouldPrepareContent: function () {
            if (this.getAttribute('prepareContent')) {
                return true;
            }

            const brickId = Number(this.getAttribute('brickId'));

            return brickId > 0 && document.querySelector(
                '[data-open-brick-id="' + brickId + '"][data-window-auto-height="1"]'
            ) !== null;
        },

        $onOpen: function () {
            if (this.$contentPromise) {
                return;
            }

            this.$loadContent().catch((error) => {
                console.error(error);
                this.close();
            });
        },

        $loadContent: function () {
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
                    this.$Content.innerHTML = html;
                    QUI.parse(this.$Content).then(() => {
                        this.Loader.hide();
                        resolve();
                    }).catch(reject);
                }, params);
            });

            return this.$contentPromise;
        }
    });
});
