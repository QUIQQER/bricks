/**
 * Area edit control for the site object
 */
define('package/quiqqer/bricks/bin/Site/Area', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/buttons/Button',
    'qui/controls/windows/Popup',
    'qui/controls/windows/Alert',
    'qui/controls/windows/Confirm',
    'qui/controls/elements/List',
    'package/quiqqer/bricks/bin/Bricks',
    'package/quiqqer/bricks/bin/AddBrickWindow',
    'Locale',
    'Ajax',
    'package/quiqqer/bricks/bin/Sortables',

    'css!package/quiqqer/bricks/bin/Site/Area.css'

], function (QUI, QUIControl, QUIButton, QUIPopup, QUIAlert, QUIConfirm, QUIList, Bricks, AddBrickWindow, QUILocale, QUIAjax, Sortables) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Site/Area',

        Binds: [
            'openCreateBrickDialog',
            'openBrickDialog',
            'openBrickSettingDialog',
            'openSettingsDialog',
            'createNewBrick',
            '$ensureBrickAvailable',
            '$assignCreatedBrickToArea',
            '$openCreatedBrickEditor',
            '$saveAssignedBricks',
            '$syncBrickLabel',
            '$syncBrickLabels',
            '$onInject',
            '$onDestroy',
            '$onBrickRefresh'
        ],

        options: {
            name: '',
            description: '',
            title: {},
            Site: false,
            deactivate: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$availableBricks = [];
            this.$loaded = false;
            this.$brickIds = [];
            this.$onLoadBrickData = [];
            this.$brickCustomData = {};


            this.$CreateButton = false;
            this.$AddButton = false;
            this.$SettingsButton = false;
            this.$SortableButton = false;
            this.$MoreButton = false;

            this.$Title = false;
            this.$List = false;
            this.$FXExtraBtns = false;
            this.$ExtraBtns = false;

            this.addEvents({
                onInject: this.$onInject,
                onDestroy: this.$onDestroy
            });

            Bricks.addEvents({
                onBrickDelete: this.$onBrickRefresh,
                onBrickSave: this.$onBrickRefresh,
                onBrickCopy: this.$onBrickRefresh,
                onBrickCreate: this.$onBrickRefresh
            });
        },

        /**
         * event: on destroy
         */
        $onDestroy: function () {
            Bricks.removeEvents({
                onBrickDelete: this.$onBrickRefresh,
                onBrickSave: this.$onBrickRefresh,
                onBrickCopy: this.$onBrickRefresh,
                onBrickCreate: this.$onBrickRefresh
            });
        },

        /**
         * Return the DOMNode element
         *
         * @return {HTMLElement}
         */
        create: function () {
            const self = this,
                title = this.getAttribute('title');

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-site-category-area',
                html: '<div class="quiqqer-bricks-site-category-area-title">' +
                    QUILocale.get(title.group, title.var) +
                    '   <div class="quiqqer-bricks-site-category-area-buttons"></div>' +
                    '</div><ul class="quiqqer-bricks-site-category-area-list"></ul>',
                'data-name': this.getAttribute('name')
            });

            // Elements
            const Buttons = this.$Elm.getElement(
                '.quiqqer-bricks-site-category-area-buttons'
            );

            this.$ExtraBtns = new Element('div', {
                'class': 'quiqqer-bricks-site-category-area-extraButtons'
            });

            this.$Title = this.$Elm.getElement(
                '.quiqqer-bricks-site-category-area-title'
            );

            this.$FXExtraBtns = moofx(this.$ExtraBtns);

            this.$List = this.$Elm.getElement(
                '.quiqqer-bricks-site-category-area-list'
            );

            // buttons
            this.$CreateButton = new QUIButton({
                text: QUILocale.get(lg, 'site.area.button.create'),
                textimage: 'fa-solid fa-wand-magic-sparkles',
                disable: true,
                events: {
                    onClick: this.openCreateBrickDialog
                }
            }).inject(Buttons);

            this.$AddButton = new QUIButton({
                text: QUILocale.get(lg, 'site.area.button.add'),
                textimage: 'fa fa-plus',
                disable: true,
                events: {
                    onClick: this.openBrickDialog
                },
                styles: {
                    marginLeft: 5
                }
            }).inject(Buttons);

            this.$ExtraBtns.inject(Buttons);

            this.$MoreButton = new QUIButton({
                title: QUILocale.get(lg, 'site.area.button.area.more.openIt'),
                icon: 'fa fa-caret-left',
                events: {
                    onClick: function (Btn) {
                        if (Btn.getAttribute('icon') === 'fa fa-caret-left') {
                            self.openButtons();
                            return;
                        }

                        self.closeButtons();
                    }
                },
                styles: {
                    marginLeft: 5
                }
            }).inject(Buttons);

            // extra buttons
            this.$SettingsButton = new QUIButton({
                title: QUILocale.get(lg, 'site.area.button.area.settings'),
                icon: 'fa fa-gears',
                events: {
                    onClick: this.openSettingsDialog
                },
                styles: {
                    marginLeft: 10
                }
            }).inject(this.$ExtraBtns);

            this.$SortableButton = new QUIButton({
                title: QUILocale.get(lg, 'site.area.button.area.sort'),
                icon: 'fa fa-sort',
                events: {
                    onClick: function (Btn) {
                        if (Btn.isActive()) {
                            Btn.setNormal();
                            self.unsortable();
                            return;
                        }

                        Btn.setActive();
                        self.sortable();
                    }
                },
                styles: {
                    marginLeft: 5
                }
            }).inject(this.$ExtraBtns);


            return this.$Elm;
        },

        /**
         * Refresh the area display
         */
        refresh: function () {
            const self = this,
                size = this.$List.getComputedSize(),
                titleSize = this.$Title.getComputedSize();

            moofx(this.$Elm).animate({
                height: size.height + titleSize.height
            }, {
                duration: 250,
                equation: 'cubic-bezier(.42,.4,.46,1.29)',
                callback: function () {
                    self.$List.setStyle('position', null);

                    moofx(self.$List).animate({
                        opacity: 1
                    }, {
                        duration: 250,
                        equation: 'ease-out'
                    });
                }
            });
        },

        /**
         * event : on inject
         */
        $onInject: function () {
            const self = this;

            const Loader = new Element('div', {
                'class': 'quiqqer-bricks-site-category-area-loader',
                html: '<span class="fa fa-spinner fa-spin"></span>',
                styles: {
                    margin: 5
                }
            }).inject(this.$Elm);

            this.$List.setStyles({
                position: 'absolute',
                opacity: 0
            });

            this.$refreshAvailableBricks().then(function () {
                self.$CreateButton.enable();
                self.$AddButton.enable();
                self.$loaded = true;

                self.$brickIds.each(function (brickId) {
                    self.addBrickById(brickId);
                });

                const promises = [];

                self.$onLoadBrickData.each(function (brickData) {
                    promises.push(self.addBrick(brickData));
                });

                if (promises.length) {
                    Promise.all(promises).then(function () {
                        self.refresh();
                        Loader.destroy();
                    }).catch(function () {
                        Loader.destroy();
                    });

                    return;
                }

                Loader.destroy();
            });
        },

        /**
         * event : on brick changes
         */
        $onBrickRefresh: function () {
            this.$refreshAvailableBricks().then(this.$syncBrickLabels);
        },

        /**
         * Refresh the available bricks
         *
         * @return {*|Promise}
         */
        $refreshAvailableBricks: function () {
            const self = this,
                Site = this.getAttribute('Site'),
                Project = Site.getProject();

            return new Promise(function (resolve) {
                QUIAjax.get('package_quiqqer_bricks_ajax_project_getBricks', function (bricks) {
                    self.$availableBricks = bricks;
                    resolve(bricks);
                }, {
                    'package': 'quiqqer/bricks',
                    project: Project.encode(),
                    area: self.getAttribute('name')
                });
            });
        },

        /**
         * Activate the area
         */
        activate: function () {
            this.setAttribute('deactivate', false);
            this.getElm().removeClass('quiqqer-bricks-site-category-area-deactivate');

            this.$CreateButton.enable();
            this.$AddButton.enable();
        },

        /**
         * Deactivate the area
         */
        deactivate: function () {
            const self = this,
                data = this.getData();

            if (data.length && !("deactivate" in data[0])) {
                new QUIConfirm({
                    title: QUILocale.get(lg, 'site.area.window.deactivate.title'),
                    text: QUILocale.get(lg, 'site.area.window.deactivate.text'),
                    information: QUILocale.get(lg, 'site.area.window.deactivate.information'),
                    events: {
                        onSubmit: function () {
                            self.clear();
                            self.setAttribute('deactivate', true);
                            self.deactivate();
                        }
                    }
                }).open();

                return;
            }

            this.setAttribute('deactivate', true);

            this.$CreateButton.disable();
            this.$AddButton.disable();
            this.getElm().addClass('quiqqer-bricks-site-category-area-deactivate');
        },

        /**
         * Opens the brick creation dialog for the current area.
         */
        openCreateBrickDialog: function () {
            const Site = this.getAttribute('Site');

            if (!Site) {
                return;
            }

            const Project = Site.getProject();

            new AddBrickWindow({
                project: Project.getName(),
                lang: Project.getLang(),
                onBrickCreated: function (payload) {
                    return Bricks.saveBrick(payload.brickId, {
                        areas: this.getAttribute('name')
                    }).then(() => {
                        return this.$assignCreatedBrickToArea(payload.brickId);
                    }).then(() => {
                        this.$openCreatedBrickEditor(payload.brickId);
                        this.$saveAssignedBricks();
                    });
                }.bind(this)
            }).open();
        },

        /**
         * Add a brick by its brick data
         *
         * @param {Object} brickData - { brickId:1, inheritance:1 }
         * @return Promise
         */
        addBrick: function (brickData) {
            return new Promise(function (reslove, reject) {

                if ("deactivate" in brickData) {
                    this.clear();
                    this.setAttribute('deactivate', true);
                    this.deactivate();

                    reslove();
                    return;
                }


                if (!this.$loaded) {
                    this.$onLoadBrickData.push(brickData);
                    reslove();
                    return;
                }

                this.$ensureBrickAvailable(brickData.brickId).then(function () {
                    const BrickNode = this.addBrickById(brickData.brickId);

                    if (!BrickNode) {
                        reslove();
                        return;
                    }

                    this.$brickCustomData[BrickNode.get('id')] = {
                        customfields: brickData.customfields,
                        uid: brickData.uid
                    };

                    reslove();
                }.bind(this)).catch(function () {
                    reslove();
                });
            }.bind(this));
        },

        /**
         * Ensures the brick exists in the locally cached available list.
         *
         * @param {Number} brickId
         * @returns {Promise}
         */
        $ensureBrickAvailable: function (brickId) {
            brickId = parseInt(brickId);

            const found = this.$availableBricks.filter(function (Item) {
                return parseInt(Item.id) === brickId;
            });

            if (found.length) {
                return Promise.resolve(found[0]);
            }

            return Bricks.getBrick(brickId).then(function (result) {
                if (!result || !result.attributes || !result.attributes.id) {
                    return null;
                }

                this.$availableBricks.push(result.attributes);

                return result.attributes;
            }.bind(this));
        },

        /**
         * Add a brick by its ID
         *
         * @param {Number} brickId
         * @return {HTMLElement|Boolean} Brick-Node
         */
        addBrickById: function (brickId) {
            brickId = parseInt(brickId);

            if (!this.$loaded) {
                this.$brickIds.push(brickId);
                return false;
            }

            const found = this.$availableBricks.filter(function (Item) {
                return parseInt(Item.id) === brickId;
            });

            if (!found.length) {
                return false;
            }

            const BrickNode = this.createNewBrick();

            BrickNode.getElement('select').set('value', brickId);
            BrickNode.getElement('select').set('disabled', true);
            this.$syncBrickLabel(BrickNode.getElement('select'));

            this.refresh();

            return BrickNode;
        },

        /**
         * Removes all bricks in the area
         */
        clear: function () {
            this.getElm().getElements(
                '.quiqqer-bricks-site-category-area-brick'
            ).destroy();
        },

        /**
         * Add a new brick to the area
         */
        createNewBrick: function () {
            let i, len, Select;

            const self = this;

            const Elm = new Element('li', {
                'class': 'quiqqer-bricks-site-category-area-brick',
                html: '<select></select>' +
                    '<div class="quiqqer-bricks-site-category-area-brick-display" data-name="brick-display">' +
                    '   <span class="quiqqer-bricks-site-category-area-brick-title" data-name="brick-title"></span>' +
                    '   <span class="badge badge-warning badge-sm" data-name="brick-badge"></span>' +
                    '</div>' +
                    '<div class="btn-wrapper" data-name="btn-container"></div>',
                id: String.uniqueID()
            });

            Elm.inject(this.$List);

            Select = Elm.getElement('select');
            Select.set('disabled', true);
            Select.addEvent('change', function () {
                self.$syncBrickLabel(Select);
            });

            new QUIButton({
                title: QUILocale.get(lg, 'brick.sheet.edit.title'),
                icon: 'fa fa-edit',
                events: {
                    onClick: function () {
                        self.openBrick(Select);
                    }
                }
            }).inject(Elm.querySelector('[data-name="btn-container"]'));

            new QUIButton({
                title: QUILocale.get(lg, 'site.area.button.settings'),
                icon: 'fa fa-gear',
                events: {
                    onClick: function (Btn) {
                        const Elm = Btn.getElm(),
                            Parent = Elm.getParent('.quiqqer-bricks-site-category-area-brick'),
                            Select = Parent.getElement('select');

                        self.openBrickSettingDialog(Select);
                    }
                }
            }).inject(Elm.querySelector('[data-name="btn-container"]'));

            new QUIButton({
                'class': 'btn-red',
                title: QUILocale.get(lg, 'site.area.button.delete'),
                icon: 'fa fa-trash',
                events: {
                    onClick: function () {
                        self.openBrickDeleteDialog(Elm);
                    }
                }
            }).inject(Elm.querySelector('[data-name="btn-container"]'));

            for (i = 0, len = this.$availableBricks.length; i < len; i++) {
                new Element('option', {
                    html: this.$availableBricks[i].title,
                    value: this.$availableBricks[i].id,
                    'data-active': parseInt(this.$availableBricks[i].active) ? 1 : 0
                }).inject(Select);
            }

            this.$syncBrickLabel(Select);

            return Elm;
        },

        /**
         * Sync the visible brick label with the hidden select value.
         *
         * @param {HTMLSelectElement} Select
         */
        $syncBrickLabel: function (Select) {
            if (!Select) {
                return;
            }

            const BrickRow = Select.getParent('.quiqqer-bricks-site-category-area-brick');

            if (!BrickRow) {
                return;
            }

            const Title = BrickRow.getElement('[data-name="brick-title"]');
            const Badge = BrickRow.getElement('[data-name="brick-badge"]');
            const Option = Select.options[Select.selectedIndex];

            if (!Title || !Badge || !Option) {
                return;
            }

            const isActive = parseInt(Option.getAttribute('data-active')) === 1;

            Title.set('text', Option.text);
            Badge.set('text', QUILocale.get(lg, 'site.area.badge.disabled'));

            Badge.setStyle('display', isActive ? 'none' : 'inline-flex');
            BrickRow[isActive ? 'removeClass' : 'addClass'](
                'quiqqer-bricks-site-category-area-brick--inactive'
            );

            const Placeholder = BrickRow.getElement('.quiqqer-bricks-site-category-area-placeholder');

            if (Placeholder) {
                Placeholder.set('html', BrickRow.getElement('[data-name="brick-display"]').get('html'));
            }
        },

        /**
         * Sync all brick labels in the area.
         */
        $syncBrickLabels: function () {
            if (!this.$Elm) {
                return;
            }

            this.$Elm.getElements('.quiqqer-bricks-site-category-area-brick select').each((Select) => {
                this.$syncBrickLabel(Select);
            });
        },

        /**
         * Return the brick list
         *
         * @returns {Array}
         */
        getData: function () {
            if (this.getAttribute('deactivate')) {
                return [{
                    deactivate: 1
                }];
            }

            let i, len, uid, custom, brickId;

            const data = [],
                bricks = this.$Elm.getElements('select');

            for (i = 0, len = bricks.length; i < len; i++) {
                custom = '';
                uid = '';
                brickId = bricks[i].getParent().get('id');

                if (brickId in this.$brickCustomData) {
                    custom = this.$brickCustomData[brickId].customfields;
                    uid = this.$brickCustomData[brickId].uid;
                }

                data.push({
                    brickId: bricks[i].value,
                    customfields: custom,
                    uid: uid
                });
            }

            return data;
        },

        /**
         * sort methods
         */

        /**
         * Switch the sortable on
         */
        sortable: function () {
            const Elm = this.getElm(),
                elements = Elm.getElements(
                    '.quiqqer-bricks-site-category-area-brick'
                );

            elements.each(function (Brick) {
                let i, len, buttons, Button;

                buttons = Brick.getElements('.qui-button');

                for (i = 0, len = buttons.length; i < len; i++) {
                    Button = QUI.Controls.getById(buttons[i].get('data-quiid'));

                    if (Button) {
                        Button.setDisable();
                    }
                }

                const Select = Brick.getElement('select'),
                    Display = Brick.getElement('[data-name="brick-display"]');

                new Element('div', {
                    'class': 'quiqqer-bricks-site-category-area-placeholder',
                    html: Display ? Display.get('html') : ''
                }).inject(Brick);
            });

            Elm.getElements('select').set('disabled', true);


            new Sortables(this.$List, {
                revert: {
                    duration: 500,
                    transition: 'elastic:out'
                },
                clone: function (event) {
                    let Target = event.target;

                    if (Target.nodeName !== 'LI') {
                        Target = Target.getParent('li');
                    }

                    const size = Target.getSize(),
                        pos = Target.getPosition(Target.getParent('ul'));

                    return new Element('div', {
                        styles: {
                            background: 'rgba(0,0,0,0.5)',
                            height: size.y,
                            top: pos.y,
                            width: size.x,
                            zIndex: 1000
                        }
                    });
                },

                onStart: function (element) {
                    const Ul = element.getParent('ul');

                    element.addClass('quiqqer-bricks-site-category-area-dd-active');

                    Ul.setStyles({
                        height: Ul.getSize().y,
                        overflow: 'hidden',
                        width: Ul.getSize().x
                    });
                },

                onComplete: function (element) {
                    const Ul = element.getParent('ul');

                    element.removeClass('quiqqer-bricks-site-category-area-dd-active');

                    Ul.setStyles({
                        height: null,
                        overflow: null,
                        width: null
                    });
                }
            });
        },

        /**
         * Switch the sortable off
         */
        unsortable: function () {
            const Elm = this.getElm(),
                elements = Elm.getElements(
                    '.quiqqer-bricks-site-category-area-brick'
                );

            //Elm.getElements('select').set('disabled', false);
            Elm.getElements('.quiqqer-bricks-site-category-area-placeholder').destroy();

            elements.each(function (Brick) {
                let i, len, buttons, Button;

                buttons = Brick.getElements('.qui-button');

                for (i = 0, len = buttons.length; i < len; i++) {
                    Button = QUI.Controls.getById(buttons[i].get('data-quiid'));

                    if (Button) {
                        Button.setEnable();
                    }
                }
            });
        },

        /**
         * Opens the extra settings buttons
         *
         * @param {Function} [callback]
         */
        openButtons: function (callback) {
            const self = this;

            this.$AddButton.hide();
            this.$CreateButton.hide();

            self.$FXExtraBtns.style({
                borderLeft: '2px solid #cccfd5',
                height: 30,
                overflow: 'hidden'
            });

            let width = this.$ExtraBtns.getChildren().map(function (Elm) {
                let width = Elm.getSize().x;

                width = width + Elm.getStyle('margin-left').toInt();
                width = width + Elm.getStyle('margin-right').toInt();
                width = width + 2;

                return width;
            }).sum();

            // i dont know why i need 2 px more -.-"
            width = width + 2;

            this.$FXExtraBtns.animate({
                opacity: 1,
                width: width,
                marginLeft: 10
            }, {
                equation: 'ease-in-out',
                callback: function () {
                    self.$MoreButton.setAttribute('icon', 'fa fa-caret-right');

                    self.$FXExtraBtns.style({
                        overflow: null
                    });

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            });
        },

        /**
         * Close the extra settings buttons
         *
         * * @param {Function} callback
         */
        closeButtons: function (callback) {
            const self = this;

            this.$FXExtraBtns.style({
                overflow: 'hidden',
                borderLeft: null,
                marginLeft: 0
            });

            this.$FXExtraBtns.animate({
                opacity: 0,
                width: 0
            }, {
                callback: function () {
                    self.$MoreButton.setAttribute('icon', 'fa fa-caret-left');
                    self.$AddButton.show();
                    self.$CreateButton.show();

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            });
        },

        // region dialogs

        /**
         * Opens the brick add dialog
         */
        openBrickDialog: function () {
            if (!this.$availableBricks.length) {
                new QUIAlert({
                    title: QUILocale.get(lg, 'site.area.window.noBricksInArea.title'),
                    content: QUILocale.get(lg, 'site.area.window.noBricksInArea.content'),
                    maxHeight: 300,
                    maxWidth: 450,
                    closeButtonText: QUILocale.get('quiqqer/system', 'ok')
                }).open();

                return;
            }

            const self = this;
            let inputEsc = false;
            let specialKeyPressed = false;
            let searchTerm = '';
            let Timer = null;
            let itemNodes = [];
            let Input = null;
            let CounterNode = null;
            let availableBricksNumber = 0;

            // restore original title and description of list items
            const restoreOriginalHtml = function (Item) {
                Item.querySelector('header').innerHTML = Item.getAttribute('data-qui-title-original');
                Item.querySelector('.qui-elements-list-item-description').innerHTML = Item.getAttribute(
                    'data-qui-desc-original');
            };

            // hide all entries (bricks)
            const hideAll = function () {
                itemNodes.each(function (Item) {
                    Item.style.display = 'none';
                });
            };

            // show all entries (bricks)
            const showAll = function () {
                itemNodes.each(function (Item) {
                    Item.style.display = null;
                    restoreOriginalHtml(Item);
                });
            };

            // change number of founded bricks
            const updateCounter = function (number) {
                CounterNode.innerHTML = '(' + number + ')';
            };

            // mark founded term in the string
            const markFoundedTerm = function (Item, term) {
                let titleHtml = '',
                    descHtml = '';

                // search result in title?
                if (Item.getAttribute('data-qui-title').indexOf(term) >= 0) {
                    let TitleNode = Item.querySelector('header'),
                        titleText = TitleNode.innerText;
                    titleHtml = titleText.substr(0, titleText.toLowerCase().indexOf(term));
                    titleHtml += "<mark>" + titleText.substr(titleText.toLowerCase().indexOf(term),
                        term.length) + "</mark>";
                    titleHtml += titleText.substr(titleText.toLowerCase().indexOf(term) + term.length);

                    TitleNode.innerHTML = titleHtml;
                }

                // search result in description?
                if (Item.getAttribute('data-qui-desc').indexOf(term) >= 0) {
                    let DescNode = Item.querySelector('.qui-elements-list-item-description'),
                        descText = DescNode.innerText;

                    descHtml = descText.substr(0, descText.toLowerCase().indexOf(term));
                    descHtml += "<mark>" + descText.substr(descText.toLowerCase().indexOf(term),
                        term.length) + "</mark>";
                    descHtml += descText.substr(descText.toLowerCase().indexOf(term) + term.length);

                    DescNode.innerHTML = descHtml;
                }
            };

            // execute search / filter
            const search = function () {
                let term = Input.value.trim();
                term = term.toLowerCase();

                if (term === '') {
                    Input.value = '';
                }

                // prevents the search from being executed
                // after action-less keys (alt, shift, ctrl, etc.)
                if (term === searchTerm) {
                    return;
                }

                if (Timer) {
                    clearInterval(Timer);
                }

                Timer = (function () {
                    searchTerm = term;

                    hideAll();

                    let counter = 0;

                    itemNodes.each(function (Item) {
                        if (Item.getAttribute('data-qui-title').indexOf(term) >= 0 ||
                            Item.getAttribute('data-qui-desc').indexOf(term) >= 0) {

                            markFoundedTerm(Item, term);

                            Item.show();
                            counter++;
                        }
                    });

                    updateCounter(counter);
                }).delay(400);
            };

            new QUIPopup({
                title: QUILocale.get(lg, 'site.area.window.add'),
                icon: 'fa fa-th',
                maxWidth: 500,
                maxHeight: 600,
                autoclose: false,
                events: {
                    onOpen: function (Win) {
                        const items = [],
                            Content = Win.getContent(),
                            List = new QUIList({
                                events: {
                                    onClick: function (List, data) {
                                        self.addBrickById(data.brickId);
                                        Win.close();
                                    }
                                }
                            });

                        List.inject(Content);

                        const renderInactiveBadge = (Brick) => {
                            if (Brick.active) {
                                return '';
                            }

                            return `<div style="margin-top: 0.25rem;">
                                        <span class="badge badge-warning badge-sm">
                                            ${QUILocale.get(lg, 'site.area.window.add.brickIsDisabled')}
                                        </span>
                                    </div>`;
                        };

                        for (let i = 0, len = self.$availableBricks.length; i < len; i++) {
                            const Brick = self.$availableBricks[i];
                            const inactiveBadge = renderInactiveBadge(Brick);
                            const text = `<div>${Brick.description}</div>${inactiveBadge}`;

                            items.push({
                                brickId: Brick.id,
                                icon: 'fa fa-th',
                                title: Brick.title,
                                text: text
                            });
                            availableBricksNumber++;
                        }

                        List.addItems(items);

                        // no filter needed if there are only few bricks
                        if (availableBricksNumber < 6) {
                            return;
                        }

                        itemNodes = List.getElm().getElements('.qui-elements-list-item');

                        itemNodes.forEach((Item) => {
                            Item.setAttribute(
                                'data-qui-title',
                                Item.getElement('header').innerText.toLowerCase()
                            );

                            Item.setAttribute(
                                'data-qui-title-original',
                                Item.getElement('header').innerText
                            );

                            Item.setAttribute(
                                'data-qui-desc',
                                Item.getElement('.qui-elements-list-item-description').innerText.toLowerCase()
                            );

                            Item.setAttribute(
                                'data-qui-desc-original',
                                Item.getElement('.qui-elements-list-item-description').innerText.toLowerCase()
                            );
                        });

                        // filter
                        const FilterContainer = new Element('div', {
                            'class': 'siteAreaWindow-filterContainer',
                            html: '<span class="fa fa-search"></span>'
                        });

                        CounterNode = new Element('span', {
                            'class': 'siteAreaWindow-filterContainer-counter',
                            text: '(' + availableBricksNumber + ')'
                        });

                        Input = new Element('input', {
                            'class': 'siteAreaWindow-filterContainer-input',
                            type: 'text',
                            placeholder: QUILocale.get(lg, 'site.area.window.input.placeholder'),
                            events: {
                                keydown: function (event) {
                                    if (event.key === 'esc') {
                                        event.stop();
                                        inputEsc = true;
                                        updateCounter(availableBricksNumber);

                                        return;
                                    }

                                    if (event.key === 'down' ||
                                        event.key === 'up' ||
                                        event.key === 'enter') {
                                        specialKeyPressed = true;
                                    }

                                    inputEsc = false;
                                },

                                keyup: function (event) {
                                    event.stop();

                                    // Esc clears the input field
                                    if (inputEsc) {
                                        Input.value = '';
                                        showAll();

                                        return;
                                    }

                                    if (!specialKeyPressed) {
                                        search();
                                    }

                                    specialKeyPressed = false;
                                }
                            }
                        }).inject(FilterContainer, 'top');

                        CounterNode.inject(FilterContainer);
                        FilterContainer.inject(Content, 'top');

                        Input.focus();
                    }
                }
            }).open();
        },

        /**
         * Opens the brick deletion dialog
         *
         * @param {HTMLElement} BrickElement - Element of the Brick
         */
        openBrickDeleteDialog: function (BrickElement) {
            new QUIConfirm({
                title: QUILocale.get(lg, 'site.area.window.delete.title'),
                icon: 'fa fa-remove',
                text: QUILocale.get(lg, 'site.area.window.delete.text'),
                information: QUILocale.get(lg, 'site.area.window.delete.information'),
                maxHeight: 300,
                maxWidth: 450,
                events: {
                    onSubmit: function () {
                        const brickId = BrickElement.get('id');

                        if (brickId in this.$brickCustomData) {
                            delete this.$brickCustomData[brickId];
                        }

                        BrickElement.destroy();
                        this.refresh();

                    }.bind(this)
                }
            }).open();
        },

        /**
         * Opens the brick settings dialog
         *
         * @param {HTMLElement} Select
         */
        openBrickSettingDialog: function (Select) {
            const self = this;

            new QUIConfirm({
                title: QUILocale.get(lg, 'site.area.window.settings.title'),
                icon: 'fa fa-gear',
                texticon: false,
                maxWidth: 600,
                maxHeight: 400,
                autoclose: false,
                ok_button: {
                    text: QUILocale.get('quiqqer/system', 'accept'),
                    textimage: 'fa fa-save'
                },
                cancel_button: {
                    text: QUILocale.get('quiqqer/system', 'cancel'),
                    textimage: 'fa fa-remove'
                },
                events: {
                    onOpen: function (Win) {
                        const buttons = Win.$Buttons.getElements('button');

                        buttons.setStyle('float', 'right');
                        buttons.set('disabled', true);

                        const EditButton = new QUIButton({
                            textimage: 'fa fa-edit',
                            text: QUILocale.get(lg, 'brick.sheet.edit.title'),
                            disabled: true
                        }).inject(Win.$Buttons, 'top');

                        require([
                            'package/quiqqer/bricks/bin/Site/BrickEdit'
                        ], function (BrickEdit) {
                            let brickId = Select.getParent().get('id');
                            let custom = '';

                            if (brickId in self.$brickCustomData) {
                                custom = self.$brickCustomData[brickId].customfields;
                            }

                            const Edit = new BrickEdit({
                                brickId: Select.value,
                                Site: self.getAttribute('Site'),
                                customfields: JSON.decode(custom),
                                styles: {
                                    height: Win.getContent().getSize().y
                                }
                            }).inject(Win.getContent());

                            Edit.hasCustomFields().then((hasCustomFields) => {
                                if (hasCustomFields) {
                                    Win.setAttribute('maxWidth', 800);
                                    Win.setAttribute('maxHeight', 800);
                                    Win.resize();
                                }
                            });

                            EditButton.addEvent('click', function () {
                                Edit.openBrick();
                                Win.close();
                            });

                            buttons.set('disabled', false);
                            EditButton.enable();
                        });
                    },

                    onSubmit: function (Win) {
                        Win.Loader.show();

                        require(['qui/utils/Form'], function (QUIFormUtils) {

                            const Form = Win.getContent().getElement('form'),
                                data = QUIFormUtils.getFormData(Form),
                                brickId = Select.getParent().get('id');

                            if (typeof self.$brickCustomData[brickId] === 'undefined') {
                                self.$brickCustomData[brickId] = {};
                            }

                            self.$brickCustomData[brickId].customfields = JSON.encode(data);

                            Win.close();
                        });
                    }
                }
            }).open();
        },

        /**
         * Opens the brick editor in a popup
         *
         * @param Select
         */
        openBrick: function (Select) {
            require([
                'package/quiqqer/bricks/bin/Site/BrickEdit'
            ], (BrickEdit) => {
                const Edit = new BrickEdit({
                    brickId: Select.value,
                    Site: this.getAttribute('Site'),
                });

                Edit.openBrick();
            });
        },

        /**
         * Assigns a newly created brick to this area and refreshes the current view.
         *
         * @param {Number} brickId
         */
        $assignCreatedBrickToArea: function (brickId) {
            const Site = this.getAttribute('Site');
            const areaName = this.getAttribute('name');

            if (!Site || !areaName) {
                return Promise.resolve();
            }

            let areas = Site.getAttribute('quiqqer.bricks.areas');
            areas = areas ? JSON.decode(areas) : {};

            if (!areas || typeOf(areas) !== 'object') {
                areas = {};
            }

            if (!Array.isArray(areas[areaName])) {
                areas[areaName] = [];
            }

            if (areas[areaName][0] && 'deactivate' in areas[areaName][0]) {
                areas[areaName] = [];
            }

            areas[areaName].push({
                brickId: brickId
            });

            Site.setAttribute('quiqqer.bricks.areas', JSON.encode(areas));
            this.setAttribute('deactivate', false);

            return this.$refreshAvailableBricks().then(function () {
                return this.addBrick({
                    brickId: brickId
                });
            }.bind(this)).then(function () {
                this.refresh();
            }.bind(this));
        },

        /**
         * Opens the backend brick editor popup for a newly created brick.
         *
         * @param {Number} brickId
         */
        $openCreatedBrickEditor: function (brickId) {
            const Site = this.getAttribute('Site');

            if (!Site) {
                return;
            }

            require([
                'package/quiqqer/bricks/bin/Controls/backend/BrickEditWindow'
            ], function (BrickEditWindow) {
                const Project = Site.getProject();

                new BrickEditWindow({
                    brickId: brickId,
                    projectName: Project.getName(),
                    projectLang: Project.getLang()
                }).open();
            });
        },

        /**
         * Persists current area assignments on the site in the background.
         *
         * @returns {Promise}
         */
        $saveAssignedBricks: function () {
            const Site = this.getAttribute('Site');

            if (!Site || typeof Site.save !== 'function') {
                return Promise.resolve();
            }

            return new Promise(function (resolve, reject) {
                try {
                    const result = Site.save(resolve);

                    if (result && typeof result.then === 'function') {
                        result.then(resolve).catch(reject);
                    }
                } catch (Exception) {
                    reject(Exception);
                }
            }).catch(function () {
                return null;
            });
        },

        /**
         * Opens the settings dialog of the area
         */
        openSettingsDialog: function () {
            const self = this;

            new QUIConfirm({
                title: QUILocale.get(lg, 'area.window.settings.title'),
                icon: 'fa fa-gear',
                maxWidth: 450,
                maxHeight: 300,
                autoclose: false,
                events: {
                    onOpen: function (Win) {
                        const Content = Win.getContent();

                        Content.set(
                            'html',

                            '<form>' +
                            '    <label>' +
                            '        <input type="checkbox" name="deactivate" />' +
                            QUILocale.get(lg, 'area.window.settings.deactivate') +
                            '    </label>' +
                            '</form>'
                        );

                        const Form = Win.getContent().getElement('form'),
                            elms = Form.elements;

                        elms.deactivate.checked = self.getAttribute('deactivate');
                    },

                    onSubmit: function (Win) {
                        const Form = Win.getContent().getElement('form');

                        Win.close();

                        if (Form.elements.deactivate.checked) {
                            self.deactivate();
                        } else {
                            self.activate();
                        }
                    }
                }
            }).open();
        }

        // end region
    });
});
