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
    'package/quiqqer/bricks/bin/Bricks',
    'package/quiqqer/bricks/bin/AddBrickWindow',
    'package/quiqqer/bricks/bin/Controls/backend/BrickPickerWindow',
    'Locale',
    'Ajax',
    'package/quiqqer/bricks/bin/Sortables',

    'css!package/quiqqer/bricks/bin/Site/Area.css'

], function (QUI, QUIControl, QUIButton, QUIPopup, QUIAlert, QUIConfirm, Bricks, AddBrickWindow, BrickPickerWindow, QUILocale, QUIAjax, Sortables) {
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
            '$getBrickCustomFields',
            '$getBrickStatusBadges',
            '$getBrickVisibilityGroupIds',
            '$preloadBrickVisibilityGroupNames',
            '$renderBrickStatusBadges',
            '$onInject',
            '$onDestroy',
            '$onBrickRefresh'
        ],

        options: {
            name: '',
            description: '',
            title: {},
            Site: false,
            deactivate: false,
            canCreateBricks: false,
            canAssignBricks: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$availableBricks = [];
            this.$loaded = false;
            this.$brickIds = [];
            this.$onLoadBrickData = [];
            this.$brickCustomData = {};
            this.$groupNameCache = {};


            this.$CreateButton = false;
            this.$AddButton = false;
            this.$SettingsButton = false;
            this.$SortableButton = false;
            this.$Sortables = false;
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

            if (this.$Sortables) {
                this.$Sortables.detach();
                this.$Sortables = false;
            }
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
            this.$CreateButton.hide();

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
            this.$AddButton.hide();

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
                    self.$Elm.style.height = null;

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
                if (self.getAttribute('canCreateBricks')) {
                    self.$CreateButton.show();
                    self.$CreateButton.enable();
                } else {
                    self.$CreateButton.hide();
                }

                if (self.getAttribute('canAssignBricks')) {
                    self.$AddButton.show();
                    self.$AddButton.enable();
                } else {
                    self.$AddButton.hide();
                }

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
                    const areaName = this.getAttribute('name');
                    const brickData = payload && payload.data ? Object.clone(payload.data) : {};

                    if (brickData.attributes && typeOf(brickData.attributes) === 'object') {
                        brickData.attributes.areas = areaName;
                        brickData.areas = areaName;
                    } else {
                        brickData.areas = areaName;
                    }

                    return Bricks.saveBrick(payload.brickId, brickData).then(() => {
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

                    this.$syncBrickLabel(BrickNode.getElement('select'));

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
                    '   <div class="quiqqer-bricks-site-category-area-brick-meta">' +
                    // '       <div class="quiqqer-bricks-site-category-area-brick-headline">' +
                    '           <span class="quiqqer-bricks-site-category-area-brick-title" data-name="brick-title"></span>' +
                    '           <span class="badge badge-warning badge-sm" data-name="brick-badge"></span>' +
                    '           <div class="quiqqer-bricks-site-category-area-brick-status" data-name="brick-status"></div>' +
                    '       </div>' +
                    // '   </div>' +
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
            const Meta = BrickRow.getElement('.quiqqer-bricks-site-category-area-brick-meta');
            const Option = Select.options[Select.selectedIndex];

            if (!Title || !Badge || !Meta || !Option) {
                return;
            }

            const isActive = parseInt(Option.getAttribute('data-active')) === 1;
            const brickId = BrickRow.get('id');
            const customFields = this.$getBrickCustomFields(brickId);

            Title.set('text', Option.text);
            Badge.set('text', QUILocale.get(lg, 'site.area.badge.disabled'));

            Badge.setStyle('display', isActive ? 'none' : 'inline-flex');
            BrickRow[isActive ? 'removeClass' : 'addClass'](
                'quiqqer-bricks-site-category-area-brick--inactive'
            );

            this.$renderBrickStatusBadges(BrickRow, Meta, customFields);

            const Placeholder = BrickRow.getElement('.quiqqer-bricks-site-category-area-placeholder');

            if (Placeholder) {
                Placeholder.set('html', BrickRow.getElement('[data-name="brick-display"]').get('html'));
            }
        },

        /**
         * @param {string} brickId
         * @returns {Object}
         */
        $getBrickCustomFields: function (brickId) {
            if (!(brickId in this.$brickCustomData)) {
                return {};
            }

            let customFields = this.$brickCustomData[brickId].customfields;

            if (!customFields) {
                return {};
            }

            if (typeOf(customFields) === 'string') {
                customFields = JSON.decode(customFields);
            }

            if (typeOf(customFields) !== 'object' || customFields === null) {
                return {};
            }

            return customFields;
        },

        /**
         * @param {Object} customFields
         * @returns {Array}
         */
        $getBrickStatusBadges: function (customFields) {
            const badges = [];

            if (customFields.inheritance) {
                badges.push(
                    QUILocale.get(lg, 'site.area.badge.inheritance')
                );
            }

            if (customFields.visibility === 'guest') {
                badges.push(
                    QUILocale.get(lg, 'site.area.badge.visibility.guest')
                );
            }

            if (customFields.visibility === 'authenticated') {
                badges.push(
                    QUILocale.get(lg, 'site.area.badge.visibility.authenticated')
                );
            }

            return badges;
        },

        /**
         * @param {Object} customFields
         * @returns {Array}
         */
        $getBrickVisibilityGroupIds: function (customFields) {
            if (!customFields || customFields.visibility !== 'groups') {
                return [];
            }

            let groupIds = customFields.visibilityGroups || [];

            if (typeOf(groupIds) === 'string') {
                groupIds = groupIds.split(',');
            }

            if (!Array.isArray(groupIds)) {
                return [];
            }

            return groupIds.filter(function (groupId) {
                return !!groupId;
            }).map(function (groupId) {
                return String(groupId);
            });
        },

        /**
         * @param {Array} groupIds
         * @returns {Promise<Array>}
         */
        $preloadBrickVisibilityGroupNames: function (groupIds) {
            const self = this;
            const missingGroupIds = groupIds.filter(function (groupId) {
                return !self.$groupNameCache[groupId];
            });

            if (!missingGroupIds.length) {
                return Promise.resolve();
            }

            return new Promise(function (resolve) {
                QUIAjax.get('package_quiqqer_bricks_ajax_getGroupNames', function (result) {
                    Object.keys(result || {}).forEach(function (groupId) {
                        self.$groupNameCache[groupId] = result[groupId];
                    });

                    resolve();
                }, {
                    'package': 'quiqqer/bricks',
                    onError: function () {
                        missingGroupIds.forEach(function (groupId) {
                            self.$groupNameCache[groupId] = groupId;
                        });

                        resolve();
                    },
                    groupIds: JSON.encode(missingGroupIds)
                });
            });
        },

        /**
         * @param {HTMLElement} BrickRow
         * @param {HTMLElement} Meta
         * @param {Object} customFields
         */
        $renderBrickStatusBadges: function (BrickRow, Meta, customFields) {
            let Status = BrickRow.getElement('[data-name="brick-status"]');
            const badges = this.$getBrickStatusBadges(customFields);
            const groupIds = this.$getBrickVisibilityGroupIds(customFields);

            if (Status) {
                Status.destroy();
                Status = null;
            }

            if (!badges.length && !groupIds.length) {
                return;
            }

            Status = new Element('div', {
                'class': 'quiqqer-bricks-site-category-area-brick-status',
                'data-name': 'brick-status'
            }).inject(Meta);

            badges.forEach(function (entry) {
                new Element('span', {
                    'class': 'badge badge-dark-light badge-sm quiqqer-bricks-site-category-area-statusBadge',
                    text: entry
                }).inject(Status);
            });

            if (!groupIds.length) {
                return;
            }

            if (groupIds.some((groupId) => !this.$groupNameCache[groupId])) {
                new Element('span', {
                    'class': 'badge badge-dark-light badge-sm quiqqer-bricks-site-category-area-statusBadge',
                    text: QUILocale.get('quiqqer/bricks', 'site.area.badge.visibility.groups.loading')
                }).inject(Status);

                this.$preloadBrickVisibilityGroupNames(groupIds).then(() => {
                    const CurrentBrickRow = BrickRow.getParent
                        ? BrickRow
                        : null;
                    const CurrentMeta = CurrentBrickRow
                        ? CurrentBrickRow.getElement('.quiqqer-bricks-site-category-area-brick-meta')
                        : null;

                    if (!CurrentBrickRow || !CurrentMeta) {
                        return;
                    }

                    this.$renderBrickStatusBadges(CurrentBrickRow, CurrentMeta, customFields);
                });

                return;
            }

            groupIds.forEach(function (groupId) {
                const groupName = this.$groupNameCache[groupId];

                if (!groupName) {
                    return;
                }

                new Element('span', {
                    'class': 'badge badge-success-light badge-sm quiqqer-bricks-site-category-area-statusBadge',
                    text: QUILocale.get('quiqqer/bricks', 'site.area.badge.visibility.group.text', {
                        groupName: groupName
                    }),
                    title: groupName
                }).inject(Status);
            }, this);
        },

        /**
         * Sync all brick labels in the area.
         */
        $syncBrickLabels: function () {
            if (!this.$Elm) {
                return;
            }

            const selects = this.$Elm.getElements('.quiqqer-bricks-site-category-area-brick select');
            const groupIds = [];

            selects.each((Select) => {
                const BrickRow = Select.getParent('.quiqqer-bricks-site-category-area-brick');

                if (!BrickRow) {
                    return;
                }

                groupIds.push.apply(
                    groupIds,
                    this.$getBrickVisibilityGroupIds(
                        this.$getBrickCustomFields(BrickRow.get('id'))
                    )
                );
            });

            this.$preloadBrickVisibilityGroupNames(groupIds).then(() => {
                selects.each((Select) => {
                    this.$syncBrickLabel(Select);
                });
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


            this.$Sortables = new Sortables(this.$List, {
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
                            background: 'rgba(0,0,0,0.0)',
                            height: size.y,
                            left: 0,
                            margin: 0,
                            position: 'absolute',
                            pointerEvents: 'none',
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

            if (this.$Sortables) {
                this.$Sortables.detach();
                this.$Sortables = false;
            }

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

            if (this.getAttribute('canAssignBricks')) {
                this.$AddButton.hide();
            }

            if (this.getAttribute('canCreateBricks')) {
                this.$CreateButton.hide();
            }

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

                    if (self.getAttribute('canAssignBricks')) {
                        self.$AddButton.show();
                    }

                    if (self.getAttribute('canCreateBricks')) {
                        self.$CreateButton.show();
                    }

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

            let selectionInProgress = false;

            const addSelectedBrick = function (Win, bricks, Picker) {
                if (!bricks.length || selectionInProgress) {
                    return;
                }

                selectionInProgress = true;

                if (Picker && typeof Picker.disable === 'function') {
                    Picker.disable();
                }

                this.addBrickById(bricks[0].id);
                Win.close();
            }.bind(this);

            new BrickPickerWindow({
                title: QUILocale.get(lg, 'site.area.window.add'),
                icon: 'fa fa-th',
                pickerOptions: {
                    items: this.$availableBricks,
                    multiple: false,
                    showProjectSelect: false,
                    autoExecute: true
                },
                events: {
                    onExecute: function (Win, bricks, Picker) {
                        addSelectedBrick(Win, bricks, Picker);
                    },
                    onClose: function () {
                        selectionInProgress = false;
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
                'class': 'quiqqer-bricks-site-category-area-brick-setting',
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

                        // buttons.setStyle('float', 'right');
                        buttons.set('disabled', true);

                        // const EditButton = new QUIButton({
                        //     textimage: 'fa fa-edit',
                        //     text: QUILocale.get(lg, 'brick.sheet.edit.title'),
                        //     disabled: true
                        // }).inject(Win.$Buttons, 'top');

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

                            // EditButton.addEvent('click', function () {
                            //     Edit.openBrick();
                            //     Win.close();
                            // });

                            buttons.set('disabled', false);
                            // EditButton.enable();
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

                            if (data.visibility !== 'groups') {
                                data.visibilityGroups = '';
                            }

                            self.$brickCustomData[brickId].customfields = JSON.encode(data);
                            self.$syncBrickLabel(Select);

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
