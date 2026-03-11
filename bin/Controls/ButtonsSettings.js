define('package/quiqqer/bricks/bin/Controls/ButtonsSettings', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Switch',
    'Locale',
    'Mustache',
    'controls/grid/Grid',
    'utils/Controls',

    'text!package/quiqqer/bricks/bin/Controls/ButtonsSettingsEntry.html',
    'css!package/quiqqer/bricks/bin/Controls/ButtonsSettings.css'

], function (
    QUI,
    QUIControl,
    QUIConfirm,
    QUISwitch,
    QUILocale,
    Mustache,
    Grid,
    ControlsUtils,
    templateEntry
) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/ButtonsSettings',

        Binds: [
            '$onImport',
            '$openAddDialog',
            '$openDeleteDialog',
            '$openEditDialog',
            '$toggleEntryStatus',
            '$onDisplayModeChange',
            '$openBrickSelectWindow',
            '$setOpenBrickTitleDisplay',
            'update'
        ],

        initialize: function (options) {
            this.parent(options);

            this.$Input = null;
            this.$Grid = null;
            this.$DisplayModeInput = null;
            this.$data = [];

            this.addEvents({
                onImport: this.$onImport
            });
        },

        $onImport: function () {
            this.$Input = this.getElm();

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-buttons-settings',
                styles: {
                    clear: 'both',
                    'float': 'left',
                    height: 400,
                    overflow: 'hidden',
                    position: 'relative',
                    margin: '10px 0 0 0',
                    width: '100%'
                }
            }).wraps(this.$Input);

            const size = this.$Elm.getSize();

            const Desktop = new Element('div', {
                styles: {
                    width: size.x
                }
            }).inject(this.$Elm);

            this.$Grid = new Grid(Desktop, {
                height: 400,
                width: size.x,
                buttons: [
                    {
                        name: 'up',
                        icon: 'fa fa-angle-up',
                        disabled: true,
                        events: {
                            onClick: function () {
                                this.$Grid.moveup();
                                this.$refreshSorting();
                            }.bind(this)
                        }
                    }, {
                        name: 'down',
                        icon: 'fa fa-angle-down',
                        disabled: true,
                        events: {
                            onClick: function () {
                                this.$Grid.movedown();
                                this.$refreshSorting();
                            }.bind(this)
                        }
                    }, {
                        type: 'separator'
                    }, {
                        name: 'add',
                        textimage: 'fa fa-plus',
                        text: QUILocale.get('quiqqer/core', 'add'),
                        events: {
                            onClick: this.$openAddDialog
                        }
                    }, {
                        type: 'separator'
                    }, {
                        name: 'edit',
                        textimage: 'fa fa-edit',
                        text: QUILocale.get('quiqqer/core', 'edit'),
                        disabled: true,
                        events: {
                            onClick: this.$openEditDialog
                        }
                    }, {
                        name: 'delete',
                        textimage: 'fa fa-trash',
                        text: QUILocale.get('quiqqer/core', 'delete'),
                        disabled: true,
                        events: {
                            onClick: this.$openDeleteDialog
                        }
                    }
                ],
                columnModel: [
                    {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.isDisabled.short'),
                        dataIndex: 'isDisabledDisplay',
                        dataType: 'QUI',
                        width: 70
                    }, {
                        dataIndex: 'isDisabled',
                        hidden: true
                    }, {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.preview'),
                        dataIndex: 'preview',
                        dataType: 'node',
                        width: 180
                    }, {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.text'),
                        dataIndex: 'text',
                        dataType: 'string',
                        width: 160
                    }, {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.iconClass'),
                        dataIndex: 'iconClass',
                        dataType: 'string',
                        width: 170
                    }, {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.btnType'),
                        dataIndex: 'btnType',
                        dataType: 'string',
                        width: 150
                    }, {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.href'),
                        dataIndex: 'href',
                        dataType: 'string',
                        width: 220
                    }, {
                        header: QUILocale.get(lg, 'quiqqer.bricks.buttons.create.targetBlank.short'),
                        dataIndex: 'targetBlankDisplay',
                        dataType: 'node',
                        width: 90
                    }, {
                        dataIndex: 'openBrickId',
                        hidden: true
                    }, {
                        dataIndex: 'openBrickTitle',
                        hidden: true
                    }, {
                        dataIndex: 'openBrickWinWidth',
                        hidden: true
                    }, {
                        dataIndex: 'openBrickWinHeight',
                        hidden: true
                    }, {
                        dataIndex: 'targetBlank',
                        hidden: true
                    }, {
                        dataIndex: 'iconPosition',
                        hidden: true
                    }, {
                        dataIndex: 'size',
                        hidden: true
                    }, {
                        dataIndex: 'title',
                        hidden: true
                    }, {
                        dataIndex: 'ariaLabel',
                        hidden: true
                    }, {
                        dataIndex: 'disabled',
                        hidden: true
                    }, {
                        dataIndex: 'fullWidth',
                        hidden: true
                    }, {
                        dataIndex: 'onClick',
                        hidden: true
                    }, {
                        dataIndex: 'customClass',
                        hidden: true
                    }
                ]
            });

            this.$Grid.addEvents({
                onClick: function () {
                    const buttons = this.$Grid.getButtons();

                    const Edit = buttons.filter(function (Btn) {
                        return Btn.getAttribute('name') === 'edit';
                    })[0];

                    const Up = buttons.filter(function (Btn) {
                        return Btn.getAttribute('name') === 'up';
                    })[0];

                    const Down = buttons.filter(function (Btn) {
                        return Btn.getAttribute('name') === 'down';
                    })[0];

                    const Delete = buttons.filter(function (Btn) {
                        return Btn.getAttribute('name') === 'delete';
                    })[0];

                    Up.enable();
                    Down.enable();
                    Edit.enable();
                    Delete.enable();
                }.bind(this),

                onDblClick: this.$openEditDialog
            });

            this.$Grid.getElm().setStyles({
                position: 'absolute'
            });

            this.$DisplayModeInput = this.$Input.getParent('form')
                ? this.$Input.getParent('form').getElement('[name="displayMode"]')
                : null;

            if (!this.$DisplayModeInput) {
                this.$DisplayModeInput = document.body.getElement('[name="displayMode"]');
            }

            if (this.$DisplayModeInput) {
                this.$DisplayModeInput.addEvent('change', this.$onDisplayModeChange);
            }

            try {
                this.$data = JSON.decode(this.$Input.value);

                if (typeOf(this.$data) !== 'array') {
                    this.$data = [];
                }

                this.refresh();
            } catch (e) {
            }
        },

        $onDisplayModeChange: function () {
            this.refresh();
        },

        $toggleEntryStatus: function (Caller) {
            if (!Caller) {
                return;
            }

            const row = Caller.getElm().getParent('li').get('data-row');

            this.$data[row].isDisabled = this.$normalizeFlag(Caller.getStatus());
            this.update();
        },

        resize: function () {
            const size = this.getElm().getSize();

            return this.$Grid.setWidth(size.x).then(function () {
                this.$Grid.resize();
            }.bind(this));
        },

        refresh: function () {
            const data = [];

            for (let i = 0, len = this.$data.length; i < len; i++) {
                const entry = this.$data[i];
                const insert = {
                    text: entry.text || '',
                    iconClass: entry.iconClass || '',
                    btnType: this.$normalizeBtnType(entry.btnType),
                    href: entry.href || '',
                    iconPosition: entry.iconPosition || 'start',
                    size: entry.size || 'default',
                    title: entry.title || '',
                    ariaLabel: entry.ariaLabel || '',
                    onClick: entry.onClick || '',
                    customClass: entry.customClass || ''
                };

                insert.isDisabled = this.$normalizeFlag(entry.isDisabled);
                insert.targetBlank = this.$normalizeFlag(entry.targetBlank);
                insert.disabled = this.$normalizeFlag(entry.disabled);
                insert.fullWidth = this.$normalizeFlag(entry.fullWidth);
                insert.openBrickId = this.$normalizeBrickId(entry.openBrickId);
                insert.openBrickTitle = this.$normalizeBrickTitle(entry.openBrickTitle);
                insert.openBrickWinWidth = this.$normalizePopupDimension(entry.openBrickWinWidth);
                insert.openBrickWinHeight = this.$normalizePopupDimension(entry.openBrickWinHeight);

                insert.isDisabledDisplay = new QUISwitch({
                    status: insert.isDisabled,
                    name: i,
                    uid: i,
                    events: {
                        onChange: this.$toggleEntryStatus
                    }
                });

                insert.targetBlankDisplay = new Element('span', {
                    'class': insert.targetBlank ? 'fa fa-check' : 'fa fa-times',
                    'data-enabled': insert.targetBlank
                });

                insert.preview = this.$createPreviewNode(insert);

                data.push(insert);
            }

            this.$Grid.setData({
                data: data
            });

            const buttons = this.$Grid.getButtons();

            const Edit = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'edit';
            })[0];

            const Up = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'up';
            })[0];

            const Down = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'down';
            })[0];

            const Delete = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'delete';
            })[0];

            Up.disable();
            Down.disable();
            Edit.disable();
            Delete.disable();
        },

        update: function () {
            this.$Input.value = JSON.encode(this.$data);
        },

        add: function (params) {
            const entry = this.$normalizeEntry(params);

            this.$data.push(entry);
            this.refresh();
            this.update();
        },

        edit: function (index, params) {
            if (typeof index === 'undefined') {
                return;
            }

            this.$data[index] = this.$normalizeEntry(params);
            this.refresh();
            this.update();
        },

        del: function (index) {
            const newList = [];

            if (typeOf(index) !== 'array') {
                index = [index];
            }

            for (let i = 0, len = this.$data.length; i < len; i++) {
                if (!index.contains(i)) {
                    newList.push(this.$data[i]);
                }
            }

            this.$data = newList;
        },

        setProject: function (Project) {
            this.setAttribute('project', Project);

            const controls = QUI.Controls.getControlsInElement(this.getElm());

            controls.each(function (Control) {
                if (Control === this) {
                    return;
                }

                if ("setProject" in Control) {
                    Control.setProject(Project);
                }
            }.bind(this));
        },

        $refreshSorting: function () {
            const gridData = this.$Grid.getData();
            const data = [];

            for (let i = 0, len = gridData.length; i < len; i++) {
                data.push(this.$normalizeEntry(gridData[i]));
            }

            this.$data = data;
            this.update();
        },

        $openDeleteDialog: function () {
            new QUIConfirm({
                icon: 'fa fa-icon',
                text: QUILocale.get(lg, 'quiqqer.bricks.entires.delete.text'),
                information: QUILocale.get(lg, 'quiqqer.bricks.entires.delete.information'),
                texticon: false,
                maxWidth: 600,
                maxHeight: 400,
                ok_button: {
                    text: QUILocale.get('quiqqer/core', 'delete'),
                    textimage: 'fa fa-trash'
                },
                events: {
                    onSubmit: function () {
                        const selected = this.$Grid.getSelectedIndices();

                        this.$Grid.deleteRows(selected);
                        this.del(selected);
                        this.update();
                    }.bind(this)
                }
            }).open();
        },

        $openEditDialog: function () {
            let data = this.$Grid.getSelectedData();
            let index = this.$Grid.getSelectedIndices();

            if (!data.length) {
                return Promise.resolve();
            }

            data = data[0];
            index = index[0];

            return this.$createDialog().then(function (Dialog) {
                Dialog.addEvent('onSubmit', function () {
                    Dialog.Loader.show();

                    const Form = Dialog.getContent().getElement('form');

                    this.edit(index, {
                        text: Form.elements.text.value,
                        iconClass: Form.elements.iconClass.value,
                        iconPosition: Form.elements.iconPosition.value,
                        btnType: Form.elements.btnType.value,
                        size: Form.elements.size.value,
                        openBrickId: Form.elements.openBrickId.value,
                        openBrickTitle: Form.elements.openBrickTitle.value,
                        openBrickWinWidth: Form.elements.openBrickWinWidth.value,
                        openBrickWinHeight: Form.elements.openBrickWinHeight.value,
                        href: Form.elements.href.value,
                        targetBlank: Dialog.TargetBlankSwitch.getStatus(),
                        title: Form.elements.title.value,
                        ariaLabel: Form.elements.ariaLabel.value,
                        disabled: Dialog.DisabledSwitch.getStatus(),
                        fullWidth: Dialog.FullWidthSwitch.getStatus(),
                        onClick: Form.elements.onClick.value,
                        customClass: Form.elements.customClass.value,
                        isDisabled: Dialog.IsDisabledSwitch.getStatus()
                    });

                    Dialog.close();
                }.bind(this));

                Dialog.addEvent('onOpenAfterCreate', function () {
                    const Form = Dialog.getContent().getElement('form');

                    Form.elements.text.value = data.text || '';
                    Form.elements.iconClass.value = data.iconClass || '';
                    Form.elements.iconPosition.value = data.iconPosition || 'start';
                    Form.elements.btnType.value = this.$normalizeBtnType(data.btnType);
                    Form.elements.size.value = data.size || 'default';
                    Form.elements.openBrickId.value = this.$normalizeBrickId(data.openBrickId);
                    Form.elements.openBrickTitle.value = this.$normalizeBrickTitle(data.openBrickTitle);
                    Form.elements.openBrickWinWidth.value = this.$normalizePopupDimension(data.openBrickWinWidth);
                    Form.elements.openBrickWinHeight.value = this.$normalizePopupDimension(data.openBrickWinHeight);
                    this.$setOpenBrickTitleDisplay(Form, Form.elements.openBrickTitle.value);
                    Form.elements.href.value = data.href || '';
                    Form.elements.title.value = data.title || '';
                    Form.elements.ariaLabel.value = data.ariaLabel || '';
                    Form.elements.onClick.value = data.onClick || '';
                    Form.elements.customClass.value = data.customClass || '';

                    if (this.$normalizeFlag(data.isDisabled)) {
                        Dialog.IsDisabledSwitch.on();
                    } else {
                        Dialog.IsDisabledSwitch.off();
                    }

                    if (this.$normalizeFlag(data.targetBlank)) {
                        Dialog.TargetBlankSwitch.on();
                    } else {
                        Dialog.TargetBlankSwitch.off();
                    }

                    if (this.$normalizeFlag(data.disabled)) {
                        Dialog.DisabledSwitch.on();
                    } else {
                        Dialog.DisabledSwitch.off();
                    }

                    if (this.$normalizeFlag(data.fullWidth)) {
                        Dialog.FullWidthSwitch.on();
                    } else {
                        Dialog.FullWidthSwitch.off();
                    }

                    Form.elements.href.fireEvent('change');
                    Form.elements.iconClass.fireEvent('change');
                }.bind(this));

                Dialog.setAttribute('title', QUILocale.get(lg, 'quiqqer.bricks.entires.editdialog.title'));
                Dialog.open();
            }.bind(this));
        },

        $openAddDialog: function () {
            return this.$createDialog().then(function (Dialog) {
                Dialog.addEvent('onSubmit', function () {
                    Dialog.Loader.show();

                    const Form = Dialog.getContent().getElement('form');

                    this.add({
                        text: Form.elements.text.value,
                        iconClass: Form.elements.iconClass.value,
                        iconPosition: Form.elements.iconPosition.value,
                        btnType: Form.elements.btnType.value,
                        size: Form.elements.size.value,
                        openBrickId: Form.elements.openBrickId.value,
                        openBrickTitle: Form.elements.openBrickTitle.value,
                        openBrickWinWidth: Form.elements.openBrickWinWidth.value,
                        openBrickWinHeight: Form.elements.openBrickWinHeight.value,
                        href: Form.elements.href.value,
                        targetBlank: Dialog.TargetBlankSwitch.getStatus(),
                        title: Form.elements.title.value,
                        ariaLabel: Form.elements.ariaLabel.value,
                        disabled: Dialog.DisabledSwitch.getStatus(),
                        fullWidth: Dialog.FullWidthSwitch.getStatus(),
                        onClick: Form.elements.onClick.value,
                        customClass: Form.elements.customClass.value,
                        isDisabled: Dialog.IsDisabledSwitch.getStatus()
                    });

                    Dialog.close();
                }.bind(this));

                Dialog.open();
            }.bind(this));
        },

        $createDialog: function () {
            return new Promise(function (resolve) {
                const Dialog = new QUIConfirm({
                    title: QUILocale.get(lg, 'quiqqer.bricks.entires.adddialog.title'),
                    icon: 'fa fa-edit',
                    maxWidth: 800,
                    maxHeight: 800,
                    autoclose: false,
                    IsDisabledSwitch: false,
                    TargetBlankSwitch: false,
                    DisabledSwitch: false,
                    FullWidthSwitch: false,
                    events: {
                        onOpen: function (Win) {
                            Win.Loader.show();
                            Win.getContent().set('html', '');

                            const prefix = 'quiqqer.bricks.buttons.settings.createPopup.';

                            const Container = new Element('div', {
                                html: Mustache.render(templateEntry, {
                                    fieldIsDisabled: QUILocale.get(lg, prefix + 'disable'),
                                    fieldText: QUILocale.get(lg, prefix + 'text'),
                                    fieldIconClass: QUILocale.get(lg, prefix + 'iconClass'),
                                    fieldIconPosition: QUILocale.get(lg, prefix + 'iconPosition'),
                                    fieldIconPositionStart: QUILocale.get(lg, prefix + 'iconPosition.start'),
                                    fieldIconPositionEnd: QUILocale.get(lg, prefix + 'iconPosition.end'),
                                    fieldButtonType: QUILocale.get(lg, prefix + 'btnType'),
                                    fieldSize: QUILocale.get(lg, prefix + 'size'),
                                    fieldSizeDefault: QUILocale.get(lg, prefix + 'size.default'),
                                    fieldSizeSmall: QUILocale.get(lg, prefix + 'size.small'),
                                    fieldSizeLarge: QUILocale.get(lg, prefix + 'size.large'),
                                    fieldOpenBrick: QUILocale.get(lg, prefix + 'openBrick'),
                                    fieldOpenBrickSelect: QUILocale.get(lg, prefix + 'openBrick.select'),
                                    fieldOpenBrickClear: QUILocale.get(lg, prefix + 'openBrick.clear'),
                                    fieldOpenBrickWinWidth: QUILocale.get(lg, prefix + 'openBrick.winWidth'),
                                    fieldOpenBrickWinHeight: QUILocale.get(lg, prefix + 'openBrick.winHeight'),
                                    fieldHref: QUILocale.get(lg, prefix + 'href'),
                                    fieldTargetBlank: QUILocale.get(lg, prefix + 'targetBlank'),
                                    fieldTitle: QUILocale.get(lg, prefix + 'title'),
                                    fieldAriaLabel: QUILocale.get(lg, prefix + 'ariaLabel'),
                                    fieldDisabled: QUILocale.get(lg, prefix + 'disabled'),
                                    fieldFullWidth: QUILocale.get(lg, prefix + 'fullWidth'),
                                    fieldOnClick: QUILocale.get(lg, prefix + 'onClick'),
                                    fieldCustomClass: QUILocale.get(lg, prefix + 'customClass')
                                }),
                                'class': 'quiqqer-bricks-buttons-settings-entry'
                            }).inject(Win.getContent());

                            Win.IsDisabledSwitch = new QUISwitch({
                                name: 'isDisabled',
                                status: false
                            }).inject(Container.getElement('#isDisabledWrapper'));

                            Win.TargetBlankSwitch = new QUISwitch({
                                name: 'targetBlank',
                                status: false
                            }).inject(Container.getElement('#targetBlankWrapper'));

                            Win.DisabledSwitch = new QUISwitch({
                                name: 'disabled',
                                status: false
                            }).inject(Container.getElement('#disabledWrapper'));

                            Win.FullWidthSwitch = new QUISwitch({
                                name: 'fullWidth',
                                status: false
                            }).inject(Container.getElement('#fullWidthWrapper'));

                            QUI.parse(Container).then(function () {
                                return ControlsUtils.parse(Container);
                            }).then(function () {
                                const Form = Container.getElement('form');

                                Form.elements.selectBrick.addEvent('click', function () {
                                    this.$openBrickSelectWindow(Form);
                                }.bind(this));

                                Form.elements.openBrickId.addEvent('click', function () {
                                    this.$openBrickSelectWindow(Form);
                                }.bind(this));

                                Form.elements.clearBrick.addEvent('click', function () {
                                    Form.elements.openBrickId.value = '';
                                    Form.elements.openBrickTitle.value = '';
                                    this.$setOpenBrickTitleDisplay(Form, '');
                                }.bind(this));

                                this.$setOpenBrickTitleDisplay(
                                    Form,
                                    Form.elements.openBrickTitle.value
                                );

                                const controls = QUI.Controls.getControlsInElement(Container);
                                const project = this.getAttribute('project');

                                controls.each(function (Control) {
                                    if (Control === this) {
                                        return;
                                    }

                                    if ("setProject" in Control) {
                                        Control.setProject(project);
                                    }
                                }.bind(this));

                                Win.fireEvent('openAfterCreate', [Win]);

                                moofx(Container).animate({
                                    opacity: 1,
                                    top: 0
                                }, {
                                    duration: 250,
                                    callback: function () {
                                        resolve(Container);
                                        Win.Loader.hide();
                                    }
                                });
                            }.bind(this));
                        }.bind(this)
                    }
                });

                resolve(Dialog);
            }.bind(this));
        },

        $normalizeEntry: function (entry) {
            return {
                text: entry.text || '',
                iconClass: entry.iconClass || '',
                iconPosition: entry.iconPosition || 'start',
                btnType: this.$normalizeBtnType(entry.btnType),
                size: entry.size || 'default',
                openBrickId: this.$normalizeBrickId(entry.openBrickId),
                openBrickTitle: this.$normalizeBrickTitle(entry.openBrickTitle),
                openBrickWinWidth: this.$normalizePopupDimension(entry.openBrickWinWidth),
                openBrickWinHeight: this.$normalizePopupDimension(entry.openBrickWinHeight),
                href: entry.href || '',
                targetBlank: this.$normalizeFlag(entry.targetBlank),
                title: entry.title || '',
                ariaLabel: entry.ariaLabel || '',
                disabled: this.$normalizeFlag(entry.disabled),
                fullWidth: this.$normalizeFlag(entry.fullWidth),
                onClick: entry.onClick || '',
                customClass: entry.customClass || '',
                isDisabled: this.$normalizeFlag(entry.isDisabled)
            };
        },

        $createPreviewNode: function (entry) {
            const btnType = this.$normalizeBtnType(entry.btnType);
            const size = entry.size || 'default';
            const iconClass = entry.iconClass || '';
            const text = entry.text || '';
            const iconPosition = entry.iconPosition || 'start';
            const customClass = entry.customClass || '';
            const displayMode = this.$getDisplayMode();
            const isIconOnly = displayMode === 'icon-only' || displayMode === 'icon-only-rounded';
            const displayModeClass = isIconOnly ? ' btn-icon' : '';
            const displayModeClassPreview = displayMode === 'icon-only-rounded' ? ' btn-rounded' : '';

            const sizeClass = size === 'lg'
                ? ' btn-lg'
                : (size === 'sm' ? ' btn-sm' : '');

            const Preview = new Element('span', {
                'class': 'btn' + (btnType ? ' btn-' + btnType : '')
                    + ' quiqqer-bricks-buttons-settings-preview'
                    + sizeClass
                    + displayModeClass
                    + displayModeClassPreview
                    + (isIconOnly ? ' quiqqer-bricks-buttons-settings-preview--iconOnly' : '')
                    + (customClass ? ' ' + customClass : '')
            });

            if (iconClass && iconPosition === 'start') {
                new Element('span', {
                    'class': iconClass
                }).inject(Preview);
            }

            if (!isIconOnly) {
                new Element('span', {
                    'class': 'quiqqer-bricks-buttons-settings-preview__text',
                    text: text ? text : 'Button'
                }).inject(Preview);
            }

            if (iconClass && iconPosition === 'end') {
                new Element('span', {
                    'class': iconClass
                }).inject(Preview);
            }

            if (isIconOnly && !iconClass) {
                new Element('span', {
                    text: '?'
                }).inject(Preview);
            }

            if (this.$normalizeFlag(entry.disabled)) {
                Preview.addClass('disabled');
            }

            return Preview;
        },

        $getDisplayMode: function () {
            if (!this.$DisplayModeInput) {
                return 'button';
            }

            if (this.$DisplayModeInput.value === 'icon-only') {
                return 'icon-only';
            }

            if (this.$DisplayModeInput.value === 'icon-only-rounded') {
                return 'icon-only-rounded';
            }

            return 'button';
        },

        $normalizeBtnType: function (value) {
            const allowed = [
                '',
                'primary',
                'primary-outline',
                'secondary',
                'secondary-outline',
                'success',
                'success-outline',
                'danger',
                'danger-outline',
                'warning',
                'warning-outline',
                'info',
                'info-outline',
                'light',
                'light-outline',
                'dark',
                'dark-outline',
                'white',
                'white-outline',
                'link',
                'link-body'
            ];

            value = (value || '').toString().trim();

            if (allowed.contains(value)) {
                return value;
            }

            return 'primary';
        },

        $normalizeFlag: function (value) {
            if (
                value === true ||
                value === 1 ||
                value === '1'
            ) {
                return 1;
            }

            return 0;
        },

        $normalizeBrickId: function (value) {
            const brickId = parseInt(value, 10);

            if (!isNaN(brickId) && brickId > 0) {
                return brickId;
            }

            return '';
        },

        $normalizeBrickTitle: function (value) {
            return (value || '').toString().trim();
        },

        $normalizePopupDimension: function (value) {
            const dimension = parseInt(value, 10);

            if (!isNaN(dimension) && dimension > 0) {
                return dimension;
            }

            return '';
        },

        $setOpenBrickTitleDisplay: function (Form, title) {
            const displayElm = Form.getElement('[data-name="openBrickTitleDisplay"]');

            if (!displayElm) {
                return;
            }

            title = this.$normalizeBrickTitle(title);

            if (!title) {
                displayElm.set('text', '');
                return;
            }

            displayElm.set(
                'text',
                QUILocale.get(lg, 'quiqqer.bricks.buttons.settings.createPopup.openBrick.titleLabel') +
                ': ' + title
            );
        },

        $openBrickSelectWindow: function (Form) {
            const self = this;

            require([
                'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow'
            ], function (BrickSelectWindow) {
                const projectData = self.$getProjectAndLang();

                new BrickSelectWindow({
                    project: projectData.project,
                    lang: projectData.lang,
                    multiple: false,
                    events: {
                        onSubmit: function (Win, bricks) {
                            if (!bricks.length) {
                                return;
                            }

                            Form.elements.openBrickId.value = self.$normalizeBrickId(bricks[0].id);
                            Form.elements.openBrickTitle.value = self.$normalizeBrickTitle(bricks[0].title);
                            self.$setOpenBrickTitleDisplay(Form, Form.elements.openBrickTitle.value);
                        }
                    }
                }).open();
            });
        },

        $getProjectAndLang: function () {
            const Project = this.getAttribute('project');
            let project = false;
            let lang = false;

            if (!Project) {
                return {
                    project: project,
                    lang: lang
                };
            }

            if (typeOf(Project) === 'string') {
                const projectData = Project.split(',');

                if (projectData.length === 2) {
                    project = projectData[0];
                    lang = projectData[1];
                }

                return {
                    project: project,
                    lang: lang
                };
            }

            if (Project.project) {
                project = Project.project;
            }

            if (Project.lang) {
                lang = Project.lang;
            }

            if ("getName" in Project) {
                project = Project.getName();
            }

            if ("getLang" in Project) {
                lang = Project.getLang();
            }

            return {
                project: project,
                lang: lang
            };
        }
    });
});
