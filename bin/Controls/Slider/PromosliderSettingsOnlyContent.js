/**
 * Wallpaper Slider mit zwei Inhaltsbereichen
 */
define('package/quiqqer/bricks/bin/Controls/Slider/PromosliderSettingsOnlyContent', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Button',
    'qui/controls/buttons/Switch',
    'Locale',
    'Mustache',
    'controls/grid/Grid',
    'utils/Controls',

    'text!package/quiqqer/bricks/bin/Controls/Slider/PromosliderSettingsOnlyContentEntry.html',
    'css!package/quiqqer/bricks/bin/Controls/Slider/PromoSliderSettings.css'

], function (QUI, QUIControl, QUIConfirm, QUIButton, QUISwitch, QUILocale,
             Mustache, Grid, ControlsUtils, templateEntry) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/Slider/PromosliderSettings',

        Binds: [
            '$onImport',
            '$openAddDialog',
            '$openDeleteDialog',
            '$openEditDialog',
            '$toggleSlideStatus',
            'update'
        ],

        initialize: function (options) {
            this.parent(options);

            this.$Input = null;
            this.$Grid = null;

            this.$data = [];

            this.addEvents({
                onImport: this.$onImport
            });
        },

        /**
         * event: on import
         */
        $onImport: function () {
            this.$Input = this.getElm();

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-promoslider-settings',
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

            // exist label?
            const id = this.$Input.get('id'),
                Label = document.getElement('label[for="extraField_' + id + '"]');

            if (Label) {
                const Cell = Label.getParent('td'),
                    OldCell = this.$Elm.getParent('td');

                Cell.set('colspan', 2);

                this.$Elm.inject(Cell);
                OldCell.destroy();
            }

            // grid and sizes
            const size = this.$Elm.getSize();

            const Desktop = new Element('div', {
                styles: {
                    width: size.x
                }
            }).inject(this.$Elm);

            this.$Grid = new Grid(Desktop, {
                height: 400,
                width: size.x,
                buttons: [{
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
                }],
                columnModel: [{
                    header: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.isDisabled.short'),
                    dataIndex: 'isDisabledDisplay',
                    dataType: 'QUI',
                    width: 60
                }, {
                    dataIndex: 'isDisabled',
                    hidden: true
                }, {
                    header: QUILocale.get('quiqqer/core', 'title'),
                    dataIndex: 'title',
                    dataType: 'string',
                    width: 100
                }, {
                    header: QUILocale.get('quiqqer/core', 'image'),
                    dataIndex: 'imagePreview',
                    dataType: 'node',
                    width: 60
                }, {
                    header: QUILocale.get(lg, 'quiqqer.products.control.promoslider.left'),
                    dataIndex: 'left',
                    dataType: 'code',
                    width: 300
                }, {
                    header: QUILocale.get(lg, 'quiqqer.products.control.promoslider.right'),
                    dataIndex: 'right',
                    dataType: 'code',
                    width: 300
                }, {
                    header: QUILocale.get(lg, 'quiqqer.products.control.promoslider.url'),
                    dataIndex: 'url',
                    dataType: 'string',
                    width: 300
                }, {
                    header: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.newTab.short'),
                    dataIndex: 'newTabDisplay',
                    dataType: 'node',
                    width: 60
                }, {
                    dataIndex: 'newTab',
                    hidden: true
                }, {
                    dataIndex: 'image',
                    dataType: 'string',
                    hidden: true
                }]
            });

            this.$Grid.addEvents({
                onClick: function () {
                    const buttons = this.$Grid.getButtons(),

                        Edit = buttons.filter(function (Btn) {
                            return Btn.getAttribute('name') === 'edit';
                        })[0],

                        Up = buttons.filter(function (Btn) {
                            return Btn.getAttribute('name') === 'up';
                        })[0],

                        Down = buttons.filter(function (Btn) {
                            return Btn.getAttribute('name') === 'down';
                        })[0],

                        Delete = buttons.filter(function (Btn) {
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


            try {
                this.$data = JSON.decode(this.$Input.value);

                if (typeOf(this.$data) !== 'array') {
                    this.$data = [];
                }

                this.refresh();
            } catch (e) {
            }
        },


        /**
         * Toggles the slide's status between enabled and disabled
         *
         * @param {Object} Caller
         */
        $toggleSlideStatus: function (Caller) {
            if (!Caller) {
                return;
            }

            // get cell number
            const row = Caller.getElm().getParent('li').get('data-row');

            this.$data[row].isDisabled = Caller.getStatus();
            this.update();
        },

        /**
         * Resize the control
         *
         * @return {Promise}
         */
        resize: function () {
            const size = this.getElm().getSize();

            return this.$Grid.setWidth(size.x).then(function () {
                this.$Grid.resize();
            }.bind(this));
        },

        /**
         * refresh the display
         */
        refresh: function () {
            let i, len, entry, insert;
            const data = [];

            for (i = 0, len = this.$data.length; i < len; i++) {
                entry = this.$data[i];
                insert = {
                    image: '',
                    imagePreview: new Element('span', {html: '&nbsp;'})
                };

                entry.isDisabled = parseInt(entry.isDisabled);

                insert.isDisabledDisplay = new QUISwitch({
                    status: entry.isDisabled,
                    events: {
                        onChange: this.$toggleSlideStatus
                    }
                });

                if ("title" in entry) {
                    insert.title = entry.title;
                }

                if ("image" in entry && entry.image !== '') {
                    insert.image = entry.image;

                    insert.imagePreview = new Element('img', {
                        src: URL_DIR + insert.image + '&maxwidth=50&maxheight=50'
                    });
                }

                if ("left" in entry) {
                    insert.left = entry.left;
                }

                if ("right" in entry) {
                    insert.right = entry.right;
                }

                if ("url" in entry) {
                    insert.url = entry.url;
                }

                if ("newTab" in entry) {
                    entry.newTab = parseInt(entry.newTab);

                    insert.newTabDisplay = new Element('span', {
                        'class': entry.newTab === 1 ? 'fa fa-check' : 'fa fa-times',
                        'data-enabled': entry.newTab
                    });
                }

                data.push(insert);
            }

            this.$Grid.setData({
                data: data
            });

            const buttons = this.$Grid.getButtons(),

                Edit = buttons.filter(function (Btn) {
                    return Btn.getAttribute('name') === 'edit';
                })[0],

                Up = buttons.filter(function (Btn) {
                    return Btn.getAttribute('name') === 'up';
                })[0],

                Down = buttons.filter(function (Btn) {
                    return Btn.getAttribute('name') === 'down';
                })[0],

                Delete = buttons.filter(function (Btn) {
                    return Btn.getAttribute('name') === 'delete';
                })[0];


            Up.disable();
            Down.disable();
            Edit.disable();
            Delete.disable();
        },

        /**
         * Refresh the data sorting in dependence of the grid
         */
        $refreshSorting: function () {
            const gridData = this.$Grid.getData(),
                data = [];

            for (let i = 0, len = gridData.length; i < len; i++) {
                data.push({
                    title: gridData[i].title,
                    image: gridData[i].image,
                    left: gridData[i].left,
                    right: gridData[i].right,
                    url: gridData[i].url || '',
                    newTab: parseInt(gridData[i].newTab),
                    isDisabled: parseInt(gridData[i].isDisabled)
                });
            }

            this.$data = data;
            this.update();
        },

        /**
         * Update the field
         */
        update: function () {
            this.$Input.value = JSON.encode(this.$data);
        },

        /**
         * Add an entry
         *
         * @param {string} [title] - slide title
         * @param {string} [left] - left content
         * @param {string} [right] - right content
         * @param {string} [image] - image
         * @param {string} [url] - click url
         * @param {number} [newTab] - open url in new tab?
         * @param {number} [isDisabled] - is the slide enabled?
         */
        add: function (title, left, right, image, url, newTab, isDisabled) {
            this.$data.push({
                title: title || '',
                left: left || '',
                right: right || '',
                image: image || '',
                url: url || '',
                newTab: parseInt(newTab),
                isDisabled: parseInt(isDisabled)
            });

            this.refresh();
            this.update();
        },

        /**
         * Edit an entry
         *
         * @param {number} index
         * @param {string} [title] - slide title
         * @param {string} [left] - left content
         * @param {string} [right] - right content
         * @param {string} [image] - image path
         * @param {string} [url] - click url
         * @param {number} [newTab] - open url in new tab?
         * @param {number} [isDisabled] - is the slide disabled? ("1" or "0")
         */
        edit: function (index, title, left, right, image, url, newTab, isDisabled) {
            if (typeof index === 'undefined') {
                return;
            }

            this.$data[index] = {
                title: title || '',
                left: left || '',
                right: right || '',
                image: image || '',
                url: url || '',
                newTab: parseInt(newTab),
                isDisabled: parseInt(isDisabled)
            };

            this.refresh();
            this.update();
        },

        /**
         * Delete one entry or multiple entries
         *
         * @param {number|array} index
         */
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

        /**
         * Set the used project
         *
         * @param {string|object} Project
         */
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

        /**
         * Dialogs
         */

        /**
         * opens the delete dialog
         *
         * @return {Promise}
         */
        $openDeleteDialog: function () {
            new QUIConfirm({
                icon: 'fa fa-icon',
                title: QUILocale.get(lg, 'quiqqer.products.control.delete.title'),
                text: QUILocale.get(lg, 'quiqqer.products.control.delete.text'),
                information: QUILocale.get(lg, 'quiqqer.products.control.delete.information'),
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

        /**
         * Open edit dialog
         *
         * @retrun {Promise}
         */
        $openEditDialog: function () {
            let self = this,
                data = this.$Grid.getSelectedData(),
                index = this.$Grid.getSelectedIndices();

            if (!data.length) {
                return Promise.resolve();
            }

            data = data[0];
            index = index[0];

            return this.$createDialog().then(function (Dialog) {
                Dialog.addEvent('onOpenAfterCreate', function () {
                    const Content = Dialog.getContent();
                    const Form = Content.getElement('form');

                    const Title = Form.elements.title;
                    const Left = Form.elements.left;
                    const Right = Form.elements.right;
                    const Image = Form.elements.image;
                    const Url = Form.elements.url;

                    if (data.isDisabled) {
                        Dialog.IsDisabledSwitch.on();
                    } else {
                        Dialog.IsDisabledSwitch.off();
                    }

                    Title.value = data.title || '';
                    Left.value = data.left || '';
                    Right.value = data.right || '';
                    Image.value = data.image || '';
                    Url.value = data.url || '';

                    if (data.newTab && parseInt(data.newTab.getAttribute('data-enabled')) === 1) {
                        Dialog.NewTabSwitch.on();
                    } else {
                        Dialog.NewTabSwitch.off();
                    }

                    Image.fireEvent('change');
                });

                Dialog.addEvent('onSubmit', function () {
                    Dialog.Loader.show();

                    const Content = Dialog.getContent();
                    const Form = Content.getElement('form');

                    const Title = Form.elements.title;
                    const Left = Form.elements.left;
                    const Right = Form.elements.right;
                    const Image = Form.elements.image;
                    const Url = Form.elements.url;

                    self.edit(
                        index,
                        Title.value,
                        Left.value,
                        Right.value,
                        Image.value,
                        Url.value,
                        Dialog.NewTabSwitch.getStatus(),
                        Dialog.IsDisabledSwitch.getStatus()
                    );

                    Dialog.close();
                });

                Dialog.setAttribute('title', QUILocale.get(lg, 'quiqqer.bricks.promoslider.editialog.title'));
                Dialog.open();
            });
        },

        /**
         *
         * @returns {Promise}
         */
        $openAddDialog: function () {
            const self = this;

            return this.$createDialog().then(function (Dialog) {
                Dialog.addEvent('onSubmit', function () {
                    Dialog.Loader.show();

                    const Content = Dialog.getContent();
                    const Form = Content.getElement('form');

                    const Title = Form.elements.title;
                    const Left = Form.elements.left;
                    const Right = Form.elements.right;
                    const Image = Form.elements.image;
                    const Url = Form.elements.url;

                    self.add(
                        Title.value,
                        Left.value,
                        Right.value,
                        Image.value,
                        Url.value,
                        Dialog.NewTabSwitch.getStatus(),
                        Dialog.IsDisabledSwitch.getStatus()
                    );

                    Dialog.close();
                });

                Dialog.open();
            });
        },

        /**
         * Create a edit / add entry dialog
         *
         * @return {Promise}
         */
        $createDialog: function () {
            const self = this;

            return new Promise(function (resolve) {
                const Dialog = new QUIConfirm({
                    title: QUILocale.get(lg, 'quiqqer.bricks.promoslider.adddialog.title'),
                    icon: 'fa fa-edit',
                    maxWidth: 800,
                    maxHeight: 600,
                    autoclose: false,
                    NewTabSwitch: false,
                    events: {
                        onOpen: function (Win) {
                            Win.Loader.show();
                            Win.getContent().set('html', '');

                            const Container = new Element('div', {
                                html: Mustache.render(templateEntry, {
                                    fieldIsDisabled: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.isDisabled'),
                                    fieldImage: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.image'),
                                    fieldUrl: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.url'),
                                    fieldUrlWarning: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.url.warning'),
                                    fieldNewTab: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.newTab'),
                                    fieldTitle: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.title'),
                                    fieldDescription: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.text'),
                                    fieldType: QUILocale.get(lg, 'quiqqer.bricks.promoslider.create.align'),
                                    fieldLeft: QUILocale.get(lg, 'quiqqer.products.control.promoslider.left'),
                                    fieldRight: QUILocale.get(lg, 'quiqqer.products.control.promoslider.right')
                                }),
                                'class': 'quiqqer-bricks-promoslider-settings-entry'
                            }).inject(Win.getContent());

                            const Text = Container.getElement('.field-description');

                            Text.getParent().setStyles({
                                height: 100
                            });

                            Win.IsDisabledSwitch = new QUISwitch({
                                name: 'isDisabled',
                                status: false
                            }).inject(Container.getElement('#isDisabledWrapper'));

                            Win.NewTabSwitch = new QUISwitch({
                                name: 'newTab'
                            }).inject(Container.getElement('#newTabWrapper'));

                            QUI.parse(Container).then(function () {
                                return ControlsUtils.parse(Container);
                            }).then(function () {
                                const controls = QUI.Controls.getControlsInElement(Container),
                                    project = self.getAttribute('project');

                                controls.each(function (Control) {
                                    if (Control === self) {
                                        return;
                                    }

                                    if ("setProject" in Control) {
                                        Control.setProject(project);
                                    }
                                });

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
                            });
                        }
                    }
                });

                resolve(Dialog);
            });
        }
    });
});
