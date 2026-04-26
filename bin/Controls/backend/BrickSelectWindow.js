define('package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow', [

    'package/quiqqer/bricks/bin/Controls/backend/BrickPickerWindow',
    'Locale'

], function (BrickPickerWindow, QUILocale) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: BrickPickerWindow,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow',

        Binds: [
            'submit'
        ],

        options: {
            project: false,
            lang: false
        },

        initialize: function (options) {
            // defaults
            this.setAttributes({
                autoclose: true,
                icon: 'fa fa-cubes',
                title: QUILocale.get(lg, 'window.brick.select.title'),
                pickerOptions: {
                    autoExecute: true,
                    showProjectSelect: true
                }
            });

            this.parent(options);

            this.addEvents({
                onExecute: this.submit
            });
        },

        /**
         * submit, fires onSubmit
         */
        submit: function () {
            const Picker = this.getPicker();
            const value = Picker ? Picker.getValue() : [];

            if (!value.length) {
                return;
            }

            this.fireEvent('submit', [this, value]);

            if (this.getAttribute('autoclose')) {
                this.close();
            }
        },

        getPickerOptions: function () {
            return Object.merge(this.parent(), {
                project: this.getAttribute('project'),
                lang: this.getAttribute('lang'),
                multiple: this.getAttribute('multiple')
            });
        }
    });
});
