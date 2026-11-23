/**
 * Area edit control for the site object
 */
define('package/quiqqer/bricks/bin/Site/BrickEdit', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/loader/Loader',
    'qui/utils/Form',
    'utils/Template',
    'utils/Controls',
    'Ajax',

    'css!package/quiqqer/bricks/bin/Site/BrickEdit.css'

], function (QUI, QUIControl, QUILoader, QUIFormUtils, Template, ControlUtils, QUIAjax) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Site/BrickEdit',

        Binds: [
            '$onInject',
            '$brickSettingsPromise',
            '$onVisibilityChange',
            '$getFlexibleSettings',
            '$resizeControls',
            'refreshLayout',
            'openBrick',
            'openBrickInPanel',
            'getDialogSettingsMeta'
        ],

        options: {
            brickId: false,
            Site: false,
            customfields: false,
            hasCustomFields: false,
        },

        initialize: function (options) {
            this.parent(options);

            this.Loader = new QUILoader();
            this.$Form = null;

            /**
             * To check, if the brick has custom fields (this.hasCustomFields())
             * we need to get the brick data. The brick data comes from ajax request.
             * Therefore, we save the promise as a property to avoid multiple ajax requests.
             * E.g. we need in package/quiqqer/bricks/bin/Site/Area
             * this.openBrickSettingDialog()
             * to know if a brick has custom fields to make the dialog larger.
             *
             * @type {Promise<unknown>}
             */
            this.$brickSettingsPromise = this.getBrickSettings().then((result) => {
                result.flexibleSettings = this.$getFlexibleSettings(
                    result.customfields,
                    result.availableSettings
                );

                if (result.flexibleSettings.length > 0) {
                    this.setAttribute('hasCustomFields', true);
                }

                if (result.flexibleSettings.some((setting) => {
                    return setting.source === 'window' || !!setting['data-qui'];
                })) {
                    this.setAttribute('hasComplexCustomFields', true);
                }

                return result;
            });

            this.$globalBrickSettings = {};

            this.addEvents({
                onInject: this.$onInject
            });
        },

        /**
         * Return the domnode element
         *
         * @returns {HTMLDivElement}
         */
        create: function () {
            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-site-brickedit'
            });

            this.Loader.inject(this.$Elm);
            this.$Form = new Element('form').inject(this.$Elm);

            return this.$Elm;
        },

        /**
         * event on inject
         */
        $onInject: function () {
            if (!this.getAttribute('brickId')) {
                console.error('Missing brick-ID');
                return;
            }

            if (!this.getAttribute('Site')) {
                console.error('Missing Site');
                return;
            }

            const self = this;
            const Project = this.getAttribute('Site').getProject();

            this.Loader.show();

            this.$brickSettingsPromise.then(function (result) {
                self.$globalBrickSettings = result.settings;

                return Template.get('bin/Site/BrickEdit', false, {
                    'package': 'quiqqer/bricks',
                    params: JSON.encode({
                        flexibleSettings: result.flexibleSettings
                    })
                });

            }).then(function (html) {
                self.getElm().set('html', html);

                const Form = self.getElm().getElement('form');
                Form.dataset.projectName = Project.getName();
                Form.dataset.projectLang = Project.getLang();
                QUIFormUtils.setDataToForm(self.$globalBrickSettings, Form);

                if (self.getAttribute('customfields')) {
                    QUIFormUtils.setDataToForm(
                        self.getAttribute('customfields'),
                        Form
                    );
                }

                return QUI.parse(self.getElm());
            }).then(function () {
                return ControlUtils.parse(self.getElm());
            }).then(function () {
                let i, len, Control;

                const controls = self.getElm().getElements('[data-quiid]'),
                    Visibility = self.getElm().getElement('[name="visibility"]');

                for (i = 0, len = controls.length; i < len; i++) {
                    Control = QUI.Controls.getById(controls[i].get('data-quiid'));

                    if (Control && "setProject" in Control) {
                        Control.setProject(Project);
                    }
                }

                if (Visibility) {
                    Visibility.addEvent('change', self.$onVisibilityChange);
                    self.$onVisibilityChange();
                }

                self.$resizeControls(controls);
                self.Loader.hide();
            }).catch(function (err) {
                self.Loader.hide();
                console.error(err);
            });
        },

        /**
         * Return the enabled flexible settings for the current brick.
         *
         * @param {Array} customfields
         * @param {Array} availableSettings
         * @returns {Array}
         */
        $getFlexibleSettings: function (customfields, availableSettings) {
            if (!Array.isArray(customfields) || !Array.isArray(availableSettings)) {
                return [];
            }

            return customfields.map((fieldName) => {
                return availableSettings.find((setting) => {
                    return setting.name === fieldName;
                });
            }).filter(Boolean);
        },

        /**
         * Return the settings of the brick
         *
         * @returns {Promise}
         */
        getBrickSettings: function () {
            return new Promise(function (resolve, reject) {
                QUIAjax.get('package_quiqqer_bricks_ajax_getBrick', function (result) {
                    resolve(result);
                }.bind(this), {
                    'package': 'quiqqer/bricks',
                    onError: reject,
                    brickId: this.getAttribute('brickId')
                });

            }.bind(this));
        },

        /**
         * Toggle the group selection row depending on visibility mode.
         */
        $onVisibilityChange: function () {
            const Form = this.getElm().getElement('form');

            if (!Form) {
                return;
            }

            const Visibility = Form.elements.visibility;
            const GroupsRow = this.getElm().getElement('[data-name="visibility-groups-row"]');

            if (!Visibility || !GroupsRow) {
                return;
            }

            GroupsRow.setStyle(
                'display',
                Visibility.value === 'groups' ? '' : 'none'
            );
        },

        /**
         * Resize parsed controls after the layout has settled.
         *
         * @param {Elements|Array} controls
         */
        $resizeControls: function (controls) {
            const resizeControls = function () {
                for (let i = 0, len = controls.length; i < len; i++) {
                    const Control = QUI.Controls.getById(controls[i].get('data-quiid'));

                    if (Control && "resize" in Control && typeOf(Control.resize) === 'function') {
                        Control.resize();

                    }
                }
            };

            window.setTimeout(resizeControls, 0);
            window.setTimeout(resizeControls, 150);
        },

        refreshLayout: function () {
            const Elm = this.getElm();

            if (!Elm) {
                return;
            }

            this.$resizeControls(Elm.getElements('[data-quiid]'));
        },

        /**
         * Opens the brick panel
         */
        openBrick: function () {
            return this.openBrickInPopup();
        },

        /**
         * Opens the brick popup
         */
        openBrickInPopup: function () {
            let brickId = this.getAttribute('brickId'),
                projectName = '',
                projectLang = '';

            if (this.getAttribute('Site')) {
                projectName = this.getAttribute('Site').getProject().getName();
                projectLang = this.getAttribute('Site').getProject().getLang();
            }

            return new Promise(function (resolve) {
                require([
                    'package/quiqqer/bricks/bin/Controls/backend/BrickEditWindow'
                ], function (BrickEditWindow) {
                    const Window = new BrickEditWindow({
                        brickId: brickId,
                        projectName: projectName,
                        projectLang: projectLang
                    });

                    Window.open();
                    resolve(Window);
                });
            });
        },

        /**
         * Opens the brick in the desktop panel/tasks view
         */
        openBrickInPanel: function () {
            let brickId = this.getAttribute('brickId'),
                projectName = '',
                projectLang = '';

            if (this.getAttribute('Site')) {
                projectName = this.getAttribute('Site').getProject().getName();
                projectLang = this.getAttribute('Site').getProject().getLang();
            }

            return new Promise(function (resolve) {
                require([
                    'package/quiqqer/bricks/bin/BrickEdit',
                    'utils/Panels'
                ], function (BrickEdit, PanelUtils) {
                    const Panel = new BrickEdit({
                        '#id': 'brick-edit-' + brickId,
                        id: brickId,
                        projectName: projectName,
                        projectLang: projectLang
                    });

                    PanelUtils.openPanelInTasks(Panel);
                    resolve(Panel);
                });
            });
        },

        /**
         * Check if the brick has custom fields
         *
         * @returns {Promise}
         */
        hasCustomFields: function () {
            return this.$brickSettingsPromise.then(() => {
                return this.getAttribute('hasCustomFields');
            });
        },

        /**
         * Return recommended popup dimensions based on the enabled flexible settings.
         *
         * @returns {Promise<{hasCustomFields: boolean, hasComplexCustomFields: boolean, maxWidth: number, maxHeight: number}>}
         */
        getDialogSettingsMeta: function () {
            return this.$brickSettingsPromise.then(() => {
                const hasCustomFields = !!this.getAttribute('hasCustomFields');
                const hasComplexCustomFields = !!this.getAttribute('hasComplexCustomFields');

                return {
                    hasCustomFields: hasCustomFields,
                    hasComplexCustomFields: hasComplexCustomFields,
                    maxWidth: hasComplexCustomFields ? 980 : 860,
                    maxHeight: hasComplexCustomFields ? 900 : 760
                };
            });
        }
    });
});
