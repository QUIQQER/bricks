/**
 * BrickEdit Panel
 * Edit and change a Brick
 *
 * @event onQuiqqerBricksEditPanelCreate [this] (global)
 * @event onLoaded [ this ]
 * @event onSave [ this ]
 * @event onDelete [ this ]
 */
define('package/quiqqer/bricks/bin/BrickEdit', [

    'qui/QUI',
    'qui/controls/desktop/Panel',
    'qui/controls/windows/Confirm',
    'qui/controls/buttons/Switch',
    'package/quiqqer/bricks/bin/BrickAreas',
    'Ajax',
    'Locale',
    'Projects',
    'Mustache',
    'qui/utils/Form',
    'utils/Controls',
    'utils/Template',
    'package/quiqqer/bricks/bin/Bricks',

    'css!package/quiqqer/bricks/bin/BrickEdit.css'

], function (QUI, QUIPanel, QUIConfirm, QUISwitch, BrickAreas, QUIAjax, QUILocale,
             Projects, Mustache, QUIFormUtils, ControlUtils, Template, Bricks
) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIPanel,
        Type: 'package/quiqqer/bricks/bin/BrickEdit',

        Binds: [
            '$onInject',
            '$onCreate',
            '$onDestroy',
            '$resizeEditor',

            'showInformation',
            'showSettings',
            'showExtras',
            'showContent',
            'showFooterContent',
            'showUsage',
            'openCustomCSS',
            'openCustomJS',

            '$load',
            '$unload',
            'save',
            'del',
            '$onCategoryEnter',
            '$onCategoryLeave'
        ],

        options: {
            id: false,
            projectName: false,
            projectLang: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$availableBricks = [];
            this.$availableSettings = [];
            this.$customfields = [];
            this.$loaded = false;

            this.$categoryAnimation = null;

            this.$Container = null;
            this.$Editor = false;
            this.$EditorCell = null;
            this.$EditorContainer = null;
            this.$Areas = false;

            this.addEvents({
                onInject: this.$onInject,
                onCreate: this.$onCreate,
                onDestroy: this.$onDestroy,
                onResize: function () {
                    const controls = QUI.Controls.getControlsInElement(this.getContent());

                    controls.each(function (Control) {
                        if ("resize" in Control) {
                            Control.resize();
                        }
                    });

                    this.$resizeEditor();
                }.bind(this),
                onCategoryEnter: this.$onCategoryEnter,
                onCategoryLeave: this.$onCategoryLeave
            });
        },

        /**
         * Tooltip for bricks
         *
         * @return {Promise}
         */
        getToolTipText: function () {
            return new Promise((resolve) => {
                const project = this.getAttribute('projectName'),
                    lang = this.getAttribute('projectLang');

                const tpl = '<table>' +
                    '<tr>' +
                    '   <td>{{localeProject}}</td>' +
                    '   <td>{{project}}</td>' +
                    '</tr>' +
                    '<tr>' +
                    '   <td>{{localeLang}}</td>' +
                    '   <td><img src="' + window.URL_OPT_DIR +
                    'quiqqer/core/bin/16x16/flags/{{lang}}.png" alt="" /> {{lang}}</td>' +
                    '</tr>' +
                    '<tr>' +
                    '   <td>{{localeID}}</td>' +
                    '   <td>{{id}}</td>' +
                    '</tr>' +
                    '</table>';

                const result = Mustache.render(tpl, {
                    localeProject: QUILocale.get('quiqqer/core', 'project'),
                    localeLang: QUILocale.get('quiqqer/core', 'language'),
                    localeID: QUILocale.get('quiqqer/bricks', 'brickId'),

                    project: project,
                    lang: lang,
                    id: this.getAttribute('id')
                });

                resolve(result);
            });
        },

        /**
         * event : on create
         */
        $onCreate: function () {
            this.setAttributes({
                icon: 'fa fa-spinner fa-spin',
                title: '...'
            });

            this.addButton({
                name: 'save',
                textimage: 'fa fa-save',
                text: QUILocale.get('quiqqer/system', 'save'),
                events: {
                    click: this.save
                }
            });

            this.addButton({
                name: 'delete',
                icon: 'fa fa-trash-o',
                title: QUILocale.get('quiqqer/system', 'delete'),
                events: {
                    click: this.del
                },
                styles: {
                    'float': 'right'
                }
            });

            this.addCategory({
                name: 'information',
                icon: 'fa fa-file-o',
                text: QUILocale.get('quiqqer/system', 'information'),
                events: {
                    onClick: this.showInformation
                }
            });

            this.addCategory({
                name: 'settings',
                icon: 'fa fa-magic',
                text: QUILocale.get('quiqqer/system', 'properties'),
                events: {
                    onClick: this.showSettings
                }
            });

            this.addCategory({
                name: 'extra',
                icon: 'fa fa-gears',
                text: QUILocale.get(lg, 'brick.panel.category.settings'),
                events: {
                    onClick: this.showExtras
                }
            });

            this.addCategory({
                name: 'content',
                icon: 'fa fa-file-text-o',
                text: QUILocale.get('quiqqer/system', 'content'),
                events: {
                    onClick: this.showContent
                }
            });

            this.addCategory({
                name: 'footer',
                icon: 'fa fa-file-text',
                text: QUILocale.get(lg, 'brick.panel.category.footer'),
                events: {
                    onClick: this.showFooterContent
                }
            });

            this.addCategory({
                name: 'usage',
                icon: 'fa fa-map-signs',
                text: QUILocale.get(lg, 'brick.panel.category.usage'),
                events: {
                    onClick: this.showUsage
                }
            });

            this.addCategory({
                name  : 'customCSS',
                text  : QUILocale.get(lg, 'brick.panel.category.customCSS'),
                icon  : 'fa fa-css3',
                events: {
                    onClick: this.openCustomCSS
                }
            });

            this.addCategory({
                name  : 'customJS',
                text  : QUILocale.get(lg, 'brick.panel.category.customJS'),
                icon  : 'fa fa-code',
                events: {
                    onClick: this.openCustomJS
                }
            });

            QUI.fireEvent('quiqqerBricksEditPanelCreate', [this]);
        },

        /**
         * event : on inject
         */
        $onInject: function () {
            this.Loader.show();

            this.refreshData().then(() => {
                this.getContent().setStyles({
                    position: 'relative'
                });

                this.$Container = new Element('div', {
                    'class': 'quiqqer-bricks-container'
                }).inject(this.getContent());

                this.fireEvent('loaded', [this]);
                this.getCategory('information').click();
                this.$loaded = true;
            });
        },

        refreshData: function () {
            return new Promise((resolve, reject) => {
                QUIAjax.get([
                    'package_quiqqer_bricks_ajax_getBrick',
                    'package_quiqqer_bricks_ajax_getAvailableBricks',
                    'package_quiqqer_bricks_ajax_getPanelCategories'
                ], (brick, bricks, categories) => {
                    /**
                     * @param {{availableSettings:object}} data
                     * @param {{attributes:object}} data
                     * @param {{settings:object}} data
                     */
                    this.$availableBricks = bricks;
                    this.$availableSettings = brick.availableSettings;
                    this.$customfields = brick.customfields;

                    this.setAttribute('data', brick);

                    this.setAttributes({
                        icon: 'fa fa-th',
                        title: QUILocale.get('quiqqer/bricks', 'panel.title', {
                            brickId: this.getAttribute('id'),
                            brickTitle: brick.attributes.title
                        })
                    });

                    // brick xml settings
                    const type = brick.attributes.type;
                    const data = bricks.filter(function (entry) {
                        return entry.control === type;
                    });

                    if (data.length && data[0].hasContent === 0) {
                        this.getCategory('content').hide();
                    }

                    for (let i = 0, len = categories.length; i < len; i++) {
                        this.addCategory(categories[i]);
                    }

                    this.refresh();

                    resolve();
                }, {
                    'package': 'quiqqer/bricks',
                    brickId: this.getAttribute('id'),
                    onError: reject
                });
            });
        },

        /**
         * event : on destroy
         */
        $onDestroy: function () {
            if (this.$Editor) {
                this.$Editor.destroy();
            }

            this.$EditorCell = null;
            this.$EditorContainer = null;

            if (this.$Areas) {
                this.$Areas.destroy();
            }
        },

        /**
         * Saves the brick
         *
         * @return Promise
         */
        save: function () {
            this.Loader.show();
            this.$unload();

            const self = this,
                data = self.getAttribute('data');

            data.customfields = self.$customfields;

            return Bricks.saveBrick(self.getAttribute('id'), data).then(function (result) {
                self.setAttribute('data', result);

                const ActiveCategory = self.getActiveCategory();

                if (
                    ActiveCategory &&
                    ActiveCategory.getAttribute('name') === 'information'
                ) {
                    return self.showInformation(true);
                }
            }).then(function () {
                QUI.getMessageHandler().then(function (MH) {
                    MH.addSuccess(
                        QUILocale.get(lg, 'message.brick.save.success')
                    );
                });

                self.fireEvent('save', [self]);

                if (self.getActiveCategory().getAttribute('name')) {

                }

                self.Loader.hide();
            }).catch(function (e) {
                QUI.getMessageHandler().then(function (MH) {
                    MH.addError(e.getMessage());
                });

                self.Loader.hide();
            });
        },

        /**
         * Delete the brick
         */
        del: function () {
            const self = this,
                data = this.getAttribute('data');

            new QUIConfirm({
                title: QUILocale.get(lg, 'window.brick.delete.title'),
                text: QUILocale.get(lg, 'window.brick.delete.text', {
                    brickId: self.getAttribute('id'),
                    brickTitle: data.attributes.title
                }),
                information: QUILocale.get(lg, 'window.brick.delete.information'),
                icon: 'fa fa-trash',
                texticon: 'fa fa-trash',
                maxHeight: 300,
                maxWidth: 600,
                autoclose: false,
                events: {
                    onSubmit: function (Win) {
                        Win.Loader.show();

                        Bricks.deleteBricks([self.getAttribute('id')]).then(function () {
                            Win.close();
                            self.fireEvent('delete');
                        });
                    }
                }
            }).open();
        },

        /**
         * event on button active
         *
         * @return Promise
         */
        $load: function () {
            QUIFormUtils.setDataToForm(
                this.getAttribute('data').attributes,
                this.$Container.getElement('form')
            );

            QUIFormUtils.setDataToForm(
                this.getAttribute('data').settings,
                this.$Container.getElement('form')
            );
        },

        /**
         * event unload category
         */
        $unload: function () {
            if (!this.$loaded) {
                return;
            }

            if (!this.getActiveCategory()) {
                return;
            }

            const Form = this.getContent().getElement('form'),
                unload = this.getActiveCategory().getAttribute('name'),
                data = this.getAttribute('data');

            switch (unload) {
                case 'extra':
                case 'settings':
                case 'content':
                case 'footer':
                    break;

                case 'customCSS':
                case 'customJS':
                    data.settings = data.settings || {};

                    if (this.$Control && typeof this.$Control.save === 'function') {
                        const value = this.$Control.save();

                        if (unload === 'customCSS') {
                            data.settings.customCSS = value;
                            const customCSSScoping = Form.getElement('[name="customCSSScoping"]');

                            if (customCSSScoping) {
                                data.settings.customCSSScoping = customCSSScoping.checked;
                            }
                        }

                        if (unload === 'customJS') {
                            data.settings.customJS = value;
                        }
                    }

                    data.settings = Object.merge(data.settings, QUIFormUtils.getFormData(Form));
                    break;

                default:
                    data.attributes = Object.merge(data.attributes, QUIFormUtils.getFormData(Form));
            }

            if (Form && Form.getElement('[name="frontendTitle"]')) {
                data.attributes.frontendTitle = Form.getElement('[name="frontendTitle"]').value;
            }

            if (unload === 'settings' && this.$Areas) {
                data.attributes.areas = this.$Areas.getAreas().join(',');

                const flexibleList = [],
                    fieldData = QUIFormUtils.getFormData(Form);

                for (const key in fieldData) {
                    if (!fieldData.hasOwnProperty(key)) {
                        continue;
                    }

                    if (!key.match('flexible')) {
                        continue;
                    }

                    if (fieldData[key]) {
                        flexibleList.push(key);
                    }
                }

                this.$customfields = flexibleList;
            }

            if (unload === 'extra') {
                let extra = QUIFormUtils.getFormData(Form);

                // filter numbers
                const isNumeric = function (n) {
                    return !isNaN(parseFloat(n)) && isFinite(n);
                };

                extra = Object.filter(extra, function (value, key) {
                    return !isNumeric(key);
                });

                data.settings = data.settings || {};
                data.settings = Object.merge(data.settings, extra);
            }
            if (unload === 'content' && this.$Editor) {
                data.attributes.content = this.$Editor.getContent();
            }

            if (unload === 'footer' && this.$Editor) {
                data.settings = data.settings || {};
                data.settings.footer = this.$Editor.getContent();
            }

            this.setAttribute('data', data);
        },

        /**
         * Open custom css editor for this brick
         *
         * @return {Promise}
         */
        openCustomCSS: function () {
            const self = this;

            this.Loader.show();

            return Promise.resolve().then(function () {
                return self.$hideCategory();
            }).then(function () {
                return new Promise(function (resolve) {
                    const hint = QUILocale.get(lg, 'brick.panel.category.customCSS.hint');
                    const scopingLabel = QUILocale.get(lg, 'brick.panel.category.customCSS.scoping');

                    self.$Container.set('html', `
                    <div class="quiqqer-bricks-brickedit-wrapper">
                        <form></form>
                        <label class="custom-css-scope-toggle" style="display:block;margin-top:10px;">
                            <input type="checkbox" name="customCSSScoping" value="1"> ${scopingLabel}
                        </label>
                        <div class="hint">${hint}</div>
                    </div>
                    `);

                    require(['package/quiqqer/bricks/bin/Controls/backend/CustomCSS'], function (CustomCSS) {
                        const Form = self.getContent().getElement('form');
                        const ScopingCheckbox = self.getContent().getElement('[name="customCSSScoping"]');
                        const data = self.getAttribute('data');

                        let css = '';
                        let customCSSScoping = true;

                        if (data && data.settings && typeof data.settings.customCSS !== 'undefined') {
                            css = data.settings.customCSS;
                        }

                        if (data && data.settings && typeof data.settings.customCSSScoping !== 'undefined') {
                            customCSSScoping = data.settings.customCSSScoping !== false &&
                                data.settings.customCSSScoping !== '0' &&
                                data.settings.customCSSScoping !== 0;
                        }

                        if (ScopingCheckbox) {
                            ScopingCheckbox.checked = customCSSScoping;
                        }

                        self.$Control = new CustomCSS({
                            css: css,
                            events: {
                                onLoad: resolve,
                            },
                        }).inject(Form);
                    });
                });
            }).then(function () {
                self.$Container.setStyles({
                    height: '100%'
                });

                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         * Open custom javascript editor for this brick
         *
         * @return {Promise}
         */
        openCustomJS: function () {
            const self = this;

            this.Loader.show();

            return Promise.resolve().then(function () {
                return self.$hideCategory();
            }).then(function () {
                return new Promise(function (resolve) {
                    const hint = QUILocale.get(lg, 'brick.panel.category.customJS.hint');

                    self.$Container.set('html', `
                    <div class="quiqqer-bricks-brickedit-wrapper"><form></form><div class="hint">${hint}</div></div>
                    `);

                    require(['package/quiqqer/bricks/bin/Controls/backend/CustomJS'], function (CustomJS) {
                        const Form = self.getContent().getElement('form');
                        const data = self.getAttribute('data');

                        let js = '';

                        if (data && data.settings && typeof data.settings.customJS !== 'undefined') {
                            js = data.settings.customJS;
                        }

                        self.$Control = new CustomJS({
                            js: js,
                            events: {
                                onLoad: resolve,
                            },
                        }).inject(Form);

                        Form.setStyles({
                            'float': 'left',
                            height: '100%',
                            width: '100%',
                        });
                    });
                });
            }).then(function () {
                self.$Container.setStyles({
                    height: '100%'
                });

                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         * Information template
         *
         * @param {boolean} skipHide
         * @returns {Promise}
         */
        showInformation: function (skipHide) {
            const self = this,
                data = self.getAttribute('data');

            let hidePromise = Promise.resolve();

            if (skipHide !== true) {
                hidePromise = this.$hideCategory();
            }

            return hidePromise.then(function () {
                return Template.get('ajax/brick/templates/information', false, {
                    'package': 'quiqqer/bricks'
                });
            }).then(function (html) {
                self.$Container.set('html', html);
                self.$load();

                return ControlUtils.parse(
                    self.$Container.getElement('form')
                );
            }).then(function () {
                const data = self.getAttribute('data');

                if (typeof data.attributes.deprecated !== 'undefined' && data.attributes.deprecated) {
                    self.$Container.getElements('.deprecated-messages').setStyle('display', 'inline-block');
                }

                const ActiveInput = self.$Container.getElement('#active');
                const ActiveSwitchContainer = self.$Container.getElement('#activeSwitch');
                const InactiveMessage = self.$Container.getElement('.inactive-messages');

                if (ActiveInput && ActiveSwitchContainer) {
                    new QUISwitch({
                        status: parseInt(ActiveInput.value || 0),
                        events: {
                            onChange: function (Switch) {
                                const status = Switch.getStatus() ? 1 : 0;

                                ActiveInput.value = status;

                                if (!InactiveMessage) {
                                    return;
                                }

                                InactiveMessage.setStyle(
                                    'display',
                                    status ? 'none' : 'inline-block'
                                );
                            },
                            onLoad: function (Switch) {
                                if (!InactiveMessage) {
                                    return;
                                }

                                InactiveMessage.setStyle(
                                    'display',
                                    Switch.getStatus() ? 'none' : 'inline-block'
                                );
                            }
                        }
                    }).inject(ActiveSwitchContainer);
                }
            }).then(function () {
                return Bricks.getAvailableBricks();
            }).then(function (bricks) {
                let type = self.getElm().getElement('#type').value;
                let brick = null;

                for (let i = 0, len = bricks.length; i < len; i++) {
                    if (bricks[i].control === type) {
                        brick = bricks[i];
                        break;
                    }
                }

                if (brick) {
                    if (typeof brick.title[1] !== 'undefined') {
                        self.getElm().getElement('#typeTitle').value = QUILocale.get(
                            brick.title[0],
                            brick.title[1]
                        );
                    } else {
                        self.getElm().getElement('#typeTitle').value = QUILocale.get(
                            brick.title.group,
                            brick.title.var
                        );
                    }
                }

                // show brick data (JSON)
                const ShowDataBtn = self.getElm().getElement('.quiqqer-bricks-brickedit-showBrickDataBtn');

                if (ShowDataBtn) {
                    ShowDataBtn.addEventListener('click', (event) => {
                        event.preventDefault();

                        require(['qui/controls/windows/Popup'], function (QUIPopup) {
                            new QUIPopup({
                                title: QUILocale.get(lg, 'brick.edit.showBrickData.window.title'),
                                icon: 'fa fa-code',
                                buttons: false,
                                autoclose: true,
                                events: {
                                    onOpen: function (Win) {
                                        const Body = Win.getContent(),
                                            data = self.getAttribute('data'),
                                            InfoText = QUILocale.get(lg, 'brick.edit.showBrickData.window.text'),
                                            CopyBtnText = QUILocale.get(lg,
                                                'brick.edit.showBrickData.window.copyBtn');

                                        data.customfields = self.$customfields;

                                        const CopyBtn = document.createElement('button');
                                        CopyBtn.classList.add('qui-button');
                                        CopyBtn.innerHTML = `<span class="fa fa-copy"></span> ${CopyBtnText}`;
                                        CopyBtn.addEventListener('click', (event) => {
                                            event.preventDefault();
                                            navigator.clipboard.writeText(Body.querySelector('textarea').value);
                                        });

                                        Body.set('html',
                                            `
                                            <div class="showBrickData-window-body">
                                            <p class="showBrickData-window-body-text">${InfoText}</p>
                                            <textarea autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
                                            </div>
                                            `
                                        );

                                        Body.querySelector('textarea').value = JSON.stringify(data);
                                        Body.querySelector('.showBrickData-window-body-text').appendChild(CopyBtn);
                                    }
                                }
                            }).open();
                        });
                    })
                }

                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            });

        },

        /**
         * Settings template
         *
         * @returns {Promise}
         */
        showSettings: function () {
            const self = this;

            return this.$hideCategory().then(function () {
                return new Promise(function (resolve, reject) {
                    Template.get('ajax/brick/templates/settings', function (result) {
                        self.$Container.set('html', result);

                        // areas
                        let Content = self.getContent(),
                            areas = [],
                            attributes = self.getAttribute('data').attributes,
                            customfields = self.$customfields;

                        if (attributes.areas) {
                            areas = attributes.areas
                                .replace(/^,*/, '')
                                .replace(/,*$/, '')
                                .split(',');
                        }

                        // areas
                        self.$Areas = new BrickAreas({
                            brickId: self.getAttribute('id'),
                            projectName: self.getAttribute('projectName'),
                            projectLang: self.getAttribute('projectLang'),
                            areas: areas,
                            styles: {
                                height: 120
                            }
                        }).inject(Content.getElement('.quiqqer-bricks-areas'));


                        // flexible settings
                        let i, len, data, description, Row;
                        const TBody = Content.getElement('.brick-table-flexible tbody');

                        for (i = 0, len = self.$availableSettings.length; i < len; i++) {
                            data = self.$availableSettings[i];

                            Row = new Element('tr', {
                                html: '<td>' +
                                    '<label class="field-container">' +
                                    '<span class="field-container-item">' +
                                    QUILocale.get(data.text[0], data.text[1]) + '' +
                                    '</span>' +
                                    '<div class="field-container-field">' +
                                    '<input type="checkbox" name="flexible-' + data.name + '" />' +
                                    '</div>' +
                                    '</label>' +
                                    '</td>'
                            }).inject(TBody);

                            description = data.description;

                            if (typeOf(data.description) === 'array') {
                                description = QUILocale.get(data.description[0], data.description[1]);
                            }

                            if (typeof description !== 'undefined' && description !== '') {
                                new Element('div', {
                                    'class': 'field-container-item-desc',
                                    html: description
                                }).inject(Row.getElement('td'));
                            }
                        }

                        if (customfields) {
                            let name;
                            const Form = Content.getElement('form');

                            for (i = 0, len = customfields.length; i < len; i++) {
                                name = customfields[i];

                                if (typeof Form.elements[name] !== 'undefined') {
                                    Form.elements[name].checked = true;
                                }

                                if (typeof Form.elements['flexible-' + name] !== 'undefined') {
                                    Form.elements['flexible-' + name].checked = true;
                                }
                            }
                        }

                        resolve();
                    }, {
                        'package': 'quiqqer/bricks',
                        onError: reject
                    });
                });
            }).then(function () {
                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         * Setting extras
         *
         * @returns {Promise}
         */
        showExtras: function () {
            const self = this;

            return this.$hideCategory().then(function () {
                return Template.get('ajax/brick/templates/extras', false, {
                    'package': 'quiqqer/bricks'
                });
            }).then(function (html) {
                self.$Container.set('html', html);
                self.$load();

                return self.$createExtraData();
            }).then(function () {
                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            });
        },

        /**
         * Setting content
         *
         * @returns {Promise}
         */
        showContent: function () {
            const self = this;

            return this.$hideCategory().then(function () {
                return Template.get('ajax/brick/templates/content', false, {
                    'package': 'quiqqer/bricks'
                });
            }).then(function (html) {
                self.$Container.set('html', html);
                return self.$createContentEditor();
            }).then(function () {
                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         * Setting footer content
         *
         * @returns {Promise}
         */
        showFooterContent: function () {
            const self = this;

            return this.$hideCategory().then(function () {
                return Template.get('ajax/brick/templates/footer', false, {
                    'package': 'quiqqer/bricks'
                });
            }).then(function (html) {
                self.$Container.set('html', html);
                return self.$createFooterEditor();
            }).then(function () {
                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         *
         * @return {Promise<T>}
         */
        showUsage: function () {
            const self = this;

            this.Loader.show();

            return this.$hideCategory().then(function () {
                return new Promise(function (resolve) {
                    require(['package/quiqqer/bricks/bin/Controls/backend/BrickUsage'], function (Control) {
                        new Control({
                            brickId: self.getAttribute('id'),
                            events: {
                                onLoad: resolve,
                                onRefresh: function () {
                                    self.Loader.hide();
                                },
                                onRefreshBegin: function () {
                                    self.Loader.show();
                                }
                            }
                        }).inject(self.$Container);
                    });
                });
            }).then(function (BrickUsage) {
                self.$Container.setStyles({
                    height: '100%'
                });

                BrickUsage.resize();

                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();
            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         * Create the editor, if the brick type is a content type
         *
         * @return Promise
         */
        $createContentEditor: function () {
            const data = this.getAttribute('data');
            data.attributes = data.attributes || {};

            if (typeof data.attributes.content === 'undefined') {
                data.attributes.content = '';
            }

            return this.$createEditor(data.attributes.content);
        },

        /**
         * Create the editor for the footer content
         *
         * @return Promise
         */
        $createFooterEditor: function () {
            const data = this.getAttribute('data');
            data.settings = data.settings || {};

            if (typeof data.settings.footer === 'undefined') {
                data.settings.footer = '';
            }

            return this.$createEditor(data.settings.footer);
        },

        /**
         * Create the editor, if the brick type is a content type
         *
         * @param {String} initialContent
         * @return Promise
         */
        $createEditor: function (initialContent) {
            const self = this;

            return new Promise(function (resolve) {
                const EditorBody = self.$Container.getElement('.brick-edit-content__body');

                self.$EditorCell = EditorBody;

                // load ckeditor
                require(['classes/editor/Manager'], function (EditorManager) {
                    new EditorManager().getEditor(null, function (Editor) {
                        self.$Editor = Editor;
                        self.$Editor.setAttribute('showLoader', false);

                        const Project = Projects.get(
                            self.getAttribute('projectName'),
                            self.getAttribute('projectLang')
                        );

                        self.$Editor.setProject(Project);

                        self.$EditorContainer = new Element('div', {
                            styles: {
                                clear: 'both',
                                'float': 'left',
                                height: '100%',
                                'min-height': 300,
                                'box-sizing': 'border-box',
                                width: '100%'
                            }
                        }).inject(EditorBody);

                        self.$Editor.addEvent('onLoaded', resolve);
                        self.$Editor.inject(self.$EditorContainer);
                        self.$resizeEditor();

                        self.$Editor.setContent(initialContent);
                    });
                });
            });
        },

        /**
         * Resize the content editor to the available container space.
         */
        $resizeEditor: function () {
            if (!this.$Editor || !this.$EditorContainer || !this.$EditorCell) {
                return;
            }

            const Table = this.$Container
                ? this.$Container.getElement('.brick-edit-content')
                : null;
            const containerHeight = this.$Container ? this.$Container.getSize().y : 0;
            const tableTop = Table ? Table.getPosition(this.$Container).y : 0;

            let availableHeight = containerHeight - tableTop;

            const width = this.$EditorContainer.getSize().x;

            if (!width) {
                return;
            }

            availableHeight = Math.max(availableHeight, 300);

            this.$EditorCell.setStyle('height', availableHeight);
            this.$EditorContainer.setStyle('height', availableHeight);

            this.$Editor.setWidth(width);
            this.$Editor.setHeight(availableHeight);

            if ("resize" in this.$Editor) {
                this.$Editor.resize();
            }
        },

        /**
         * Create the extra settings table
         *
         * @return Promise
         */
        $createExtraData: function () {
            return new Promise(function (resolve, reject) {
                const TableExtra = this.$Elm.getElement('table.brick-edit-extra-header'),
                    TableBody = TableExtra.getElement('tbody');

                TableBody.getElement('[name="frontendTitle"]').value =
                    this.getAttribute('data').attributes.frontendTitle;

                if (!this.$availableSettings || !this.$availableSettings.length) {
                    TableExtra.setStyle('display', 'none');

                    new Element('div', {
                        html: QUILocale.get(lg, 'window.brick.no.extra.settings')
                    }).inject(TableExtra, 'before');

                    resolve();
                    return;
                }

                TableExtra.setStyle('display', null);

                let i, c, len, cLen, attr, Row, text, description, Value, setting,
                    extraFieldId, dataAttributes;

                const self = this,
                    id = this.getId(),
                    Form = this.getContent().getElement('form');

                // extra settings
                for (i = 0, len = this.$availableSettings.length; i < len; i++) {
                    setting = this.$availableSettings[i];
                    extraFieldId = 'extraField_' + id + '_' + i;
                    dataAttributes = setting['data-attributes'];

                    text = setting.text;
                    description = setting.description;

                    if (typeOf(setting.text) === 'array') {
                        text = QUILocale.get(setting.text[0], setting.text[1]);
                    }

                    if (typeOf(setting.description) === 'array') {
                        description = QUILocale.get(setting.description[0], setting.description[1]);
                    }


                    Row = new Element('tr', {
                        html: '<td>' +
                            '<label class="field-container" for="' + extraFieldId + '">' +
                            '<span class="field-container-item">' + text + '</span>' +
                            '</label>' +
                            '</td>'
                    }).inject(TableBody);

                    if (typeof description !== 'undefined' && description !== '') {
                        new Element('div', {
                            'class': 'field-container-item-desc',
                            html: description
                        }).inject(Row.getElement('td'));
                    }

                    if (setting.type !== 'select') {
                        if (setting.type === 'textarea') {
                            Value = new Element('textarea', {
                                name: setting.name,
                                'class': setting.class,
                                id: extraFieldId,
                                styles: {
                                    height: 300
                                }
                            });
                        } else {
                            Value = new Element('input', {
                                type: setting.type,
                                name: setting.name,
                                'class': setting.class,
                                id: extraFieldId
                            });
                        }

                        if (setting['data-qui'] !== '') {
                            Value.set('data-qui', setting['data-qui']);
                        }

                        if (typeof dataAttributes === 'object') {
                            for (attr in dataAttributes) {
                                if (dataAttributes.hasOwnProperty(attr)) {
                                    Value.set(attr, dataAttributes[attr]);
                                }
                            }
                        }

                        if (Value.type === 'checkbox' ||
                            Value.type === 'radio' ||
                            Value.type === 'hidden') {
                            const Container = new Element('div', {
                                'class': 'field-container-field'
                            }).inject(Row.getElement('.field-container'));

                            Value.inject(Container);
                            continue;
                        }

                        Value.classList.add('field-container-field');
                        Value.inject(Row.getElement('.field-container'));
                        continue;
                    }

                    Value = new Element('select', {
                        name: setting.name,
                        'class': setting.class,
                        id: extraFieldId
                    }).inject(Row.getElement('.field-container'));

                    Value.addClass('field-container-field');


                    for (c = 0, cLen = setting.options.length; c < cLen; c++) {
                        text = setting.options[c].text;

                        if (typeOf(setting.options[c].text) === 'array') {
                            text = QUILocale.get(
                                setting.options[c].text[0],
                                setting.options[c].text[1]
                            );
                        }

                        new Element('option', {
                            html: text,
                            value: setting.options[c].value
                        }).inject(Value);
                    }

                    if (typeof dataAttributes === 'object') {
                        for (attr in dataAttributes) {
                            if (dataAttributes.hasOwnProperty(attr)) {
                                Value.set(attr, dataAttributes[attr]);
                            }
                        }
                    }
                }

                TableExtra.setStyle('display', null);

                // set data
                QUIFormUtils.setDataToForm(
                    this.getAttribute('data').settings,
                    Form
                );

                // parse controls
                QUI.parse(TableExtra).then(function () {
                    return ControlUtils.parse(TableExtra);
                }).then(function () {
                    // set project to the controls
                    TableExtra.getElements('[data-quiid]').each(function (Elm) {
                        const Control = QUI.Controls.getById(
                            Elm.get('data-quiid')
                        );

                        if ('setProject' in Control) {
                            Control.setProject(
                                self.getAttribute('projectName'),
                                self.getAttribute('projectLang')
                            );
                        }
                    });

                    resolve();
                }).catch(reject);
            }.bind(this));
        },

        /**
         * event: on category enter
         *
         * @return Promise
         */
        $onCategoryEnter: function (Panel, Category) {
            if (this.$loaded === false) {
                return Promise.resolve();
            }

            if (typeof Category.getAttribute('click') === 'function') {
                return Promise.resolve();
            }

            switch (Category.getAttribute('name')) {
                case 'information':
                case 'extra':
                case 'settings':
                case 'content':
                case 'footer':
                case 'usage':
                case 'customCSS':
                case 'customJS':
                    return Promise.resolve();
            }

            const self = this;

            this.Loader.show();

            return this.$hideCategory().then(function () {
                return new Promise(function (resolve, reject) {
                    QUIAjax.get('package_quiqqer_bricks_ajax_getPanelCategory', function (result) {
                        self.$Container.set('html', '<form>' + result + '</form>');
                        self.$load();
                        resolve();
                    }, {
                        'package': 'quiqqer/bricks',
                        brickId: self.getAttribute('id'),
                        category: Category.getAttribute('name'),
                        onError: reject
                    });
                });
            }).then(function () {
                return QUI.parse();
            }).then(function () {
                return self.$showCategory();
            }).then(function () {
                self.Loader.hide();

            }).catch(function (err) {
                console.error(err);
                self.Loader.hide();
            });
        },

        /**
         * event: on category leave
         */
        $onCategoryLeave: function () {
            this.$unload();

            if (this.$Areas) {
                this.$Areas.destroy();
                this.$Areas = false;
            }

            if (this.$Editor) {
                this.$Editor.destroy();
                this.$Editor = false;
            }

            if (this.$Control) {
                this.$Control.destroy();
                this.$Control = false;
            }
        },

        /**
         * show the container
         *
         * @return Promise
         */
        $showCategory: function () {
            const self = this;

            if (this.$categoryAnimation) {
                if (this.$categoryAnimation.type === 'show') {
                    return this.$categoryAnimation.promise;
                }

                return this.$categoryAnimation.promise.then(function () {
                    return self.$showCategory();
                });
            }

            this.$categoryAnimation = {
                type: 'show',
                promise: new Promise(function (resolve) {
                moofx(self.$Container).animate({
                    opacity: 1,
                    top: 0
                }, {
                    duration: 250,
                    callback: function () {
                        self.$categoryAnimation = null;
                        resolve();
                    }
                });
                })
            };

            return this.$categoryAnimation.promise;
        },

        /**
         * hide the container
         *
         * @return Promise
         */
        $hideCategory: function () {
            const self = this;

            if (this.$categoryAnimation) {
                if (this.$categoryAnimation.type === 'hide') {
                    return this.$categoryAnimation.promise;
                }

                return this.$categoryAnimation.promise.then(function () {
                    return self.$hideCategory();
                });
            }

            // unload
            this.$unload();

            this.$categoryAnimation = {
                type: 'hide',
                promise: new Promise(function (resolve) {
                moofx(self.$Container).animate({
                    opacity: 0,
                    top: -20
                }, {
                    duration: 250,
                    callback: function () {
                        self.$Container.set('html', '');
                        self.$categoryAnimation = null;
                        resolve();
                    }
                });
                })
            };

            return this.$categoryAnimation.promise;
        }
    });
});
