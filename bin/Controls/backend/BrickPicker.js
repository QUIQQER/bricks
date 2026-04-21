define('package/quiqqer/bricks/bin/Controls/backend/BrickPicker', [

    'qui/QUI',
    'qui/controls/Control',
    'controls/projects/Select',
    'Locale',
    'package/quiqqer/bricks/bin/Bricks',

    'css!package/quiqqer/bricks/bin/Controls/backend/BrickPicker.css'

], function (QUI, QUIControl, ProjectSelect, QUILocale, Bricks) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const PLACEHOLDER_IMAGE = '/packages/quiqqer/bricks/bin/images/mockup-placeholder.svg';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BrickPicker',

        Binds: [
            '$onInject',
            '$onProjectSelectLoad',
            '$ensureProjectSelection',
            'refresh',
            'setItems',
            'getValue',
            '$onSearchInput',
            '$onKeyDown',
            '$onProjectChange'
        ],

        options: {
            items: false,
            project: false,
            lang: false,
            styles: false,
            multiple: false,
            showProjectSelect: true,
            autoExecute: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$ProjectSelect = null;
            this.$SearchInput = null;
            this.$CounterNode = null;
            this.$Grid = null;
            this.$EmptyState = null;
            this.$CardNodes = [];
            this.$ActiveCard = null;
            this.$SelectedIds = [];
            this.$Items = [];

            this.addEvents({
                onInject: this.$onInject
            });
        },

        create: function () {
            this.$Elm = this.parent();
            this.$Elm.addClass('quiqqer-bricks-brickPicker');

            if (this.getAttribute('styles')) {
                this.$Elm.setStyles(this.getAttribute('styles'));
            }

            const Toolbar = new Element('div', {
                'class': 'quiqqer-bricks-brickPicker-toolbar'
            }).inject(this.$Elm);

            if (this.$usesProjectSelect()) {
                const ProjectWrapper = new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-project'
                }).inject(Toolbar);

                this.$ProjectSelect = new ProjectSelect({
                    emptyselect: false,
                    project: this.getAttribute('project'),
                    lang: this.getAttribute('lang'),
                    styles: {
                        width: '100%'
                    },
                    events: {
                        onChange: this.$onProjectChange,
                        onLoad: this.$onProjectSelectLoad
                    }
                }).inject(ProjectWrapper);
            }

            const Search = new Element('label', {
                'class': 'quiqqer-bricks-brickPicker-search'
            }).inject(Toolbar);

            new Element('span', {
                'class': 'fa fa-search quiqqer-bricks-brickPicker-searchIcon',
                'aria-hidden': 'true'
            }).inject(Search);

            this.$SearchInput = new Element('input', {
                'class': 'quiqqer-bricks-brickPicker-searchInput',
                type: 'search',
                placeholder: QUILocale.get(lg, 'site.area.window.input.placeholder'),
                autocomplete: 'off',
                events: {
                    input: this.$onSearchInput,
                    keydown: this.$onKeyDown
                }
            }).inject(Search);

            this.$CounterNode = new Element('div', {
                'class': 'quiqqer-bricks-brickPicker-counter'
            }).inject(Search);

            const Hints = new Element('div', {
                'class': 'quiqqer-bricks-brickPicker-hints',
                'aria-label': QUILocale.get(lg, 'site.area.window.shortcuts.label')
            }).inject(this.$Elm);

            [
                {
                    keys: ['Tab'],
                    label: QUILocale.get(lg, 'site.area.window.shortcuts.navigate')
                },
                {
                    keys: ['Enter'],
                    label: this.getAttribute('autoExecute')
                        ? QUILocale.get(lg, 'site.area.window.shortcuts.add')
                        : QUILocale.get('quiqqer/system', 'accept')
                },
                {
                    keys: ['Esc'],
                    label: QUILocale.get(lg, 'site.area.window.shortcuts.close')
                }
            ].forEach(function (entry) {
                const Hint = new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-hint'
                }).inject(Hints);

                const Keys = new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-hintKeys',
                    'aria-hidden': 'true'
                }).inject(Hint);

                entry.keys.forEach(function (key, index) {
                    new Element('kbd', {
                        text: key
                    }).inject(Keys);

                    if (index < entry.keys.length - 1) {
                        new Element('span', {
                            'class': 'quiqqer-bricks-brickPicker-hintSep',
                            text: '/'
                        }).inject(Keys);
                    }
                });

                new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-hintText',
                    text: entry.label
                }).inject(Hint);
            });

            this.$Grid = new Element('div', {
                'class': 'quiqqer-bricks-brickPicker-grid',
                events: {
                    keydown: this.$onKeyDown
                }
            }).inject(this.$Elm);

            this.$EmptyState = new Element('div', {
                'class': 'quiqqer-bricks-brickPicker-empty',
                text: QUILocale.get(lg, 'site.area.window.results.empty'),
                styles: {
                    display: 'none'
                }
            }).inject(this.$Grid);

            return this.$Elm;
        },

        $onInject: function () {
            if (this.getAttribute('items')) {
                this.setItems(this.getAttribute('items'));
            } else if (!this.$usesProjectSelect()) {
                this.refresh();
            } else {
                this.$ensureProjectSelection();
            }

            if (this.$SearchInput) {
                this.$SearchInput.focus.delay(50, this.$SearchInput);
            }
        },

        $onProjectSelectLoad: function () {
            this.$ensureProjectSelection();
            this.refresh();
        },

        $onProjectChange: function () {
            this.refresh();
        },

        $usesProjectSelect: function () {
            return this.getAttribute('showProjectSelect') && !this.getAttribute('items');
        },

        $ensureProjectSelection: function () {
            if (!this.$ProjectSelect || !this.$ProjectSelect.$Select) {
                return;
            }

            const currentValue = this.$ProjectSelect.getValue();

            if (currentValue !== null && currentValue !== '') {
                return;
            }

            const Select = this.$ProjectSelect.$Select;
            const desiredProject = this.getAttribute('project');
            const desiredLang = this.getAttribute('lang');
            let fallbackValue = null;
            let projectFallbackValue = null;
            let exactMatchValue = null;

            if (!Select.firstChild || !Select.firstChild()) {
                return;
            }

            Select.getChildren().each(function (Option) {
                const value = Option.getAttribute('value');

                if (value === null || value === '') {
                    return;
                }

                if (!fallbackValue) {
                    fallbackValue = value;
                }

                if (!desiredProject) {
                    return;
                }

                if (value === desiredProject || value === desiredProject + ',' + desiredLang) {
                    exactMatchValue = value;
                    return;
                }

                if (!projectFallbackValue && value.indexOf(desiredProject + ',') === 0) {
                    projectFallbackValue = value;
                }
            });

            Select.setValue(exactMatchValue || projectFallbackValue || fallbackValue);
        },

        setItems: function (items) {
            this.$Items = Array.isArray(items) ? items.slice() : [];
            this.$SelectedIds = [];
            this.$renderItems();
        },

        refresh: function () {
            if (this.getAttribute('items')) {
                this.setItems(this.getAttribute('items'));
                return Promise.resolve(this.$Items);
            }

            const projectData = this.$getProjectData();

            if (!projectData.project || !projectData.lang) {
                this.setItems([]);
                return Promise.resolve([]);
            }

            if (this.$ProjectSelect) {
                this.$ProjectSelect.disable();
            }

            return Bricks.getBricksFromProject(projectData.project, projectData.lang).then(function (items) {
                items = items.map(function (item) {
                    if (!item.project) {
                        item.project = projectData.project;
                    }

                    if (!item.lang) {
                        item.lang = projectData.lang;
                    }

                    return item;
                });

                this.setItems(items);

                if (this.$ProjectSelect) {
                    this.$ProjectSelect.enable();
                }

                return items;
            }.bind(this)).catch(function (error) {
                this.setItems([]);

                if (this.$ProjectSelect) {
                    this.$ProjectSelect.enable();
                }

                throw error;
            }.bind(this));
        },

        $getProjectData: function () {
            if (this.$ProjectSelect) {
                let value = this.$ProjectSelect.getValue();

                if (!value) {
                    return {
                        project: false,
                        lang: false
                    };
                }

                value = value.split(',');

                return {
                    project: value[0] || false,
                    lang: value[1] || false
                };
            }

            return {
                project: this.getAttribute('project') || false,
                lang: this.getAttribute('lang') || false
            };
        },

        $renderItems: function () {
            const self = this;
            const viewData = this.$Items.map(function (brick) {
                return self.$getDisplayData(brick);
            });

            this.$CardNodes.forEach(function (Card) {
                Card.destroy();
            });

            this.$CardNodes = [];
            this.$ActiveCard = null;

            viewData.forEach(function (brick) {
                const Card = new Element('button', {
                    type: 'button',
                    'class': 'quiqqer-bricks-brickPicker-card' +
                        (brick.isActive ? '' : ' quiqqer-bricks-brickPicker-card--inactive'),
                    'data-brick-id': brick.id,
                    'data-search': brick.search,
                    'aria-current': 'false',
                    'aria-hidden': 'false',
                    events: {
                        click: function () {
                            self.$handleCardClick(Card);
                        },
                        dblclick: function () {
                            self.$selectCard(Card, false);
                            self.$executeSelection();
                        },
                        focus: function () {
                            self.$setActiveCard(Card, false);
                        },
                        keydown: self.$onKeyDown
                    }
                }).inject(this.$Grid);

                const Thumb = new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-cardThumb'
                }).inject(Card);

                new Element('img', {
                    src: brick.image,
                    alt: brick.displayTitle
                }).inject(Thumb);

                const Body = new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-cardBody'
                }).inject(Card);

                new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-cardName',
                    text: brick.displayTitle
                }).inject(Body);

                const Badges = new Element('div', {
                    'class': 'quiqqer-bricks-brickPicker-cardBadges'
                }).inject(Body);

                brick.badges.forEach(function (badge) {
                    new Element('span', {
                        'class': badge.className,
                        title: badge.text,
                        text: badge.text
                    }).inject(Badges);
                });

                if (brick.displayDescription) {
                    new Element('div', {
                        'class': 'quiqqer-bricks-brickPicker-cardDescription',
                        text: brick.displayDescription
                    }).inject(Body);
                }

                this.$CardNodes.push(Card);
            }, this);

            this.$applyFilter();
        },

        $getDisplayData: function (brick) {
            const instanceTitle = brick.title || brick.type || '';
            const brickTypeTitle = brick.name && typeof brick.name === 'object'
                ? QUILocale.get(brick.name.group, brick.name.var)
                : '';
            const displayTitle = instanceTitle || brickTypeTitle || brick.type || '';
            const displayDescription = this.$toPreviewText(brick.description || '', 180);
            const displayType = brick.type || '';
            const isActive = parseInt(brick.active) === 1;
            const badges = [];

            if (brickTypeTitle && brickTypeTitle !== displayTitle) {
                badges.push({
                    className: 'badge badge-success-light badge-sm',
                    text: brickTypeTitle
                });
            }

            if (displayType) {
                badges.push({
                    className: 'badge badge-light badge-sm',
                    text: displayType
                });
            }

            if (!isActive) {
                badges.push({
                    className: 'badge badge-warning badge-sm',
                    text: QUILocale.get(lg, 'site.area.window.add.brickIsDisabled')
                });
            }

            return {
                id: brick.id,
                image: brick.mockup || brick.thumbnail || PLACEHOLDER_IMAGE,
                displayTitle: displayTitle,
                displayDescription: displayDescription,
                isActive: isActive,
                badges: badges,
                search: [
                    this.$toPlainText(displayTitle),
                    this.$toPlainText(brickTypeTitle),
                    displayDescription,
                    displayType,
                    isActive ? '' : QUILocale.get(lg, 'site.area.window.add.brickIsDisabled')
                ].join(' ').toLowerCase()
            };
        },

        $toPlainText: function (value) {
            if (!value) {
                return '';
            }

            return new Element('div', {
                html: String(value)
            }).get('text').replace(/\s+/g, ' ').trim();
        },

        $toPreviewText: function (value, maxLength) {
            const normalized = this.$toPlainText(value);

            if (!normalized || normalized.length <= maxLength) {
                return normalized;
            }

            return normalized.slice(0, maxLength - 1).trim() + '…';
        },

        $onSearchInput: function () {
            this.$applyFilter();
        },

        $applyFilter: function () {
            if (!this.$SearchInput || !this.$CounterNode || !this.$EmptyState) {
                return;
            }

            const term = this.$SearchInput.value.trim().toLowerCase();
            let visibleCount = 0;

            this.$CardNodes.forEach(function (Card) {
                const visible = !term || Card.getAttribute('data-search').indexOf(term) !== -1;

                Card.setStyle('display', visible ? null : 'none');
                Card.setAttribute('aria-hidden', visible ? 'false' : 'true');

                if (visible) {
                    visibleCount++;
                }
            });

            this.$CounterNode.set('text', '(' + visibleCount + ')');
            this.$EmptyState.setStyle('display', visibleCount ? 'none' : null);

            if (!visibleCount) {
                this.$CardNodes.forEach(function (Card) {
                    Card.removeClass('quiqqer-bricks-brickPicker-card--active');
                    Card.setAttribute('aria-current', 'false');
                });

                this.$ActiveCard = null;
                return;
            }

            if (!this.$ActiveCard || this.$ActiveCard.getStyle('display') === 'none') {
                this.$setActiveCard(this.$getVisibleCards()[0], false);
            } else {
                this.$syncSelectedState();
            }
        },

        $getVisibleCards: function () {
            return this.$CardNodes.filter(function (Card) {
                return Card.getStyle('display') !== 'none';
            });
        },

        $setActiveCard: function (Card, focusCard) {
            if (!Card || Card.getStyle('display') === 'none') {
                return;
            }

            this.$CardNodes.forEach(function (Node) {
                Node.removeClass('quiqqer-bricks-brickPicker-card--active');
                Node.setAttribute('aria-current', 'false');
            });

            this.$ActiveCard = Card;
            Card.addClass('quiqqer-bricks-brickPicker-card--active');
            Card.setAttribute('aria-current', 'true');

            if (focusCard) {
                Card.focus();
            }

            if (typeof Card.scrollIntoView === 'function') {
                Card.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest'
                });
            }

            this.$syncSelectedState();
        },

        $handleCardClick: function (Card) {
            this.$selectCard(Card, false);

            if (this.getAttribute('autoExecute')) {
                this.$executeSelection();
            }
        },

        $selectCard: function (Card, focusCard) {
            if (!Card) {
                return;
            }

            const brickId = String(Card.getAttribute('data-brick-id'));

            this.$setActiveCard(Card, focusCard);

            if (this.getAttribute('multiple')) {
                const index = this.$SelectedIds.indexOf(brickId);

                if (index === -1) {
                    this.$SelectedIds.push(brickId);
                } else {
                    this.$SelectedIds.splice(index, 1);
                }
            } else {
                this.$SelectedIds = [brickId];
            }

            this.$syncSelectedState();
        },

        $syncSelectedState: function () {
            const selectedIds = this.$SelectedIds;

            this.$CardNodes.forEach(function (Card) {
                const isSelected = selectedIds.indexOf(String(Card.getAttribute('data-brick-id'))) !== -1;

                if (isSelected) {
                    Card.addClass('quiqqer-bricks-brickPicker-card--selected');
                } else {
                    Card.removeClass('quiqqer-bricks-brickPicker-card--selected');
                }

                Card.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });
        },

        $executeSelection: function () {
            const value = this.getValue();

            if (!value.length) {
                return;
            }

            this.fireEvent('execute', [this, value]);
        },

        getValue: function () {
            const selectedIds = this.$SelectedIds;

            return this.$Items.filter(function (item) {
                return selectedIds.indexOf(String(item.id)) !== -1;
            });
        },

        $onKeyDown: function (event) {
            const nativeEvent = event.event || event;
            const key = String(event.key || nativeEvent.key || '').toLowerCase();

            if (key === 'esc' || key === 'escape') {
                event.preventDefault();
                event.stopPropagation();
                this.fireEvent('escape', [this]);
                return;
            }

            if (key === 'enter') {
                event.preventDefault();
                event.stopPropagation();

                if (!this.$ActiveCard) {
                    const visible = this.$getVisibleCards();

                    if (visible.length) {
                        this.$selectCard(visible[0], true);
                    }
                } else if (!this.getValue().length) {
                    this.$selectCard(this.$ActiveCard, true);
                }

                this.$executeSelection();
                return;
            }

            return;
        }
    });
});
