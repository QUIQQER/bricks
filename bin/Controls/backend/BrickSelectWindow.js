define('package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow', [

    'qui/QUI',
    'qui/controls/windows/Confirm',
    'Locale'

], function (QUI, QUIConfirm, QUILocale) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIConfirm,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow',

        Binds: [
            '$onOpen'
        ],

        options: {
            project: false,
            lang: false
        },

        initialize: function (options) {
            // defaults
            this.setAttributes({
                maxHeight: 800,
                maxWidth: 1200,
                icon: 'fa fa-cubes',
                title: QUILocale.get(lg, 'window.brick.select.title')
            });

            this.parent(options);
            this.$BricksSelect = null;

            this.addEvents({
                onOpen: this.$onOpen
            });
        },

        /**
         * event: on open
         *
         * @param Win
         */
        $onOpen: function (Win) {
            const self = this;

            Win.Loader.show();
            Win.getContent().set('html', '');

            require([
                'package/quiqqer/bricks/bin/Controls/backend/BrickList'
            ], function (BrickList) {
                self.$BricksSelect = new BrickList({
                    project: self.getAttribute('project'),
                    lang: self.getAttribute('lang'),
                    multiple: self.getAttribute('multiple'),
                    styles: {
                        height: '100%'
                    },
                    events: {
                        onDblClick: function () {
                            self.submit();
                        }
                    }
                }).inject(Win.getContent());

                Win.Loader.hide();
            });
        },

        /**
         * submit, fires onSubmit
         */
        submit: function () {
            this.fireEvent('submit', [this, this.$BricksSelect.getValue()]);

            if (this.getAttribute('autoclose')) {
                this.close();
            }
        }
    });
});
