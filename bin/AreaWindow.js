/**
 * AreaWindow Control
 * List of the areas which are available
 *
 * @event onSubmit [ this, areas ]
 */
define('package/quiqqer/bricks/bin/AreaWindow', [

    'qui/QUI',
    'qui/controls/windows/Confirm',
    'package/quiqqer/bricks/bin/Area',
    'Ajax',
    'Locale'

], function (QUI, QUIConfirm, Area, Ajax, QUILocale) {
    "use strict";

    return new Class({

        Extends: QUIConfirm,
        Type: 'package/quiqqer/bricks/bin/AreaWindow',

        Binds: [
            '$onOpen',
            '$filterAreas',
            '$onFilterInput'
        ],

        options: {
            icon: 'fa fa-th',
            title: QUILocale.get('quiqqer/bricks', 'area.window.title'),
            projectName: false,
            projectLang: false,
            maxHeight: 750,
            maxWidth: 500,
            texticon: false,

            cancel_button: {
                text: QUILocale.get('quiqqer/system', 'cancel'),
                textimage: 'fa fa-remove'
            },
            ok_button: {
                text: QUILocale.get('quiqqer/system', 'accept'),
                textimage: 'fa fa-check'
            }
        },

        initialize: function (options) {
            this.parent(options);

            this.$AreaElements = [];
            this.$AreaList = null;
            this.$AreaListWrapper = null;
            this.$Filter = null;
            this.$FilterWrapper = null;
            this.$FilterTimer = null;

            this.addEvents({
                onOpen: this.$onOpen
            });
        },

        /**
         * event: on open
         */
        $onOpen: function () {
            const self = this;

            this.Loader.show();

            this.getList(function (result) {
                const Content = self.getContent();
                let i, len, desc, title, description, AreaControl;

                Content.empty();
                Content.setStyles({
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden'
                });

                self.$AreaElements = [];
                self.$FilterWrapper = null;
                self.$AreaListWrapper = new Element('div', {
                    styles: {
                        boxSizing: 'border-box',
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'hidden',
                        overflowY: 'auto',
                        width: '100%'
                    }
                }).inject(Content);

                self.$AreaList = new Element('div', {
                    styles: {
                        float: 'left',
                        width: '100%'
                    }
                }).inject(self.$AreaListWrapper);

                if (result.length >= 10) {
                    self.$FilterWrapper = new Element('div', {
                        styles: {
                            background: '#fff',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            marginBottom: 10,
                            width: '100%'
                        }
                    }).inject(Content, 'top');

                    self.$Filter = new Element('input', {
                        type: 'search',
                        placeholder: 'Nach Titel oder Beschreibung filtern',
                        styles: {
                            boxSizing: 'border-box',
                            width: '100%'
                        },
                        events: {
                            input: self.$onFilterInput
                        }
                    }).inject(self.$FilterWrapper);
                } else {
                    self.$Filter = null;
                    self.$FilterWrapper = null;
                }

                for (i = 0, len = result.length; i < len; i++) {
                    title = result[i].title;
                    desc = result[i].description;
                    title = QUILocale.get(title.group, title['var']);
                    description = QUILocale.get(desc.group, desc['var']);

                    AreaControl = new Area({
                        title: title,
                        description: description,
                        area: result[i].name
                    }).inject(self.$AreaList);

                    self.$AreaElements.push({
                        Control: AreaControl,
                        Elm: AreaControl.getElm(),
                        TitleElm: AreaControl.getElm().getElement('.quiqqer-bricks-area-content-title'),
                        DescriptionElm: AreaControl.getElm().getElement('.quiqqer-bricks-area-content-description'),
                        originalTitle: String(title),
                        originalDescription: String(description),
                        title: String(title).toLowerCase(),
                        description: String(description).toLowerCase()
                    });
                }

                self.Loader.hide();

                if (self.$Filter) {
                    self.$Filter.focus();
                }
            });
        },

        $onFilterInput: function () {
            clearTimeout(this.$FilterTimer);

            this.$FilterTimer = this.$filterAreas.delay(180, this);
        },

        $filterAreas: function () {
            if (!this.$Filter) {
                return;
            }

            const rawSearch = this.$Filter.get('value').trim();
            const search = rawSearch.toLowerCase();

            this.$AreaElements.forEach(function (Entry) {
                if (!search || Entry.title.contains(search) || Entry.description.contains(search)) {
                    Entry.Elm.setStyle('display', '');
                    Entry.TitleElm.set('html', this.$highlightText(Entry.originalTitle, rawSearch));
                    Entry.DescriptionElm.set('html', this.$highlightText(Entry.originalDescription, rawSearch));
                    return;
                }

                Entry.Elm.setStyle('display', 'none');
            }, this);
        },

        $highlightText: function (text, search) {
            const escapedText = this.$escapeHtml(String(text));

            if (!search) {
                return escapedText;
            }

            const regex = new RegExp('(' + this.$escapeRegExp(search) + ')', 'ig');

            return escapedText.replace(regex, '<mark>$1</mark>');
        },

        $escapeHtml: function (text) {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        $escapeRegExp: function (text) {
            return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },

        /**
         * Return the areas of the project
         *
         * @param {Function} callback
         */
        getList: function (callback) {
            require(['']);

            Ajax.get('package_quiqqer_bricks_ajax_project_getAreas', callback, {
                'package': 'quiqqer/brick',
                project: JSON.encode({
                    name: this.getAttribute('projectName'),
                    lang: this.getAttribute('projectLang')
                })
            });
        },

        /**
         * Submit the window
         */
        submit: function () {
            const Content = this.getContent();

            const areas = Content.getElements(
                '.quiqqer-bricks-area-selected'
            ).map(function (Elm) {
                return Elm.get('data-area');
            });

            this.fireEvent('submit', [this, areas]);

            if (this.getAttribute('autoclose')) {
                this.close();
            }
        }
    });
});
