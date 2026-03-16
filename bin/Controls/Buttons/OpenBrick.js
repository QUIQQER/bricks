define('package/quiqqer/bricks/bin/Controls/Buttons/OpenBrick', [

    'qui/controls/Control',
    'package/quiqqer/bricks/bin/Controls/BrickWindow'

], function (QUIControl, BrickWindow) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/Buttons/OpenBrick',

        Binds: [
            '$onImport',
            '$openBrick'
        ],

        initialize: function (options) {
            this.parent(options);

            this.addEvents({
                onImport: this.$onImport
            });
        },

        $onImport: function () {
            this.getElm().addEvent('click', this.$openBrick);
        },

        $openBrick: function (event) {
            const Elm = this.getElm();

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            if (this.getElm().hasAttribute('disabled')) {
                return;
            }

            const brickId = parseInt(Elm.getAttribute('data-open-brick-id'), 10);

            if (isNaN(brickId) || brickId < 1) {
                return;
            }

            const parm = {
                brickId: brickId,
                maxWidth: 1000,
                maxHeight: 800,
                events: {
                    onOpen: (Win) => {
                        Win.getElm().classList.add('quiqqer-bricks-controls-buttons-openBrickWindow');
                    }
                }
            };

            if (Elm.getAttribute('data-win-height')) {
                parm.maxHeight = Elm.getAttribute('data-win-height');
            }

            if (Elm.getAttribute('data-win-width')) {
                parm.maxWidth = Elm.getAttribute('data-win-width');
            }

            new BrickWindow(parm).open();
        }
    });
});
