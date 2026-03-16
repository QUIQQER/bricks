/**
 * Popup wrapper for the full brick editor in quick-edit flows
 */
define('package/quiqqer/bricks/bin/Controls/backend/BrickEditWindow', [

    'qui/controls/windows/Popup',
    'Locale',
    'package/quiqqer/bricks/bin/BrickEdit',
    'utils/Panels',

    'css!package/quiqqer/bricks/bin/Controls/backend/BrickEditWindow.css'

], function (QUIPopup, QUILocale, BrickEdit, PanelUtils) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIPopup,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickEditWindow',

        Binds: [
            '$onOpen',
            '$onResize',
            '$onClose',
            '$createActions',
            '$syncPanelFrame',
            '$syncWindowMeta',
            'save',
            'saveAndClose',
            'openInPanel'
        ],

        options: {
            brickId: false,
            projectName: false,
            projectLang: false,
            showOpenInPanelButton: true,
            showSaveAndCloseButton: true,
            maxWidth: 1400,
            maxHeight: 900,
            icon: 'fa fa-th',
            title: '...',
            buttons: false,
            backgroundClosable: false,
            resizable: true
        },

        initialize: function (options) {
            this.parent(options);

            this.$Panel = null;
            this.$PanelContainer = null;
            this.$Actions = null;
            this.$SaveButton = null;
            this.$SaveAndCloseButton = null;
            this.$OpenPanelButton = null;

            this.addEvents({
                onOpen: this.$onOpen,
                onResize: this.$onResize,
                onClose: this.$onClose
            });
        },

        $onOpen: function () {
            if (this.$Panel) {
                this.$syncPanelFrame();
                return;
            }

            this.getContent().addClass('quiqqer-bricks-brickedit-window-content');
            this.getElm().addClass('quiqqer-bricks-brickedit-window');

            this.$createActions();

            this.$PanelContainer = new Element('div', {
                'class': 'quiqqer-bricks-brickedit-window-panel'
            }).inject(this.getContent());

            this.$Panel = new BrickEdit({
                id: this.getAttribute('brickId'),
                projectName: this.getAttribute('projectName'),
                projectLang: this.getAttribute('projectLang'),
                header: false,
                dragable: false,
                styles: {
                    height: '100%'
                },
                events: {
                    onLoaded: () => {
                        this.$syncWindowMeta();
                        this.$syncPanelFrame();
                    },
                    onSave: () => {
                        this.$syncWindowMeta();
                    },
                    onDelete: () => {
                        this.close();
                    }
                }
            }).inject(this.$PanelContainer);

            this.$syncWindowMeta();
            this.$syncPanelFrame();
        },

        $onResize: function () {
            this.$syncPanelFrame();
        },

        $onClose: function () {
            if (this.$Panel) {
                this.$Panel.destroy();
                this.$Panel = null;
            }

            if (this.$PanelContainer) {
                this.$PanelContainer.destroy();
                this.$PanelContainer = null;
            }
        },

        $syncWindowMeta: function () {
            if (!this.$Panel) {
                return;
            }

            this.setAttributes({
                title: this.$Panel.getAttribute('title')
                    || QUILocale.get(lg, 'panel.title', {
                        brickId: this.getAttribute('brickId'),
                        brickTitle: ''
                    }),
                icon: 'fa fa-th'
            });

            if (this.$Icon) {
                this.$Icon.className = 'qui-window-popup-title-icon';
            }

            this.refresh();
        },

        $createActions: function () {
            if (this.$Actions) {
                return;
            }

            const showOpenInPanelButton = this.getAttribute('showOpenInPanelButton') !== false;
            const showSaveAndCloseButton = this.getAttribute('showSaveAndCloseButton') !== false;
            const saveButtonClass = showSaveAndCloseButton ? 'btn btn-light' : 'btn btn-primary';

            this.$Buttons.empty();
            this.$Buttons.addClass('quiqqer-bricks-brickedit-window-actions');

            this.$Actions = new Element('div', {
                'class': 'quiqqer-bricks-brickedit-window-actions__inner'
            }).inject(this.$Buttons);

            if (showOpenInPanelButton) {
                this.$OpenPanelButton = new Element('button', {
                    'class': 'btn btn-link-body',
                    html: QUILocale.get(lg, 'brick.window.popup.openInPanel') + '<i class="fa fa-external-link"></i>',
                    type: 'button',
                    events: {
                        click: this.openInPanel
                    }
                }).inject(this.$Actions);
            }

            this.$SaveButton = new Element('button', {
                'class': saveButtonClass,
                html: QUILocale.get('quiqqer/system', 'save'),
                type: 'button',
                events: {
                    click: this.save
                }
            }).inject(this.$Actions);

            if (showSaveAndCloseButton) {
                this.$SaveAndCloseButton = new Element('button', {
                    'class': 'btn btn-primary',
                    html: QUILocale.get(lg, 'brick.window.popup.saveAndClose'),
                    type: 'button',
                    events: {
                        click: this.saveAndClose
                    }
                }).inject(this.$Actions);
            }
        },

        $syncPanelFrame: function () {
            if (!this.$Panel || !this.$PanelContainer) {
                return;
            }

            const size = this.getContent().getSize();

            if (!size || !size.y) {
                return;
            }

            this.$PanelContainer.setStyles({
                height: size.y,
                width: '100%'
            });

            this.$Panel.setStyles({
                height: size.y
            });

            this.$Panel.resize();
        },

        save: function (event) {
            if (event) {
                event.preventDefault();
            }

            if (!this.$Panel) {
                return Promise.resolve();
            }

            return this.$Panel.save();
        },

        saveAndClose: function (event) {
            if (event) {
                event.preventDefault();
            }

            return this.save().then(() => {
                return this.close();
            });
        },

        openInPanel: function (event) {
            if (event) {
                event.preventDefault();
            }

            if (!this.$Panel) {
                return;
            }

            const Panel = new BrickEdit({
                '#id': 'brick-edit-' + this.getAttribute('brickId'),
                id: this.getAttribute('brickId'),
                projectName: this.getAttribute('projectName'),
                projectLang: this.getAttribute('projectLang')
            });

            PanelUtils.openPanelInTasks(Panel);
            this.close();
        }
    });
});
