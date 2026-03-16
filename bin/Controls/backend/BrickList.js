define('package/quiqqer/bricks/bin/Controls/backend/BrickList', [

    'qui/QUI',
    'qui/controls/Control',
    'controls/projects/Select',
    'controls/grid/Grid',
    'Locale',
    'Projects',
    'Ajax',
    'package/quiqqer/bricks/bin/Bricks',

    'css!package/quiqqer/bricks/bin/Controls/backend/BrickList.css'

], function (QUI, QUIControl, ProjectSelect, Grid, QUILocale, Projects, QUIAjax, Bricks) {
    "use strict";

    const lg = 'quiqqer/bricks';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickList',

        Binds: [
            '$onCreate',
            '$onInject',
            '$onDblClick',
            '$onProjectSelectLoad',
            '$ensureProjectSelection',
            'refresh'
        ],

        options: {
            project: false,
            lang: false,
            styles: false,
            multiple: true
        },

        initialize: function (options) {
            this.parent(options);

            this.$isLoaded = false;
            this.$Container = null;

            this.addEvents({
                onInject: this.$onInject
            });
        },

        create: function () {
            const Elm = this.parent();

            Elm.set({
                'data-quiid': this.getId(),
                'data-qui': 'package/quiqqer/bricks/bin/Controls/backend/BrickList'
            });

            Elm.addClass('quiqqer-bricks-brickList');

            if (this.getAttribute('styles')) {
                Elm.setStyles(this.getAttribute('styles'));
            }

            this.$ProjectSelect = new ProjectSelect({
                emptyselect: false,
                styles: {
                    marginBottom: 10,
                    width: '100%'
                },
                events: {
                    onChange: this.refresh,
                    onLoad: this.$onProjectSelectLoad
                }
            });

            if (this.getAttribute('project')) {
                this.$ProjectSelect.setAttribute('project', this.getAttribute('project'));
            }

            if (this.getAttribute('lang')) {
                this.$ProjectSelect.setAttribute('lang', this.getAttribute('lang'));
            }

            this.$ProjectSelect.inject(Elm);

            this.$Container = new Element('div').inject(Elm);

            if (this.getAttribute('styles')) {
                this.$Container.setStyles(this.getAttribute('styles'));
            }

            this.$Grid = new Grid(this.$Container, {
                columnModel: [
                    {
                        header: QUILocale.get('quiqqer/core', 'id'),
                        dataIndex: 'id',
                        dataType: 'integer',
                        width: 40
                    },
                    {
                        header: QUILocale.get(lg, 'manager.grid.status'),
                        dataIndex: 'activeDisplay',
                        dataType: 'node',
                        width: 60
                    },
                    {
                        header: QUILocale.get('quiqqer/core', 'title'),
                        dataIndex: 'title',
                        dataType: 'string',
                        width: 350
                    },
                    {
                        header: QUILocale.get('quiqqer/core', 'description'),
                        dataIndex: 'description',
                        dataType: 'string',
                        width: 300
                    },
                    {
                        header: QUILocale.get(lg, 'brick.type'),
                        dataIndex: 'type',
                        dataType: 'string',
                        width: 350
                    }
                ],
                multipleSelection: this.getAttribute('multiple'),
                pagination: true
            });

            this.$Grid.addEvents({
                onRefresh: this.refresh,
                onDblClick: this.$onDblClick
            });

            this.$isLoaded = true;

            return Elm;
        },

        $onInject: function () {
            this.$Grid.setHeight(this.$Container.getSize().y);
            this.$ensureProjectSelection();
            this.refresh();
        },

        $onProjectSelectLoad: function () {
            this.$ensureProjectSelection();
            this.refresh();
        },

        /**
         * Refresh the panel data
         */
        refresh: function () {
            if (!this.$isLoaded) {
                return Promise.resolve();
            }

            if (!this.$Elm) {
                return Promise.resolve();
            }

            const self = this;
            let value = this.$ProjectSelect.getValue();

            if (value === null || value === '') {
                this.$ensureProjectSelection();
                value = this.$ProjectSelect.getValue();
            }

            if (value === null || value === '') {
                return Promise.resolve();
            }

            value = value.split(',');

            this.$ProjectSelect.disable();
            this.$Grid.showLoader();

            return Bricks.getBricksFromProject(value[0], value[1]).then(function (result) {
                result = result.map(function (entry) {
                    entry.activeDisplay = new Element('span', {
                        'class': parseInt(entry.active) ? 'fa fa-check' : 'fa fa-ban',
                        title: parseInt(entry.active)
                            ? QUILocale.get(lg, 'manager.grid.status.active')
                            : QUILocale.get(lg, 'manager.grid.status.inactive')
                    });

                    return entry;
                });

                let options = self.$Grid.options,
                    page = parseInt(options.page),
                    perPage = parseInt(options.perPage),
                    start = (page - 1) * perPage;

                self.$Grid.setData({
                    data: result.slice(start, start + perPage),
                    page: page,
                    total: result.length
                });

                self.$ProjectSelect.enable();
                self.$Grid.hideLoader();
            });
        },

        $ensureProjectSelection: function () {
            if (!this.$ProjectSelect) {
                return;
            }

            const value = this.$ProjectSelect.getValue();

            if (value !== null && value !== '') {
                return;
            }

            if (!this.$ProjectSelect.$Select || !this.$ProjectSelect.$Select.firstChild) {
                return;
            }

            const firstOption = this.$ProjectSelect.$Select.firstChild();

            if (!firstOption) {
                return;
            }

            const firstValue = firstOption.getAttribute('value');

            if (firstValue === null || firstValue === '') {
                return;
            }

            this.$ProjectSelect.$Select.setValue(firstValue);
        },

        /**
         * @return {Object}
         */
        getValue: function () {
            return this.$Grid.getSelectedData();
        },

        $onDblClick: function () {
            this.fireEvent('dblClick', [this]);
        }
    });
});
