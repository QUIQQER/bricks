define('package/quiqqer/bricks/bin/Controls/backend/AccordionSettings', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Switch',
    'Locale',
    'Mustache',
    'controls/grid/Grid',
    'utils/Controls',

    'text!package/quiqqer/bricks/bin/Controls/backend/AccordionSettings.html',
    'css!package/quiqqer/bricks/bin/Controls/backend/AccordionSettings.css'

], function (QUI, QUIControl, QUIConfirm, QUISwitch, QUILocale, Mustache, Grid, ControlsUtils, template) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/AccordionSettings',

        Binds: [
            '$onImport',
            '$openAddDialog',
            '$openDeleteDialog',
            '$openEditDialog',
            '$toggleEntryStatus',
            '$onDestroy',
            'resize',
            'update'
        ],

        initialize: function (options) {
            this.parent(options);

            this.$Input = null;
            this.$Grid = null;
            this.$Elm = null;
            this.$Desktop = null;
            this.$Project = null;
            this.$data = [];

            this.addEvents({
                onImport: this.$onImport,
                onDestroy: this.$onDestroy
            });
        },

        $onImport: function () {
            this.$Input = this.getElm();

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-accordion-settings',
                styles: {
                    clear: 'both',
                    'float': 'left',
                    height: '100%',
                    minHeight: 400,
                    overflow: 'hidden',
                    position: 'relative',
                    margin: 0,
                    width: '100%'
                }
            }).wraps(this.$Input);

            const size = this.$getAvailableSize();

            this.$Elm.setStyles({
                height: size.y
            });

            this.$Desktop = new Element('div', {
                styles: {
                    height: size.y,
                    width: size.x
                }
            }).inject(this.$Elm);

            this.$Grid = new Grid(this.$Desktop, {
                height: size.y,
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
                        header: QUILocale.get(lg, 'brick.accordion.settings.disabled.short'),
                        dataIndex: 'disabledDisplay',
                        dataType: 'QUI',
                        width: 90
                    }, {
                        dataIndex: 'disabled',
                        hidden: true
                    }, {
                        header: QUILocale.get(lg, 'brick.accordion.settings.title'),
                        dataIndex: 'entryTitle',
                        dataType: 'code',
                        width: 220
                    }, {
                        dataIndex: 'entryContent',
                        hidden: true
                    }, {
                        header: QUILocale.get(lg, 'brick.accordion.settings.content'),
                        dataIndex: 'entryContentPreview',
                        dataType: 'code',
                        width: 500
                    }
                ]
            });

            this.$Grid.addEvents({
                onClick: this.$toggleActionButtons.bind(this),
                onDblClick: this.$openEditDialog
            });

            this.$Grid.getElm().setStyles({
                position: 'absolute'
            });

            this.$parseInputValue();
            this.resize();
            QUI.addEvent('resize', this.resize);
        },

        $onDestroy: function () {
            QUI.removeEvent('resize', this.resize);
        },

        $parseInputValue: function () {
            try {
                this.$data = JSON.decode(this.$Input.value);

                if (typeOf(this.$data) !== 'array') {
                    this.$data = [];
                }
            } catch (e) {
                this.$data = [];
            }

            this.refresh();
        },

        $toggleEntryStatus: function (Caller) {
            if (!Caller) {
                return;
            }

            const row = Caller.getElm().getParent('li').get('data-row');

            if (!this.$data[row]) {
                return;
            }

            this.$data[row].disabled = Caller.getStatus() ? 1 : 0;
            this.update();
            this.refresh();
        },

        $toggleActionButtons: function () {
            const buttons = this.$Grid.getButtons();
            const edit = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'edit';
            })[0];
            const up = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'up';
            })[0];
            const down = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'down';
            })[0];
            const del = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'delete';
            })[0];

            up.enable();
            down.enable();
            edit.enable();
            del.enable();
        },

        $getAvailableSize: function () {
            const Container = this.$Elm.getParent('.quiqqer-bricks-container');
            const Parent = this.$Elm.getParent();
            let width = 0;
            let height = 0;

            if (Container) {
                const containerSize = Container.getSize();
                const top = this.$Elm.getPosition(Container).y;

                width = containerSize.x;
                height = containerSize.y - top;
            }

            if (!width && Parent) {
                width = Parent.getSize().x;
            }

            if (!height && Parent) {
                height = Parent.getSize().y;
            }

            if (!width) {
                width = this.$Elm.getSize().x;
            }

            return {
                x: Math.max(width, 400),
                y: Math.max(height, 400)
            };
        },

        resize: function () {
            if (!this.$Grid || !this.$Elm || !this.$Desktop) {
                return Promise.resolve();
            }

            const size = this.$getAvailableSize();

            this.$Elm.setStyles({
                height: size.y
            });

            this.$Desktop.setStyles({
                height: size.y,
                width: size.x
            });

            this.$Grid.setHeight(size.y);

            return this.$Grid.setWidth(size.x).then(function () {
                this.$Grid.resize();
            }.bind(this));
        },

        refresh: function () {
            const data = [];

            for (let i = 0, len = this.$data.length; i < len; i++) {
                const entry = this.$data[i];
                const disabled = this.$normalizeDisabled(entry);

                data.push({
                    disabled: disabled,
                    disabledDisplay: new QUISwitch({
                        status: disabled,
                        name: i,
                        uid: i,
                        events: {
                            onChange: this.$toggleEntryStatus
                        }
                    }),
                    entryTitle: 'entryTitle' in entry ? entry.entryTitle : '',
                    entryContent: 'entryContent' in entry ? entry.entryContent : '',
                    entryContentPreview: this.$createContentPreview(entry)
                });
            }

            this.$Grid.setData({
                data: data
            });

            this.$disableActionButtons();
        },

        $createContentPreview: function (entry) {
            if (!('entryContent' in entry) || !entry.entryContent) {
                return '';
            }

            const text = new Element('div', {
                html: entry.entryContent
            }).get('text').trim();

            if (text.length <= 160) {
                return text;
            }

            return text.substring(0, 157) + '...';
        },

        $normalizeDisabled: function (entry) {
            if (!entry || !('disabled' in entry)) {
                return 0;
            }

            if (entry.disabled === true || entry.disabled === 1 || entry.disabled === '1') {
                return 1;
            }

            return 0;
        },

        $disableActionButtons: function () {
            const buttons = this.$Grid.getButtons();
            const edit = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'edit';
            })[0];
            const up = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'up';
            })[0];
            const down = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'down';
            })[0];
            const del = buttons.filter(function (Btn) {
                return Btn.getAttribute('name') === 'delete';
            })[0];

            up.disable();
            down.disable();
            edit.disable();
            del.disable();
        },

        update: function () {
            this.$Input.value = JSON.encode(this.$data);
        },

        add: function (params) {
            this.$data.push({
                disabled: 'disabled' in params ? parseInt(params.disabled) : 0,
                entryTitle: 'entryTitle' in params ? params.entryTitle : '',
                entryContent: 'entryContent' in params ? params.entryContent : ''
            });

            this.refresh();
            this.update();
        },

        edit: function (index, params) {
            if (typeof index === 'undefined') {
                return;
            }

            this.$data[index] = {
                disabled: 'disabled' in params ? parseInt(params.disabled) : 0,
                entryTitle: 'entryTitle' in params ? params.entryTitle : '',
                entryContent: 'entryContent' in params ? params.entryContent : ''
            };

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
            this.$Project = Project;
            this.setAttribute('project', Project);
        },

        $refreshSorting: function () {
            const gridData = this.$Grid.getData();
            const data = [];

            for (let i = 0, len = gridData.length; i < len; i++) {
                data.push({
                    disabled: parseInt(gridData[i].disabled) ? 1 : 0,
                    entryTitle: gridData[i].entryTitle,
                    entryContent: gridData[i].entryContent
                });
            }

            this.$data = data;
            this.update();
            this.refresh();
        },

        $openDeleteDialog: function () {
            new QUIConfirm({
                icon: 'fa fa-trash',
                title: QUILocale.get(lg, 'brick.accordion.settings.delete.title'),
                text: QUILocale.get(lg, 'brick.accordion.settings.delete.text'),
                information: QUILocale.get(lg, 'brick.accordion.settings.delete.information'),
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
                        this.refresh();
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

            data = this.$data[index[0]];
            index = index[0];

            return this.$createDialog().then(function (Dialog) {
                const self = this;
                Dialog.addEvent('onSubmit', function () {
                    Dialog.Loader.show();

                    const Form = Dialog.getContent().getElement('form');

                    self.edit(index, {
                        disabled: Dialog.DisabledSwitch.getStatus() ? 1 : 0,
                        entryTitle: Form.elements.entryTitle.value,
                        entryContent: Form.elements.entryContent.value
                    });

                    Dialog.close();
                }.bind(this));

                Dialog.addEvent('onOpenAfterCreate', function () {
                    const Form = Dialog.getContent().getElement('form');

                    if (this.$normalizeDisabled(data)) {
                        Dialog.DisabledSwitch.on();
                    } else {
                        Dialog.DisabledSwitch.off();
                    }

                    Form.elements.entryTitle.value = data.entryTitle || '';
                    Form.elements.entryContent.value = data.entryContent || '';
                    Form.elements.entryTitle.fireEvent('change');
                    Form.elements.entryContent.fireEvent('change');
                }.bind(this));

                Dialog.setAttribute('title', QUILocale.get('quiqqer/core', 'edit'));
                Dialog.open();
            }.bind(this));
        },

        $openAddDialog: function () {
            return this.$createDialog().then(function (Dialog) {
                Dialog.addEvent('onSubmit', function () {
                    Dialog.Loader.show();

                    const Form = Dialog.getContent().getElement('form');

                    this.add({
                        disabled: Dialog.DisabledSwitch.getStatus() ? 1 : 0,
                        entryTitle: Form.elements.entryTitle.value,
                        entryContent: Form.elements.entryContent.value
                    });

                    Dialog.close();
                }.bind(this));

                Dialog.open();
            }.bind(this));
        },

        $createDialog: function () {
            return new Promise(function (resolve) {
                const Dialog = new QUIConfirm({
                    title: QUILocale.get(lg, 'bricks.accordion.settings.addButton'),
                    icon: 'fa fa-edit',
                    maxWidth: 900,
                    maxHeight: 700,
                    autoclose: false,
                    events: {
                        onOpen: function (Win) {
                            Win.Loader.show();
                            Win.getContent().set('html', '');

                            const Container = new Element('div', {
                                html: Mustache.render(template, {
                                    disabled: QUILocale.get(lg, 'brick.accordion.settings.disabled'),
                                    title: QUILocale.get(lg, 'brick.accordion.settings.title'),
                                    content: QUILocale.get(lg, 'brick.accordion.settings.content')
                                }),
                                'class': 'quiqqer-bricks-accordion-settings-dialog'
                            }).inject(Win.getContent());

                            const contentField = Container.getElement('.field-entryContent');

                            contentField.getParent().setStyles({
                                height: 220
                            });

                            Win.DisabledSwitch = new QUISwitch({
                                name: 'disabled',
                                status: false
                            }).inject(Container.getElement('#disabledWrapper'));

                            QUI.parse(Container).then(function () {
                                return ControlsUtils.parse(Container);
                            }).then(function () {
                                if (this.$Project) {
                                    const controls = QUI.Controls.getControlsInElement(Container);

                                    controls.each(function (Control) {
                                        if ("setProject" in Control) {
                                            Control.setProject(this.$Project);
                                        }
                                    }.bind(this));
                                }

                                Win.fireEvent('openAfterCreate', [Win]);
                                Win.Loader.hide();
                                resolve(Dialog);
                            }.bind(this));
                        }.bind(this)
                    }
                });

                resolve(Dialog);
            }.bind(this));
        }
    });
});
