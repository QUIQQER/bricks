define('package/quiqqer/bricks/bin/Controls/Slider/CustomerReviewsFlowSettings', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Switch',
    'Locale',
    'Mustache',
    'controls/grid/Grid',
    'utils/Controls',

    'text!package/quiqqer/bricks/bin/Controls/Slider/CustomerReviewsFlowSettingsEntry.html',
    'css!package/quiqqer/bricks/bin/Controls/Slider/CustomerReviewsFlowSettings.css'

], function (QUI,
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
    const createPopupPrefix = 'quiqqer.bricks.customerReviewsFlow.settings.createPopup.';
    const gridPrefix = 'quiqqer.bricks.customerReviewsFlow.create.';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/Slider/CustomerReviewsFlowSettings',

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

        $onImport: function () {
            this.$Input = this.getElm();

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-customerReviewsFlow-settings',
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
                        header: QUILocale.get(lg, gridPrefix + 'isDisabled.short'),
                        dataIndex: 'isDisabledDisplay',
                        dataType: 'QUI',
                        width: 80
                    }, {
                        dataIndex: 'isDisabled',
                        hidden: true
                    }, {
                        header: QUILocale.get(lg, gridPrefix + 'avatar.short'),
                        dataIndex: 'imagePreview',
                        dataType: 'node',
                        width: 80
                    }, {
                        header: QUILocale.get(lg, gridPrefix + 'customerName.short'),
                        dataIndex: 'customerName',
                        dataType: 'code',
                        width: 160
                    }, {
                        header: QUILocale.get(lg, gridPrefix + 'addition.short'),
                        dataIndex: 'addition',
                        dataType: 'code',
                        width: 160
                    }, {
                        header: QUILocale.get(lg, gridPrefix + 'url.short'),
                        dataIndex: 'url',
                        dataType: 'code',
                        width: 120
                    }, {
                        header: QUILocale.get(lg, gridPrefix + 'urlTitle.short'),
                        dataIndex: 'urlTitle',
                        dataType: 'code',
                        width: 120
                    }, {
                        header: QUILocale.get(lg, gridPrefix + 'review.short'),
                        dataIndex: 'review',
                        dataType: 'code',
                        width: 300
                    }, {
                        dataIndex: 'image',
                        dataType: 'string',
                        hidden: true
                    }
                ]
            });

            this.$Grid.addEvents({
                onClick: function () {
                    const buttons = this.$Grid.getButtons();

                    buttons.filter(function (Btn) {
                        return ['up', 'down', 'edit', 'delete'].contains(Btn.getAttribute('name'));
                    }).forEach(function (Btn) {
                        Btn.enable();
                    });
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

        $toggleSlideStatus: function (Caller) {
            if (!Caller) {
                return;
            }

            const row = Caller.getElm().getParent('li').get('data-row');
            this.$data[row].isDisabled = Caller.getStatus();
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

            this.$data.forEach(function (entry, i) {
                const insert = {
                    image: '',
                    imagePreview: new Element('span', {
                        html: '&nbsp;'
                    })
                };

                entry.isDisabled = parseInt(entry.isDisabled);

                insert.isDisabledDisplay = new QUISwitch({
                    status: entry.isDisabled,
                    name: i,
                    uid: i,
                    events: {
                        onChange: this.$toggleSlideStatus
                    }
                });

                if ("image" in entry && entry.image !== '') {
                    insert.image = entry.image;
                    insert.imagePreview = new Element('img', {
                        src: URL_DIR + insert.image + '&maxwidth=50&maxheight=50'
                    });
                }

                insert.customerName = entry.customerName || '';
                insert.addition = entry.addition || '';
                insert.url = entry.url || '';
                insert.urlTitle = entry.urlTitle || '';
                insert.review = entry.review || '';

                data.push(insert);
            }.bind(this));

            this.$Grid.setData({
                data: data
            });

            const buttons = this.$Grid.getButtons();

            buttons.filter(function (Btn) {
                return ['up', 'down', 'edit', 'delete'].contains(Btn.getAttribute('name'));
            }).forEach(function (Btn) {
                Btn.disable();
            });
        },

        update: function () {
            this.$Input.value = JSON.encode(this.$data);
        },

        add: function (params) {
            this.$data.push({
                image: params.image || '',
                customerName: params.customerName || '',
                addition: params.addition || '',
                url: params.url || '',
                urlTitle: params.urlTitle || '',
                review: params.review || '',
                isDisabled: parseInt(params.isDisabled || 0)
            });

            this.refresh();
            this.update();
        },

        edit: function (index, params) {
            if (typeof index === 'undefined') {
                return;
            }

            this.$data[index] = {
                image: params.image || '',
                customerName: params.customerName || '',
                addition: params.addition || '',
                url: params.url || '',
                urlTitle: params.urlTitle || '',
                review: params.review || '',
                isDisabled: parseInt(params.isDisabled || 0)
            };

            this.refresh();
            this.update();
        },

        del: function (index) {
            const newList = [];

            if (typeOf(index) !== 'array') {
                index = [index];
            }

            this.$data.forEach(function (entry, i) {
                if (!index.contains(i)) {
                    newList.push(entry);
                }
            });

            this.$data = newList;
        },

        setProject: function (Project) {
            this.setAttribute('project', Project);

            QUI.Controls.getControlsInElement(this.getElm()).each(function (Control) {
                if (Control === this) {
                    return;
                }

                if ("setProject" in Control) {
                    Control.setProject(Project);
                }
            }.bind(this));
        },

        $refreshSorting: function () {
            const data = [];

            this.$Grid.getData().forEach(function (row) {
                data.push({
                    isDisabled: parseInt(row.isDisabled),
                    image: row.image,
                    customerName: row.customerName,
                    addition: row.addition,
                    url: row.url,
                    urlTitle: row.urlTitle,
                    review: row.review
                });
            });

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
                    const Form = Dialog.getContent().getElement('form');

                    this.edit(index, {
                        image: Form.elements.image.value,
                        customerName: Form.elements.customerName.value,
                        addition: Form.elements.addition.value,
                        url: Form.elements.url.value,
                        urlTitle: Form.elements.urlTitle.value,
                        review: Form.elements.review.value,
                        isDisabled: Dialog.IsDisabledSwitch.getStatus()
                    });

                    Dialog.close();
                }.bind(this));

                Dialog.addEvent('onOpenAfterCreate', function () {
                    const Form = Dialog.getContent().getElement('form');

                    data.isDisabled ? Dialog.IsDisabledSwitch.on() : Dialog.IsDisabledSwitch.off();

                    Form.elements.image.value = data.image;
                    Form.elements.customerName.value = data.customerName;
                    Form.elements.addition.value = data.addition;
                    Form.elements.url.value = data.url;
                    Form.elements.urlTitle.value = data.urlTitle;
                    Form.elements.review.value = data.review;

                    Form.elements.image.fireEvent('change');
                    Form.elements.customerName.fireEvent('change');
                    Form.elements.addition.fireEvent('change');
                    Form.elements.url.fireEvent('change');
                    Form.elements.urlTitle.fireEvent('change');
                    Form.elements.review.fireEvent('change');
                });

                Dialog.setAttribute('title', QUILocale.get(lg, 'quiqqer.bricks.entires.editdialog.title'));
                Dialog.open();
            }.bind(this));
        },

        $openAddDialog: function () {
            return this.$createDialog().then(function (Dialog) {
                Dialog.addEvent('onSubmit', function () {
                    const Form = Dialog.getContent().getElement('form');

                    this.add({
                        image: Form.elements.image.value,
                        customerName: Form.elements.customerName.value,
                        addition: Form.elements.addition.value,
                        url: Form.elements.url.value,
                        urlTitle: Form.elements.urlTitle.value,
                        review: Form.elements.review.value,
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
                    maxHeight: 600,
                    autoclose: false,
                    IsDisabledSwitch: false,
                    events: {
                        onOpen: function (Win) {
                            Win.Loader.show();
                            Win.getContent().set('html', '');

                            const Container = new Element('div', {
                                html: Mustache.render(templateEntry, {
                                    fieldIsDisabled: QUILocale.get(lg, createPopupPrefix + 'disable'),
                                    fieldAvatar: QUILocale.get(lg, createPopupPrefix + 'avatar'),
                                    fieldCustomerName: QUILocale.get(lg, createPopupPrefix + 'customerName'),
                                    fieldAddition: QUILocale.get(lg, createPopupPrefix + 'addition'),
                                    fieldUrl: QUILocale.get(lg, createPopupPrefix + 'url'),
                                    fieldUrlTitle: QUILocale.get(lg, createPopupPrefix + 'urlTitle'),
                                    fieldReview: QUILocale.get(lg, createPopupPrefix + 'review')
                                }),
                                'class': 'quiqqer-bricks-customerReviewsFlow-settings-entry'
                            }).inject(Win.getContent());

                            Container.getElement('.field-description').getParent().setStyles({
                                height: 100
                            });

                            Win.IsDisabledSwitch = new QUISwitch({
                                name: 'isDisabled',
                                status: false
                            }).inject(Container.getElement('#isDisabledWrapper'));

                            QUI.parse(Container).then(function () {
                                return ControlsUtils.parse(Container);
                            }).then(function () {
                                const project = this.getAttribute('project');

                                QUI.Controls.getControlsInElement(Container).each(function (Control) {
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
        }
    });
});
