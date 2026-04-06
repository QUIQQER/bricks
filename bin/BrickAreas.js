/**
 * BrickAreas Control
 * Edit and change the areas for the brick
 *
 * @event onLoaded [ this ]
 */
define('package/quiqqer/bricks/bin/BrickAreas', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/buttons/Button',
    'package/quiqqer/bricks/bin/AreaWindow',
    'package/quiqqer/bricks/bin/Areas',
    'Ajax',
    'Locale',

    'css!package/quiqqer/bricks/bin/BrickAreas.css'

], function (QUI, QUIControl, QUIButton, AreaWindow, Areas, Ajax, QUILocale) {
    "use strict";

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/BrickAreas',

        Binds: [
            '$onDestroy'
        ],

        options: {
            brickId: false, // brickId
            styles: false,
            projectName: false,
            projectLang: false,
            areas: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$areas = {};
        },

        /**
         * Return the HTML Node Element
         *
         * @return {HTMLElement}
         */
        create: function () {
            const self = this;

            this.$Elm = new Element('div', {
                'class': 'quiqqer-bricks-brickareas',
                html: '<div class="quiqqer-bricks-brickareas-container"></div>' +
                    '<div class="quiqqer-bricks-brickareas-buttons"></div>'
            });

            if (this.getAttribute('styles')) {
                this.$Elm.setStyles(this.getAttribute('styles'));
            }

            this.$Container = this.$Elm.getElement('.quiqqer-bricks-brickareas-container');
            this.$Buttons = this.$Elm.getElement('.quiqqer-bricks-brickareas-buttons');

            new QUIButton({
                text: QUILocale.get('quiqqer/bricks', 'brick.edit.area.add'),
                styles: {
                    width: '100%'
                },
                events: {
                    onClick: function () {
                        new AreaWindow({
                            projectName: self.getAttribute('projectName'),
                            projectLang: self.getAttribute('projectLang'),
                            events: {
                                onSubmit: function (Win, areas) {
                                    for (let i = 0, len = areas.length; i < len; i++) {
                                        self.addArea(areas[i]);
                                    }
                                }
                            }
                        }).open();
                    }
                }
            }).inject(this.$Buttons);

            const areas = this.getAttribute('areas');

            if (areas) {
                areas.map(function (area) {
                    if (area !== '') {
                        self.addArea(area);
                    }
                });
            }

            return this.$Elm;
        },

        /**
         * Add an area
         *
         * @param {String} area - name of the area
         */
        addArea: function (area) {
            if (area in this.$areas) {
                return;
            }

            const self = this;

            this.$areas[area] = true;

            const BrickNode = new Element('div', {
                'class': 'quiqqer-bricks-brickareas-area',
                html: '<span class="fa fa-spinner fa-spin"></span>',
                'data-area': area
            }).inject(this.$Container);


            Areas.getList(
                this.getAttribute('projectName'),
                this.getAttribute('projectLang')
            ).then(function (list) {
                const name = this.get('data-area');

                let title = list.filter(function (Entry) {
                    return Entry.name === name;
                }).map(function (Entry) {
                    return Entry.title;
                });

                if (!title.length || typeof title[0] === 'undefined') {
                    title = name;
                } else if ("group" in title[0]) {
                    title = QUILocale.get(
                        title[0].group,
                        title[0].var
                    );
                } else {
                    title = title[0];
                }

                const Loader = this.getElement('.fa');

                Loader.removeClass('fa');
                Loader.removeClass('fa-spinner');
                Loader.removeClass('fa-spin');
                Loader.set('html', title);
            }.bind(BrickNode));

            new Element('span', {
                'class': 'fa fa-times',
                styles: {
                    cursor: 'pointer',
                    marginLeft: 10
                },
                events: {
                    click: function () {
                        const area = BrickNode.get('data-area');

                        if (self.$areas[area]) {
                            delete self.$areas[area];
                        }

                        BrickNode.destroy();
                    }
                }
            }).inject(BrickNode);
        },

        /**
         * Return the areas
         *
         * @return {Array}
         */
        getAreas: function () {
            const result = [];

            for (const area in this.$areas) {
                if (this.$areas.hasOwnProperty(area)) {
                    result.push(area);
                }
            }

            return result;
        }
    });
});
