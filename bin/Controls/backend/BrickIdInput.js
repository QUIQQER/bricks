/**
 * Settings input control for a single "open brick" reference.
 *
 * Enhances a hidden input that stores a brick id. It renders a read-only
 * display, a select button (opens the brick picker) and a clear button, and
 * toggles dependent fields declared with:
 *
 *   data-dependency="<name of this input>"
 *   data-dependency-options="*"   -> visible while a brick is selected
 *   data-dependency-options="!*"  -> visible while no brick is selected
 *
 * The dependency evaluation mirrors
 * package/quiqqer/core/bin/QUI/controls/settings/Dependency so a single
 * data-qui control can own both the selection UI and the field toggling
 * (QUI.parse allows only one data-qui control per element).
 *
 * @module package/quiqqer/bricks/bin/Controls/backend/BrickIdInput
 */
define('package/quiqqer/bricks/bin/Controls/backend/BrickIdInput', [

    'qui/controls/Control',
    'Ajax',
    'Locale',

    'css!package/quiqqer/bricks/bin/Controls/backend/BrickIdInput.css'

], function (QUIControl, QUIAjax, QUILocale) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickIdInput',

        Binds: [
            '$onImport',
            '$openSelect',
            '$clear',
            '$applyDependencies'
        ],

        options: {
            project: false,
            lang: false,

            // Restrict what the picker offers. Written in a bricks.xml as
            // data-qui-options-brickcategories / -brickcontrols, therefore
            // all lowercase and comma separated. Both are combined with OR:
            // a brick qualifies through its category OR through its control
            // being named explicitly. Neither set means no filtering.
            brickcategories: false,
            brickcontrols: false,

            // Optional message for the picker's empty state, e.g. to say
            // which kind of brick has to be created first.
            emptytext: ''
        },

        initialize: function (options) {
            this.parent(options);

            this.$Input = null;
            this.$Display = null;
            this.$Title = null;
            this.$Fields = [];

            this.addEvents({
                onImport: this.$onImport
            });
        },

        $onImport: function () {
            this.$Input = this.getElm();

            if (!this.$Input) {
                return;
            }

            this.$Input.type = 'hidden';

            const Field = this.$Input.parentNode;

            if (!Field) {
                return;
            }

            const Row = document.createElement('span');
            Row.className = 'quiqqer-bricks-brickIdInput';
            Row.setAttribute('data-name', 'brickIdInput');

            this.$Display = document.createElement('input');
            this.$Display.type = 'text';
            this.$Display.readOnly = true;
            this.$Display.className = 'quiqqer-bricks-brickIdInput__display';
            this.$Display.setAttribute('data-name', 'display');
            this.$Display.placeholder = QUILocale.get(lg, 'quiqqer.bricks.buttons.settings.createPopup.openBrick');

            const SelectButton = document.createElement('button');
            SelectButton.type = 'button';
            SelectButton.className = 'btn btn-light';
            SelectButton.setAttribute('data-name', 'select');
            SelectButton.innerHTML = QUILocale.get(lg, 'quiqqer.bricks.buttons.settings.createPopup.openBrick.select') +
                ' <span class="fa fa-cubes" aria-hidden="true"></span>';

            const ClearButton = document.createElement('button');
            ClearButton.type = 'button';
            ClearButton.className = 'btn btn-danger';
            ClearButton.setAttribute('data-name', 'clear');
            ClearButton.title = QUILocale.get(lg, 'quiqqer.bricks.buttons.settings.createPopup.openBrick.clear');
            ClearButton.setAttribute('aria-label', ClearButton.title);
            ClearButton.innerHTML = '<span class="fa fa-trash-can" aria-hidden="true"></span>';

            Row.appendChild(this.$Display);
            Row.appendChild(SelectButton);
            Row.appendChild(ClearButton);

            this.$Title = document.createElement('small');
            this.$Title.className = 'quiqqer-bricks-brickIdInput__title';
            this.$Title.setAttribute('data-name', 'title');

            Field.appendChild(Row);
            Field.appendChild(this.$Title);

            SelectButton.addEventListener('click', this.$openSelect);
            ClearButton.addEventListener('click', this.$clear);

            // dependent fields in the same settings table
            const Scope = this.$Input.closest('form') || this.$Input.closest('table');

            if (Scope) {
                this.$Fields = Array.from(
                    Scope.querySelectorAll('[data-dependency="' + this.$Input.name + '"]')
                );
            }

            this.$Input.addEventListener('change', this.$applyDependencies);

            this.$updateDisplay();
            this.$applyDependencies();
            this.$loadBrickTitle();
        },

        /**
         * Store the project and forward it to nothing else; used for the picker.
         *
         * @param {Object|String} Project
         */
        setProject: function (Project) {
            this.setAttribute('project', Project);
        },

        $getValue: function () {
            const value = parseInt(this.$Input.value, 10);

            return !isNaN(value) && value > 0 ? value : 0;
        },

        $openSelect: function () {
            const self = this;

            require([
                'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow'
            ], function (BrickSelectWindow) {
                const projectData = self.$getProjectAndLang();

                new BrickSelectWindow({
                    project: projectData.project,
                    lang: projectData.lang,
                    multiple: false,
                    brickCategories: self.getAttribute('brickcategories'),
                    brickControls: self.getAttribute('brickcontrols'),
                    emptyText: self.getAttribute('emptytext'),
                    events: {
                        onSubmit: function (Win, bricks) {
                            if (!bricks.length) {
                                return;
                            }

                            self.$Input.value = parseInt(bricks[0].id, 10) || '';
                            self.$setTitle((bricks[0].title || '').toString().trim());
                            self.$updateDisplay();
                            self.$Input.dispatchEvent(new Event('change'));
                        }
                    }
                }).open();
            });
        },

        $clear: function () {
            this.$Input.value = '';
            this.$setTitle('');
            this.$updateDisplay();
            this.$Input.dispatchEvent(new Event('change'));
        },

        $updateDisplay: function () {
            const value = this.$getValue();

            this.$Display.value = value > 0 ? '#' + value : '';
        },

        $setTitle: function (title) {
            if (!this.$Title) {
                return;
            }

            if (!title) {
                this.$Title.textContent = '';
                return;
            }

            this.$Title.textContent = QUILocale.get(
                lg,
                'quiqqer.bricks.buttons.settings.createPopup.openBrick.titleLabel'
            ) + ': ' + title;
        },

        /**
         * Load and display the title of the already selected brick.
         */
        $loadBrickTitle: function () {
            const value = this.$getValue();

            if (value <= 0) {
                return;
            }

            const self = this;

            QUIAjax.get('package_quiqqer_bricks_ajax_getBrick', function (result) {
                if (result && result.attributes && result.attributes.title) {
                    self.$setTitle(result.attributes.title.toString().trim());
                }
            }, {
                'package': 'quiqqer/bricks',
                brickId: value,
                onError: function () {
                }
            });
        },

        $applyDependencies: function () {
            const isFilled = this.$getValue() > 0;

            this.$Fields.forEach(function (Field) {
                const entries = (Field.getAttribute('data-dependency-options') || '')
                    .split(',')
                    .map(function (entry) {
                        return entry.trim();
                    });

                let visible;

                if (entries.indexOf('!*') !== -1) {
                    visible = !isFilled;
                } else if (entries.indexOf('*') !== -1) {
                    visible = isFilled;
                } else {
                    visible = true;
                }

                const Row = Field.closest('[data-dependency-row]')
                    || Field.closest('tr')
                    || Field;

                Row.style.display = visible ? null : 'none';
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

            if (typeof Project === 'string') {
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

            if ('getName' in Project) {
                project = Project.getName();
            }

            if ('getLang' in Project) {
                lang = Project.getLang();
            }

            return {
                project: project,
                lang: lang
            };
        }
    });
});
