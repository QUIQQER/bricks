define('package/quiqqer/bricks/bin/Controls/backend/BrickPickerWindow', [

    'qui/controls/windows/Popup',
    'package/quiqqer/bricks/bin/Controls/backend/BrickPicker'

], function (QUIPopup, BrickPicker) {
    "use strict";

    return new Class({

        Extends: QUIPopup,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickPickerWindow',

        Binds: [
            '$onOpen',
            '$onClose'
        ],

        options: {
            maxWidth: 1100,
            maxHeight: 760,
            autoclose: false,
            pickerOptions: {}
        },

        initialize: function (options) {
            this.parent(options);

            this.$Picker = null;

            this.addEvents({
                onOpen: this.$onOpen,
                onClose: this.$onClose
            });
        },

        $onOpen: function (Win) {
            const ActionBar = Win.getElm().querySelector('.qui-window-popup-buttons');
            let pickerOptions = this.getPickerOptions();
            const pickerEvents = Object.clone(pickerOptions.events) || {};

            if (ActionBar) {
                ActionBar.remove();
            }

            Win.Loader.show();
            Win.getContent().set('html', '');

            pickerOptions = Object.merge(pickerOptions, {
                styles: Object.merge({
                    height: '100%'
                }, pickerOptions.styles || {}),
                events: Object.merge(pickerEvents, {
                    onExecute: function (Picker, value) {
                        this.fireEvent('execute', [this, value, Picker]);
                    }.bind(this),
                    onEscape: function () {
                        this.close();
                    }.bind(this)
                })
            });

            this.$Picker = new BrickPicker(pickerOptions).inject(Win.getContent());

            Win.Loader.hide();
        },

        $onClose: function () {
            this.$Picker = null;
        },

        getPicker: function () {
            return this.$Picker;
        },

        getPickerOptions: function () {
            return Object.clone(this.getAttribute('pickerOptions')) || {};
        }
    });
});
