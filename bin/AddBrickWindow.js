define('package/quiqqer/bricks/bin/AddBrickWindow', [
    'qui/QUI',
    'qui/controls/windows/SimpleWindow',
    'Locale',
    'Mustache',
    'Ajax',
    'package/quiqqer/bricks/bin/Bricks',
    'text!package/quiqqer/bricks/bin/AddBrickWindow.html',
    'css!package/quiqqer/bricks/bin/AddBrickWindow.css'
], function (QUI, QUISimpleWindow, QUILocale, Mustache, Ajax, Bricks, template) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const SHORTCUT_HINTS_STORAGE_KEY = 'quiqqer.bricks.addBrickWindow.shortcutHintsExpanded';

    return new Class ({
        Extends: QUISimpleWindow,

        Binds: [
            '$onOpen',
            'applyFilters',
            'onPackageChange',
            'onSearchInput',
            'onDeprecatedToggleChange',
            'onItemClick',
            'onItemDblClick',
            'onKeyDown',
            'toggleShortcutHints',
            'createOverlay',
            'openCreateOverlay',
            'openCreateFromDataOverlay',
            'closeCreateOverlay',
            'createBrickFromOverlay',
            'handleCreatedBrick',
            'importBrickFromOverlay',
            'onOverlayKeyDown'
        ],

        options: {
            maxWidth: 1200,
            maxHeight: 800,
            content: '',
            autoclose: false,
            backgroundClosable: false,

            project: '',
            lang: '',

            // Optional async callback that runs after a brick was created.
            // This ist NOT a QUI event!
            // Use this for custom post-create flows that must finish before
            // the AddBrickWindow closes. This is not a standard QUI event.
            onBrickCreated: false
        },

        /**
         * Constructor.
         * Initializes state, cached DOM refs and event bindings.
         */
        initialize: function (options) {
            this.parent(options);

            this.brickList = [];
            this.brickListViewData = [];

            this.$Content = null;
            this.$Container = null;
            this.$PackageFilter = null;
            this.$SearchInput = null;
            this.$BrickList = null;
            this.$DeprecatedToggle = null;
            this.$SelectedPackage = null;
            this.$BrickCount = null;
            this.$ShortcutHints = null;
            this.$ShortcutToggle = null;
            this.$DetailTitle = null;
            this.$DetailPackage = null;
            this.$DetailHero = null;
            this.$DetailControl = null;
            this.$DetailDescription = null;
            this.$DetailGallery = null;

            this.$CreateOverlay = null;
            this.$CreateTitleInput = null;
            this.$CreateCancelBtn = null;
            this.$CreateSubmitBtn = null;

            this.$ImportTextarea = null;
            this.$ImportCancelBtn = null;
            this.$ImportSubmitBtn = null;
            this.$ImportAdjustProject = null;
            this.$ImportAdjustLang = null;

            this.$createInProgress = false;

            this.$ActiveOverlayClose = null;
            this.$ActiveOverlay = null;
            this.$OverlayPreviousActiveElement = null;

            this.$KeyboardBound = false;
            this.$NativeKeyDownHandler = this.onKeyDown;

            this.addEvents({
                onOpen: this.$onOpen
            });
        },

        onKeyDown: function (event) {
            if (!this.$Container || !this.$BrickList) {
                return;
            }

            if (this.$ActiveOverlay) {
                return;
            }

            if (!document.body.contains(this.$Container)) {
                return;
            }

            const nativeEvent = event.event || event;
            const key = String(event.key || nativeEvent.key || '').toLowerCase();
            const isImportShortcut = (event.metaKey || event.ctrlKey)
                && event.shiftKey
                && !event.altKey
                && (
                    key === '.'
                    || key === ':'
                    || nativeEvent.code === 'Period'
                    || nativeEvent.which === 190
                    || nativeEvent.keyCode === 190
                );

            if (isImportShortcut) {
                event.preventDefault();
                event.stopPropagation();
                this.openCreateFromDataOverlay();
                return;
            }

            if (key !== 'up' && key !== 'arrowup' && key !== 'down' && key !== 'arrowdown' && key !== 'enter') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const visible = this.$BrickList.getElements('[data-name="item"]').filter((Item) => {
                return Item.getStyle('display') !== 'none';
            });

            if (!visible.length) {
                return;
            }

            let Current = this.$BrickList.getElement('[data-name="item"][aria-current="true"]');

            if (!Current || Current.getStyle('display') === 'none') {
                Current = visible[0];
            }

            if (key === 'enter') {
                this.openCreateOverlay();
                return;
            }

            const delta = key === 'down' || key === 'arrowdown' ? 1 : -1;
            let index = visible.indexOf(Current);

            if (index === -1) {
                index = 0;
            }

            index = Math.max(0, Math.min(visible.length - 1, index + delta));
            const Next = visible[index];

            if (!Next || Next === Current) {
                return;
            }

            this.$BrickList.getElements('[data-name="item"][aria-current="true"]').each((Elm) => {
                Elm.removeAttribute('aria-current');
            });

            Next.setAttribute('aria-current', 'true');
            this.renderDetails(Next.getAttribute('data-control'));

            if (typeof Next.scrollIntoView === 'function') {
                Next.scrollIntoView({block: 'nearest'});
            }
        },

        getCurrentBrickInfo: function () {
            if (!this.$BrickList) {
                return {
                    control: '',
                    title: ''
                };
            }

            const Current = this.$BrickList.getElement('[data-name="item"][aria-current="true"]');
            const control = Current ? (Current.getAttribute('data-control') || '') : '';

            if (!control || !this.brickListViewData || !this.brickListViewData.length) {
                return {
                    control: control,
                    title: ''
                };
            }

            const data = this.brickListViewData.filter((brick) => brick.control === control)[0];

            return {
                control: control,
                title: data ? (data.displayTitle || '') : ''
            };
        },

        openCreateFromDataOverlay: function () {
            if (!this.$Container) {
                return;
            }

            if (this.$CreateOverlay) {
                return;
            }

            const shortcutModifierLabel = navigator.platform.toUpperCase().indexOf('MAC') >= 0
                ? 'Cmd'
                : 'Ctrl';
            const importShortcutLabel = shortcutModifierLabel + '+Enter';

            this.createOverlay({
                title: QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.title'),
                description: QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.desc'),
                dialogClass: 'qui-addBrick-dialog qui-addBrick-dialog--import',
                backdropClosable: false,
                build: (Dialog) => {
                    const Desc = Dialog.getElement('.qui-addBrick-dialog__desc');
                    const DescText = QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.desc');

                    const PasteBtn = new Element('button', {
                        type: 'button',
                        'class': 'btn btn-light qui-addBrick-import__pasteBtn',
                        html: '<span class="fa fa-clipboard"></span> ' +
                            QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.btn.paste')
                    });

                    if (Desc) {
                        Desc.set('html', '');
                        new Element('span', {
                            'class': 'qui-addBrick-import__descText',
                            text: DescText
                        }).inject(Desc);
                        PasteBtn.inject(Desc);
                    }

                    PasteBtn.addEvent('click', (event) => {
                        event.preventDefault();

                        if (!navigator.clipboard || !navigator.clipboard.readText) {
                            QUI.getMessageHandler(function (MH) {
                                MH.addError(QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.pasteNotAvailable'));
                            });
                            return;
                        }

                        navigator.clipboard.readText().then((text) => {
                            if (!this.$ImportTextarea) {
                                return;
                            }

                            this.$ImportTextarea.value = text || '';
                            this.$ImportTextarea.focus();
                        }).catch(() => {
                            QUI.getMessageHandler(function (MH) {
                                MH.addError(QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.pasteError'));
                            });
                        });
                    });

                    const Textarea = new Element('textarea', {
                        'data-name': 'import-data',
                        placeholder: '{\n' +
                            '  "attributes": {\n' +
                            '    "title": "My brick",\n' +
                            '    "type": "\\\\QUI\\\\Bricks\\\\Controls\\\\TextAndImage",\n' +
                            '    "content": "<h2 class=\\\"fw-bold\\\">Sem libero volutpat nibh</h2><p>…</p>"\n' +
                            '  }\n' +
                            '}',
                        rows: 10
                    }).inject(Dialog);

                    Textarea.addEvent('keydown', (event) => {
                        const nativeEvent = event.event || event;
                        const key = String(event.key || nativeEvent.key || '').toLowerCase();
                        const isSubmitShortcut = (event.metaKey || nativeEvent.metaKey || event.ctrlKey || nativeEvent.ctrlKey)
                            && (key === 'enter' || nativeEvent.code === 'Enter' || nativeEvent.keyCode === 13);

                        if (!isSubmitShortcut) {
                            return;
                        }

                        event.preventDefault();
                        this.importBrickFromOverlay();
                    });

                    const Options = new Element('div', {
                        'class': 'qui-addBrick-import__options'
                    }).inject(Dialog);

                    const LabelProject = new Element('label', {
                        'class': 'qui-addBrick-import__option'
                    }).inject(Options);

                    new Element('input', {
                        type: 'checkbox',
                        checked: true,
                        'data-name': 'import-adjust-project'
                    }).inject(LabelProject);

                    new Element('span', {
                        'class': 'label-text',
                        html: QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.info.project')
                    }).inject(LabelProject);

                    const LabelLang = new Element('label', {
                        'class': 'qui-addBrick-import__option'
                    }).inject(Options);

                    new Element('input', {
                        type: 'checkbox',
                        checked: true,
                        'data-name': 'import-adjust-lang'
                    }).inject(LabelLang);

                    new Element('span', {
                        'class': 'label-text',
                        html: QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.info.lang')
                    }).inject(LabelLang);

                    new Element('div', {
                        'class': 'qui-addBrick-import__attention content-message-attention',
                        html: QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.info.general'),
                        styles: {
                            float: 'none'
                        }
                    }).inject(Dialog);

                    const Actions = new Element('div', {
                        'class': 'qui-addBrick-dialog__actions'
                    }).inject(Dialog);

                    const CancelBtn = new Element('button', {
                        type: 'button',
                        'data-name': 'import-cancel',
                        'class': 'btn btn-light',
                        text: QUILocale.get(lg, 'addBrickWindow.overlay.btn.cancel')
                    }).inject(Actions);

                    const ImportBtn = new Element('button', {
                        type: 'button',
                        'data-name': 'import-submit',
                        'class': 'btn btn-success',
                        title: importShortcutLabel,
                        'aria-label': QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.btn.import')
                            + ' (' + importShortcutLabel + ')',
                        html: '<span class="fa fa-code"></span> ' +
                            QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.btn.import')
                            + ' <div><kbd style="font-size: 0.8em; opacity: 0.7;">(' + importShortcutLabel + ')</kbd></div>'
                    }).inject(Actions);

                    CancelBtn.addEvent('click', (event) => {
                        event.preventDefault();

                        if (this.$createInProgress) {
                            return;
                        }

                        if (this.$ActiveOverlayClose) {
                            this.$ActiveOverlayClose();
                        }
                    });

                    ImportBtn.addEvent('click', (event) => {
                        event.preventDefault();
                        this.importBrickFromOverlay();
                    });

                    return {
                        focus: Textarea
                    };
                }
            });
        },

        /**
         * Render the window HTML using the Mustache template.
         *
         * @param {Array} brickList - View model list used by the template.
         * @param {Array} packageList - Package options for the filter select.
         * @returns {String}
         */
        getHtml: function (brickList, packageList) {
            const shortcutModifierLabel = navigator.platform.toUpperCase().indexOf('MAC') >= 0
                ? 'Cmd'
                : 'Ctrl';

            return Mustache.render(template, {
                brickList: brickList,
                packageList: packageList,
                asideTitle: QUILocale.get(lg, 'addBrickWindow.aside.title'),
                asideDesc: QUILocale.get(lg, 'addBrickWindow.aside.desc'),
                asideBtnImportTitle: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.btn.import.title'),
                asideInputPlaceholder: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.input.placeholder'),
                asideSelectTitle: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.select.title'),
                asideSelectOptionAll: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.select.option.all'),
                asideKeyboardNavigationDescription: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.keyboardNavigationDescription'),
                asideKeyboardCreateDescription: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.keyboardCreateDescription'),
                asideKeyboardImportText: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.keyboardImportText'),
                shortcutToggleLabel: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.shortcuts.label'),
                shortcutToggleShowTitle: QUILocale.get(lg, 'addBrickWindow.aside.toolbar.shortcuts.show'),
                shortcutModifierLabel: shortcutModifierLabel,
                asideFooterToggleDeprecated: QUILocale.get(lg, 'addBrickWindow.aside.footer.toggle.deprecated.show'),
                deprecatedText: QUILocale.get(lg, 'addBrickWindow.deprecated.badge'),
                recommendedText: QUILocale.get(lg, 'addBrickWindow.recommendedText.badge'),
                detailsBtnAdd: QUILocale.get(lg, 'addBrickWindow.details.btn.add'),
                detailsSectionInfo: QUILocale.get(lg, 'addBrickWindow.details.section.info'),
                detailsSectionDesc: QUILocale.get(lg, 'addBrickWindow.details.section.desc'),
                detailsSectionGallery: QUILocale.get(lg, 'addBrickWindow.details.section.gallery'),
            });
        },

        /**
         * Cache frequently used DOM elements from the window content.
         * Must be called after rendering and after overlay open/close.
         */
        cacheDom: function () {
            this.$Content = this.getContent();

            if (!this.$Content) {
                return;
            }

            this.$Container = this.$Content.getElement('.qui-addBrick-container');
            this.$PackageFilter = this.$Content.getElement('[data-name="package-filter"]');
            this.$SearchInput = this.$Content.getElement('[data-name="search-input"]');
            this.$BrickList = this.$Content.getElement('[data-name="brickList"]');
            this.$DeprecatedToggle = this.$Content.getElement('[data-name="toggle-deprecated"]');
            this.$SelectedPackage = this.$Content.getElement('[data-name="selected-package"]');
            this.$BrickCount = this.$Content.getElement('[data-name="brick-count"]');
            this.$ShortcutHints = this.$Content.getElement('[data-name="shortcut-hints"]');
            this.$ShortcutToggle = this.$Content.getElement('[data-name="toggle-shortcuts"]');
            this.$DetailTitle = this.$Content.getElement('[data-name="detail-title"]');
            this.$DetailPackage = this.$Content.getElement('[data-name="detail-package"]');
            this.$DetailHero = this.$Content.getElement('[data-name="detail-hero"]');
            this.$DetailControl = this.$Content.getElement('[data-name="detail-control"]');
            this.$DetailDescription = this.$Content.getElement('[data-name="detail-description"]');
            this.$DetailGallery = this.$Content.getElement('[data-name="detail-gallery"]');

            this.$CreateOverlay = this.$Content.getElement('.qui-addBrick-overlay');
            this.$CreateTitleInput = this.$Content.getElement('[data-name="create-title"]');
            this.$CreateCancelBtn = this.$Content.getElement('[data-name="create-cancel"]');
            this.$CreateSubmitBtn = this.$Content.getElement('[data-name="create-submit"]');

            this.$ImportTextarea = this.$Content.getElement('[data-name="import-data"]');
            this.$ImportCancelBtn = this.$Content.getElement('[data-name="import-cancel"]');
            this.$ImportSubmitBtn = this.$Content.getElement('[data-name="import-submit"]');
            this.$ImportAdjustProject = this.$Content.getElement('[data-name="import-adjust-project"]');
            this.$ImportAdjustLang = this.$Content.getElement('[data-name="import-adjust-lang"]');
        },

        isShortcutHintsExpanded: function () {
            try {
                const value = window.localStorage.getItem(SHORTCUT_HINTS_STORAGE_KEY);

                if (value === null) {
                    return false;
                }

                return value === '1';
            } catch (error) {
                return false;
            }
        },

        setShortcutHintsExpanded: function (expanded) {
            try {
                window.localStorage.setItem(SHORTCUT_HINTS_STORAGE_KEY, expanded ? '1' : '0');
            } catch (error) {
                // ignore storage access errors
            }
        },

        syncShortcutHintsState: function () {
            if (!this.$ShortcutHints || !this.$ShortcutToggle) {
                return;
            }

            const expanded = this.isShortcutHintsExpanded();
            const label = expanded
                ? QUILocale.get(lg, 'addBrickWindow.aside.toolbar.shortcuts.hide')
                : QUILocale.get(lg, 'addBrickWindow.aside.toolbar.shortcuts.show');
            const Icon = this.$ShortcutToggle.getElement('.fa');

            this.$ShortcutHints.hidden = !expanded;
            this.$ShortcutToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            this.$ShortcutToggle.set('title', label);
            this.$ShortcutToggle.set('aria-label', label);

            if (Icon) {
                Icon.removeClass('fa-keyboard-o');
                Icon.removeClass('fa-angle-down');
                Icon.removeClass('fa-angle-up');
                Icon.addClass(expanded ? 'fa-angle-up' : 'fa-angle-down');
            }
        },

        toggleShortcutHints: function (event) {
            if (event) {
                event.preventDefault();
            }

            const expanded = !this.isShortcutHintsExpanded();

            this.setShortcutHintsExpanded(expanded);
            this.syncShortcutHintsState();
        },

        /**
         * Create a reusable modal overlay on top of the window.
         * Handles focus management (focus trap), ESC close, and background lock.
         *
         * @param {Object} options
         * @returns {{overlay: Element, dialog: Element, close: Function}|null}
         */
        createOverlay: function (options) {
            if (!this.$Container) {
                return null;
            }

            const opts = options || {};

            if (this.$ActiveOverlayClose) {
                return null;
            }

            this.$OverlayPreviousActiveElement = document.activeElement || null;

            const Overlay = new Element('div', {
                'class': opts.overlayClass || 'qui-addBrick-overlay'
            });

            const Dialog = new Element('div', {
                'class': opts.dialogClass || 'qui-addBrick-dialog'
            }).inject(Overlay);

            if (opts.title) {
                new Element('div', {
                    'class': 'qui-addBrick-dialog__title',
                    text: opts.title
                }).inject(Dialog);
            }

            if (opts.description) {
                new Element('div', {
                    'class': 'qui-addBrick-dialog__desc',
                    html: opts.description
                }).inject(Dialog);
            }

            let FocusEl = null;

            if (typeof opts.build === 'function') {
                const result = opts.build(Dialog, Overlay);

                if (result && result.focus) {
                    FocusEl = result.focus;
                }
            }

            const close = () => {
                if (Overlay && Overlay.destroy) {
                    Overlay.destroy();
                }

                this.$ActiveOverlay = null;

                if (this.$ActiveOverlayClose === close) {
                    this.$ActiveOverlayClose = null;
                }

                if (this.$Container) {
                    this.$Container.removeClass('qui-addBrick-container--overlay-open');
                }

                const Aside = this.$Content ? this.$Content.getElement('[data-name="aside"]') : null;
                const Main = this.$Content ? this.$Content.getElement('[data-name="main"]') : null;

                if (Aside) {
                    Aside.removeProperty('aria-hidden');
                }

                if (Main) {
                    Main.removeProperty('aria-hidden');
                }

                document.removeEvent('keydown', this.onOverlayKeyDown);
                this.cacheDom();

                if (typeof opts.onClose === 'function') {
                    opts.onClose();
                }

                const RestoreEl = this.$OverlayPreviousActiveElement;
                this.$OverlayPreviousActiveElement = null;

                if (RestoreEl && RestoreEl.focus) {
                    (function () {
                        RestoreEl.focus();
                    }).delay(0);
                }
            };

            this.$ActiveOverlayClose = close;
            this.$ActiveOverlay = Overlay;

            if (this.$Container) {
                this.$Container.addClass('qui-addBrick-container--overlay-open');
            }

            const Aside = this.$Content ? this.$Content.getElement('[data-name="aside"]') : null;
            const Main = this.$Content ? this.$Content.getElement('[data-name="main"]') : null;

            if (Aside) {
                Aside.setAttribute('aria-hidden', 'true');
            }

            if (Main) {
                Main.setAttribute('aria-hidden', 'true');
            }

            if (opts.backdropClosable) {
                Overlay.addEvent('click', (event) => {
                    if (event.target === Overlay) {
                        close();
                    }
                });
            }

            Overlay.inject(this.$Container);
            this.cacheDom();

            document.addEvent('keydown', this.onOverlayKeyDown);

            if (FocusEl && FocusEl.focus) {
                (function () {
                    FocusEl.focus();
                }).delay(0);
            }

            return {
                overlay: Overlay,
                dialog: Dialog,
                close: close
            };
        },

        /**
         * Open the "create brick" overlay.
         * Uses `createOverlay` and wires the create/cancel buttons.
         */
        openCreateOverlay: function () {
            if (!this.$Container) {
                return;
            }

            if (this.$CreateOverlay) {
                return;
            }

            const Brick = this.getCurrentBrickInfo();
            const descTitle = QUILocale.get(lg, 'addBrickWindow.overlay.create.desc.title');
            const descLabelName = QUILocale.get(lg, 'addBrickWindow.overlay.create.desc.label.name');
            const descLabelType = QUILocale.get(lg, 'addBrickWindow.overlay.create.desc.label.type');
            const descHint = QUILocale.get(lg, 'addBrickWindow.overlay.create.desc');
            let description = `
            <p>${descTitle}</p>
            <div class="brick-info">
            <div class="brick-info__row"><span>${descLabelName}</span> <strong>${Brick.title}</strong></div>
            <div class="brick-info__row"><span>${descLabelType}</span> <div><span class="badge badge-success-light">${Brick.control}</span></div></div>
            </div>
            <p>${descHint}</p>   
            `;

            this.createOverlay({
                title: QUILocale.get(lg, 'addBrickWindow.overlay.create.title'),
                description: description,
                backdropClosable: false,
                build: (Dialog) => {
                    const TitleInput = new Element('input', {
                        type: 'text',
                        'data-name': 'create-title',
                        placeholder: QUILocale.get(lg, 'addBrickWindow.overlay.create.input.placeholder')
                    }).inject(Dialog);

                    TitleInput.addEvent('keydown', (event) => {
                        if (event.key !== 'enter') {
                            return;
                        }

                        event.preventDefault();
                        this.createBrickFromOverlay();
                    });

                    const Actions = new Element('div', {
                        'class': 'qui-addBrick-dialog__actions'
                    }).inject(Dialog);

                    const CancelBtn = new Element('button', {
                        type: 'button',
                        'data-name': 'create-cancel',
                        'class': 'btn btn-light',
                        text: QUILocale.get(lg, 'addBrickWindow.overlay.btn.cancel')
                    }).inject(Actions);

                    const CreateBtn = new Element('button', {
                        type: 'button',
                        'data-name': 'create-submit',
                        'class': 'btn btn-success',
                        html: '<span class="fa fa-plus"></span> '
                            + QUILocale.get(lg, 'addBrickWindow.overlay.create.btn.create')
                    }).inject(Actions);

                    CancelBtn.addEvent('click', (event) => {
                        event.preventDefault();
                        this.closeCreateOverlay();
                    });

                    CreateBtn.addEvent('click', (event) => {
                        event.preventDefault();
                        this.createBrickFromOverlay();
                    });

                    return {
                        focus: TitleInput
                    };
                }
            });
        },

        /**
         * Close the create overlay (if open).
         * Restores focus to the previously active element.
         */
        closeCreateOverlay: function () {
            if (this.$createInProgress) {
                return;
            }

            if (this.$ActiveOverlayClose) {
                this.$ActiveOverlayClose();
                return;
            }

            if (this.$CreateOverlay) {
                this.$CreateOverlay.destroy();
            }

            document.removeEvent('keydown', this.onOverlayKeyDown);
            this.cacheDom();

            if (this.$SearchInput) {
                (function () {
                    this.$SearchInput.focus();
                }).delay(0, this);
            }
        },

        /**
         * Global overlay keyboard handler.
         * Implements focus trap (Tab/Shift+Tab) and ESC-to-close.
         */
        onOverlayKeyDown: function (event) {
            if (this.$ActiveOverlay && event.key === 'tab') {
                const focusable = this.$ActiveOverlay.getElements(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ).filter((el) => {
                    if (!el) {
                        return false;
                    }

                    if (el.getStyle('display') === 'none') {
                        return false;
                    }

                    if (el.getStyle('visibility') === 'hidden') {
                        return false;
                    }

                    return true;
                });

                if (!focusable.length) {
                    event.preventDefault();
                    return;
                }

                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const active = document.activeElement;

                if (event.shift) {
                    if (active === first || !this.$ActiveOverlay.contains(active)) {
                        event.preventDefault();
                        last.focus();
                        return;
                    }
                } else {
                    if (active === last) {
                        event.preventDefault();
                        first.focus();
                        return;
                    }
                }
            }

            if (event.key === 'esc' || event.key === 'escape') {
                event.preventDefault();

                if (this.$createInProgress) {
                    return;
                }

                if (this.$ActiveOverlayClose) {
                    this.$ActiveOverlayClose();
                    return;
                }

                this.closeCreateOverlay();
            }
        },

        /**
         * Handler for the overlay "create" action.
         * Validates input and collects currently selected brick control.
         */
        createBrickFromOverlay: function () {
            if (this.$createInProgress) {
                return;
            }

            if (!this.$CreateTitleInput) {
                return;
            }

            this.$createInProgress = true;

            if (this.$CreateCancelBtn) {
                this.$CreateCancelBtn.setProperty('disabled', true);
            }

            if (this.$CreateSubmitBtn) {
                this.$CreateSubmitBtn.setProperty('disabled', true);
            }

            this.Loader.show();

            const title = (this.$CreateTitleInput.value || '').trim();

            if (title === '') {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(
                        QUILocale.get(lg, 'addBrickWindow.overlay.create.error.missingTitle'),
                        this.$CreateTitleInput
                    );
                }.bind(this));

                this.$CreateTitleInput.focus();

                this.$createInProgress = false;

                if (this.$CreateCancelBtn) {
                    this.$CreateCancelBtn.removeProperty('disabled');
                }

                if (this.$CreateSubmitBtn) {
                    this.$CreateSubmitBtn.removeProperty('disabled');
                }

                this.Loader.hide();
                return;
            }

            const Current = this.$BrickList ? this.$BrickList.getElement('[data-name="item"][aria-current="true"]') : null;
            const control = Current ? Current.getAttribute('data-control') : null;

            const project = this.options.project;
            const lang = this.options.lang;

            if (!project || !lang) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(QUILocale.get(lg, 'addBrickWindow.overlay.create.error.noProject'));
                });

                this.$createInProgress = false;

                if (this.$CreateCancelBtn) {
                    this.$CreateCancelBtn.removeProperty('disabled');
                }

                if (this.$CreateSubmitBtn) {
                    this.$CreateSubmitBtn.removeProperty('disabled');
                }

                this.Loader.hide();
                return;
            }

            if (!control) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(QUILocale.get(lg, 'addBrickWindow.overlay.create.error.brickType'));
                });

                this.$createInProgress = false;

                if (this.$CreateCancelBtn) {
                    this.$CreateCancelBtn.removeProperty('disabled');
                }

                if (this.$CreateSubmitBtn) {
                    this.$CreateSubmitBtn.removeProperty('disabled');
                }

                this.Loader.hide();
                return;
            }

            const data = {
                title: title,
                type: control
            };
            const hasCreateCallback = typeof this.getAttribute('onBrickCreated') === 'function';

            Bricks.createBrick(this.options.project, this.options.lang, data).then((brickId) => {
                if (!hasCreateCallback) {
                    this.Loader.hide();
                    this.$createInProgress = false;
                    this.closeCreateOverlay();
                }

                return this.handleCreatedBrick(brickId, {
                    title: title,
                    type: control
                });
            }).then(() => {
                this.$createInProgress = false;

                if (hasCreateCallback) {
                    this.Loader.hide();
                }
            }).catch((e) => {
                this.$createInProgress = false;

                if (this.$CreateCancelBtn) {
                    this.$CreateCancelBtn.removeProperty('disabled');
                }

                if (this.$CreateSubmitBtn) {
                    this.$CreateSubmitBtn.removeProperty('disabled');
                }

                if (e && typeof e.getMessage === 'function') {
                    QUI.getMessageHandler(function (MH) {
                        MH.addError(e.getMessage(), this.$CreateTitleInput);
                    }.bind(this));

                    this.$CreateTitleInput.focus();
                }

                this.Loader.hide();
            });
        },

        importBrickFromOverlay: function () {
            if (this.$createInProgress) {
                return;
            }

            if (!this.$ImportTextarea) {
                return;
            }

            const project = this.options.project;
            const lang = this.options.lang;

            if (!project || !lang) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(QUILocale.get(lg, 'addBrickWindow.overlay.create.error.noProject'));
                });

                return;
            }

            const raw = (this.$ImportTextarea.value || '').trim();

            if (!raw) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(
                        QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.empty'),
                        this.$ImportTextarea
                    );
                }.bind(this));
                this.$ImportTextarea.focus();
                return;
            }

            let convertedData;

            try {
                convertedData = JSON.parse(raw);
            } catch (e) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(
                        QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.invalidJson'),
                        this.$ImportTextarea
                    );
                }.bind(this));
                this.$ImportTextarea.focus();
                return;
            }

            if (!convertedData || typeof convertedData !== 'object') {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(
                        QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.invalidObject'),
                        this.$ImportTextarea
                    );
                }.bind(this));
                this.$ImportTextarea.focus();
                return;
            }

            if (!('attributes' in convertedData) || !convertedData.attributes || typeof convertedData.attributes !== 'object') {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(
                        QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.missingAttributes'),
                        this.$ImportTextarea
                    );
                }.bind(this));
                this.$ImportTextarea.focus();
                return;
            }

            delete convertedData.attributes.id;

            const brickTitle = (convertedData.attributes.title || '').trim();
            const brickType = (convertedData.attributes.type || '').trim();

            if (!brickTitle || !brickType) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(QUILocale.get(lg, 'exception.brick.createFromData.brick.type.not.found'));
                }.bind(this));
                this.$ImportTextarea.focus();
                return;
            }

            this.$createInProgress = true;

            if (this.$ImportCancelBtn) {
                this.$ImportCancelBtn.setProperty('disabled', true);
            }

            if (this.$ImportSubmitBtn) {
                this.$ImportSubmitBtn.setProperty('disabled', true);
            }

            this.Loader.show();

            let controlTypeExist = false;
            const hasCreateCallback = typeof this.getAttribute('onBrickCreated') === 'function';
            this.brickList.each((brick) => {
                if (brick && brick.control === brickType) {
                    controlTypeExist = true;
                }
            });

            if (!controlTypeExist) {
                QUI.getMessageHandler(function (MH) {
                    MH.addError(
                        QUILocale.get(lg, 'exception.brick.createFromData.brick.type.not.found.in.quiqqer', {
                            brickType: brickType
                        })
                    );
                });

                this.$createInProgress = false;
                this.Loader.hide();

                if (this.$ImportCancelBtn) {
                    this.$ImportCancelBtn.removeProperty('disabled');
                }

                if (this.$ImportSubmitBtn) {
                    this.$ImportSubmitBtn.removeProperty('disabled');
                }

                if (this.$ImportTextarea) {
                    this.$ImportTextarea.focus();
                }

                return;
            }

            Bricks.titleExists(brickTitle, project, lang).then((titleExists) => {
                const hasDuplicateTitle = String(titleExists) === '1';
                const createTitle = hasDuplicateTitle ? brickTitle + ' (' + Date.now() + ')' : brickTitle;
                const data = {
                    title: createTitle,
                    type: brickType
                };

                return Bricks.createBrick(project, lang, data).then((brickId) => {
                    if (hasDuplicateTitle) {
                        convertedData.attributes.title = brickTitle + ' (' + brickId + ')';
                    }

                    const adjustProjectName = this.$ImportAdjustProject ? this.$ImportAdjustProject.checked : true;
                    const adjustProjectLang = this.$ImportAdjustLang ? this.$ImportAdjustLang.checked : true;

                    if (adjustProjectName && convertedData.attributes.project !== project) {
                        convertedData.attributes.project = project;
                    }

                    if (adjustProjectLang && convertedData.attributes.lang !== lang) {
                        convertedData.attributes.lang = lang;
                    }

                    return Bricks.saveBrick(brickId, convertedData).then(() => brickId);
                });
            }).then((brickId) => {
                QUI.getMessageHandler().then(function (MH) {
                    MH.addSuccess(QUILocale.get(lg, 'message.brick.save.success'));
                });

                if (!hasCreateCallback) {
                    this.Loader.hide();
                    this.$createInProgress = false;

                    if (this.$ActiveOverlayClose) {
                        this.$ActiveOverlayClose();
                    }
                }

                return this.handleCreatedBrick(brickId, convertedData);
            }).then(() => {
                this.$createInProgress = false;

                if (hasCreateCallback) {
                    this.Loader.hide();
                }
            }).catch((e) => {
                QUI.getMessageHandler().then(function (MH) {
                    if (e && typeof e.getMessage === 'function') {
                        MH.addError(e.getMessage());
                        return;
                    }

                    if (e && e.message) {
                        MH.addError(e.message);
                        return;
                    }

                    MH.addError(QUILocale.get(lg, 'addBrickWindow.overlay.createFromData.error.failed'));
                });

                this.$createInProgress = false;

                if (this.$ImportCancelBtn) {
                    this.$ImportCancelBtn.removeProperty('disabled');
                }

                if (this.$ImportSubmitBtn) {
                    this.$ImportSubmitBtn.removeProperty('disabled');
                }

                this.Loader.hide();
            });
        },

        /**
         * Convert potentially HTML-formatted strings to plain text.
         * Used for building the search index.
         *
         * @param {*} value
         * @returns {String}
         */
        toPlainText: function (value) {
            if (!value) {
                return '';
            }

            const text = String(value);

            if (text.indexOf('<') === -1) {
                return text;
            }

            return new Element('div', {
                html: text
            }).get('text') || '';
        },

        toPreviewText: function (value, maxLength) {
            const plain = this.toPlainText(value);
            const normalized = plain
                .replace(/\s+/g, ' ')
                .trim();

            const limit = (typeof maxLength === 'number' && maxLength > 0) ? maxLength : 140;

            if (normalized.length <= limit) {
                return normalized;
            }

            return normalized.slice(0, Math.max(0, limit - 1)).trimEnd() + '…';
        },

        /**
         * Render the details panel for the currently selected brick.
         *
         * @param {String} control - Brick control identifier.
         */
        renderDetails: function (control) {
            const data = this.brickListViewData.filter((brick) => brick.control === control)[0];

            if (!data) {
                return;
            }

            if (this.$DetailTitle) {
                this.$DetailTitle.set('html', data.displayTitle);
            }

            if (this.$DetailPackage) {
                this.$DetailPackage.set('html', data.displayPackage);
            }

            if (this.$DetailHero) {
                this.$DetailHero.set('src', data.mockup);
                this.$DetailHero.set('alt', data.displayTitle);
            }

            if (this.$DetailControl) {
                const normalized = String(data.control || '').replace(/\\/g, '\\');
                this.$DetailControl.set('text', normalized);
            }

            // deprecated badge
            const existingDeprecatedBadge = this.$Content
                ? this.$Content.getElement('[data-name="detail-deprecated"]')
                : null;

            if (existingDeprecatedBadge) {
                existingDeprecatedBadge.destroy();
            }

            if (data.deprecated && this.$Content) {
                const Container = this.$Content.getElement('[data-name="details-section-info"]');

                if (Container) {
                    new Element('span', {
                        'class': 'badge badge-danger badge-sm',
                        'data-name': 'detail-deprecated',
                        html: QUILocale.get(lg, 'addBrickWindow.deprecated.badge')
                    }).inject(Container);
                }
            }

            // recommended badge
            const existingRecommendedBadge = this.$Content
                ? this.$Content.getElement('[data-name="detail-recommended"]')
                : null;

            if (existingRecommendedBadge) {
                existingRecommendedBadge.destroy();
            }

            if (data.recommended && this.$Content) {
                const Container = this.$Content.getElement('[data-name="details-section-info"]');

                if (Container) {
                    new Element('span', {
                        'class': 'badge badge-warning badge-sm',
                        'data-name': 'detail-recommended',
                        html: QUILocale.get(lg, 'addBrickWindow.recommendedText.badge')
                    }).inject(Container);
                }
            }

            if (this.$DetailDescription) {
                this.$DetailDescription.set('html', data.displayDescription);
            }

            if (this.$DetailGallery) {
                this.$DetailGallery.set('html', '');

                if (data.galleryMockups && data.galleryMockups.length) {
                    data.galleryMockups.each((mockup) => {
                        let src = mockup;

                        if (typeof mockup === 'object' && mockup && 'src' in mockup) {
                            src = mockup.src;
                        }

                        if (!src) {
                            return;
                        }

                        new Element('img', {
                            src: src,
                            alt: data.displayTitle
                        }).inject(this.$DetailGallery);
                    });
                }
            }
        },

        /**
         * Apply package + search filters to the visible list.
         * Updates counter and selection (ensures a visible item is selected).
         */
        applyFilters: function () {
            if (!this.$BrickList) {
                return;
            }

            const packageValue = this.$PackageFilter ? this.$PackageFilter.value : 'all';
            const query = this.$SearchInput ? (this.$SearchInput.value || '').trim().toLowerCase() : '';

            this.$BrickList.getElements('[data-name="item"]').each((Item) => {
                const itemPackage = Item.getAttribute('data-package') || '';
                const itemSearch = Item.getAttribute('data-search') || '';

                const matchPackage = packageValue === 'all' || itemPackage === packageValue;
                const matchSearch = query === '' || itemSearch.indexOf(query) !== -1;

                Item.setStyle('display', (matchPackage && matchSearch) ? '' : 'none');
            });

            if (this.$BrickCount) {
                const visibleCount = this.$BrickList.getElements('[data-name="item"]').filter((Item) => {
                    return Item.getStyle('display') !== 'none';
                }).length;

                let Empty = this.$BrickList.getElement('[data-name="emptyState"]');

                if (!Empty) {
                    Empty = new Element('div', {
                        'class': 'qui-addBrick-empty',
                        'data-name': 'emptyState',
                        html: '<div class="inner"><span class="fa fa-search"></span> ' +
                            QUILocale.get(lg, 'addBrickWindow.aside.list.empty') + '</div>'
                    }).inject(this.$BrickList);
                }

                Empty.setStyle('display', visibleCount === 0 ? '' : 'none');

                const label = visibleCount === 1
                    ? QUILocale.get(lg, 'addBrickWindow.aside.toolbar.count.single')
                    : QUILocale.get(lg, 'addBrickWindow.aside.toolbar.count.multi');
                this.$BrickCount.set('html', '<strong>' + visibleCount + '</strong> ' + label);

                if (visibleCount === 0) {
                    this.$BrickList.getElements('[data-name="item"][aria-current="true"]').each((Elm) => {
                        Elm.removeAttribute('aria-current');
                    });

                    return;
                }
            }

            const Current = this.$BrickList.getElement('[data-name="item"][aria-current="true"]');

            if (Current && Current.getStyle('display') !== 'none') {
                return;
            }

            this.$BrickList.getElements('[data-name="item"][aria-current="true"]').each((Elm) => {
                Elm.removeAttribute('aria-current');
            });

            const FirstVisible = this.$BrickList.getElements('[data-name="item"]').filter((Item) => {
                return Item.getStyle('display') !== 'none';
            })[0];

            if (FirstVisible) {
                FirstVisible.setAttribute('aria-current', 'true');
                this.renderDetails(FirstVisible.getAttribute('data-control'));
            }
        },

        /**
         * Render the selected package badge (with a clear button).
         *
         * @param {String} pkg
         */
        renderSelectedPackageBadge: function (pkg) {
            if (!this.$SelectedPackage) {
                return;
            }

            this.$SelectedPackage.set('html', '');

            if (!pkg || pkg === 'all') {
                return;
            }

            const Badge = new Element('span', {
                'class': 'badge badge-success-light',
                html: pkg + ' '
            });

            const Close = new Element('span', {
                'class': 'fa fa-times'
            }).inject(Badge);

            Close.addEvent('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.$SelectedPackage.set('html', '');

                if (this.$PackageFilter) {
                    this.$PackageFilter.value = 'all';
                }

                this.applyFilters();
            });

            Badge.inject(this.$SelectedPackage);
        },

        /**
         * Package filter change handler.
         * Updates badge and re-applies filters.
         */
        onPackageChange: function () {
            if (!this.$PackageFilter) {
                return;
            }

            this.renderSelectedPackageBadge(this.$PackageFilter.value);
            this.applyFilters();
        },

        /**
         * Search input handler.
         * Re-applies filters on each input event.
         */
        onSearchInput: function () {
            this.applyFilters();
        },

        onDeprecatedToggleChange: function () {
            if (!this.$BrickList || !this.$DeprecatedToggle) {
                return;
            }

            const textShow = QUILocale.get(lg, 'addBrickWindow.aside.footer.toggle.deprecated.show');
            const textHide = QUILocale.get(lg, 'addBrickWindow.aside.footer.toggle.deprecated.hide');

            const Label = this.$DeprecatedToggle.getParent('label');

            if (Label) {
                const targetText = this.$DeprecatedToggle.checked ? textHide : textShow;
                const TextElm = Label.getElement('[data-name="toggle-deprecated-text"]');

                if (TextElm) {
                    TextElm.set('html', targetText);
                }
            }

            this.$BrickList.setAttribute('data-show-deprecated', this.$DeprecatedToggle.checked ? '1' : '0');
            this.applyFilters();
        },

        /**
         * List item click handler.
         * Updates `aria-current` and re-renders the details panel.
         */
        onItemClick: function (event) {
            if (!this.$BrickList) {
                return;
            }

            const Item = event.target.getParent('[data-name="item"]');

            if (!Item) {
                return;
            }

            this.$BrickList.getElements('[data-name="item"][aria-current="true"]').each((Elm) => {
                Elm.removeAttribute('aria-current');
            });

            Item.setAttribute('aria-current', 'true');
            this.renderDetails(Item.getAttribute('data-control'));
        },

        onItemDblClick: function (event) {
            this.onItemClick(event);
            this.openCreateOverlay();
        },

        /**
         * Window open hook.
         * Loads available bricks, builds view model, renders template and binds UI.
         */
        $onOpen: function () {
            Bricks.getAvailableBricks().then((brickList) => {
                this.brickList = brickList;

                const viewData = brickList.map((brick) => {
                    if (brick.control === 'content') {
                        const displayTitle = QUILocale.get(lg, 'addBrickWindow.details.brickTypeContent.title');
                        const displayDescription = QUILocale.get(lg, 'addBrickWindow.details.brickTypeContent.desc');
                        const displayDescriptionPreview = this.toPreviewText(displayDescription);
                        const displayPackage = 'quiqqer/bricks';
                        const mockup = '/packages/quiqqer/bricks/bin/images/mockup-placeholder.svg';
                        const thumbnail = mockup;
                        const mockups = [];
                        const galleryMockups = [];

                        const searchText = [
                            this.toPlainText(displayTitle),
                            this.toPlainText(displayDescription),
                            this.toPlainText(displayPackage),
                            this.toPlainText(brick.control)
                        ].join(' ').toLowerCase();

                        return {
                            control: brick.control,
                            displayTitle: displayTitle,
                            displayDescription: displayDescription,
                            displayDescriptionPreview: displayDescriptionPreview,
                            displayPackage: displayPackage,
                            mockup: mockup,
                            thumbnail: thumbnail,
                            mockups: mockups,
                            galleryMockups: galleryMockups,
                            search: searchText,
                            deprecated: 0,
                            recommended: 0
                        };
                    }

                    const getLocaleString = function (locale) {
                        if (!locale) {
                            return '';
                        }

                        if (Array.isArray(locale) && locale.length >= 2) {
                            return QUILocale.get(locale[0], locale[1]);
                        }

                        if (typeof locale === 'object' && 'group' in locale && 'var' in locale) {
                            return QUILocale.get(locale.group, locale.var);
                        }

                        return '';
                    };

                    const getLocaleGroup = function (locale) {
                        if (!locale) {
                            return '';
                        }

                        if (Array.isArray(locale) && locale.length >= 1) {
                            return locale[0] || '';
                        }

                        if (typeof locale === 'object' && 'group' in locale) {
                            return locale.group || '';
                        }

                        return '';
                    };

                    const title = getLocaleString(brick.title);
                    const description = getLocaleString(brick.description);
                    const displayDescriptionPreview = this.toPreviewText(description);

                    let pkg = getLocaleGroup(brick.title);

                    if (!pkg) {
                        pkg = getLocaleGroup(brick.description);
                    }

                    const searchText = [
                        this.toPlainText(title),
                        this.toPlainText(description),
                        this.toPlainText(pkg),
                        this.toPlainText(brick.control)
                    ].join(' ').toLowerCase();

                    const mockup = brick.mockup ? brick.mockup : '/packages/quiqqer/bricks/bin/images/mockup-placeholder.svg';
                    const thumbnail = brick.thumbnail ? brick.thumbnail : mockup;
                    const mockups = Array.isArray(brick.mockups) ? brick.mockups : [];
                    const galleryMockups = Array.isArray(brick.galleryMockups) ? brick.galleryMockups : mockups;
                    const deprecated = brick.deprecated ? 1 : 0;
                    let recommended = brick.recommended ? 1 : 0;

                    return {
                        control: brick.control,
                        displayTitle: title,
                        displayDescription: description,
                        displayDescriptionPreview: displayDescriptionPreview,
                        displayPackage: pkg,
                        mockup: mockup,
                        thumbnail: thumbnail,
                        mockups: mockups,
                        galleryMockups: galleryMockups,
                        search: searchText,
                        deprecated: deprecated,
                        recommended: recommended
                    };
                });

                this.brickListViewData = viewData;

                const packages = [...new Set(
                    viewData
                        .map((brick) => brick.displayPackage)
                        .filter((pkg) => !!pkg)
                )].sort();

                const packageList = packages.map((pkg) => {
                    return {
                        value: pkg,
                        label: pkg
                    };
                });

                this.cacheDom();

                if (!this.$Content) {
                    return;
                }

                this.$Content.set('html', this.getHtml(viewData, packageList));

                this.cacheDom();

                if (this.$PackageFilter) {
                    this.$PackageFilter.addEvent('change', this.onPackageChange);
                    this.renderSelectedPackageBadge(this.$PackageFilter.value);
                }

                if (this.$SearchInput) {
                    this.$SearchInput.addEvent('input', this.onSearchInput);
                }

                if (this.$DeprecatedToggle) {
                    this.$DeprecatedToggle.checked = this.$BrickList
                        ? this.$BrickList.getAttribute('data-show-deprecated') === '1'
                        : false;
                    this.$DeprecatedToggle.addEvent('change', this.onDeprecatedToggleChange);
                    this.onDeprecatedToggleChange();
                }

                if (this.$ShortcutToggle) {
                    this.$ShortcutToggle.removeEvent('click', this.toggleShortcutHints);
                    this.$ShortcutToggle.addEvent('click', this.toggleShortcutHints);
                    this.syncShortcutHintsState();
                }

                if (this.$BrickList) {
                    const Items = this.$BrickList.getElements('[data-name="item"]');

                    Items.addEvent('click', this.onItemClick);
                    Items.addEvent('dblclick', this.onItemDblClick);
                }

                if (this.$BrickList) {
                    this.$BrickList.getElements('[data-name="item"].qui-addBrick__item--kbd').each((Elm) => {
                        Elm.removeClass('qui-addBrick__item--kbd');
                    });
                }

                document.removeEventListener('keydown', this.$NativeKeyDownHandler, true);
                document.addEventListener('keydown', this.$NativeKeyDownHandler, true);
                this.$KeyboardBound = true;

                this.applyFilters();

                if (this.$SearchInput) {
                    (function () {
                        this.$SearchInput.focus();
                    }).delay(0, this);
                }

                const Next = this.$Content.getElement('[data-name="next"]');

                if (Next) {
                    Next.addEvent('click', (event) => {
                        event.preventDefault();
                        this.openCreateOverlay();
                    });
                }

                const ImportBtn = this.$Content.getElement('#importBtn');

                if (ImportBtn) {
                    ImportBtn.addEvent('click', (event) => {
                        event.preventDefault();
                        this.openCreateFromDataOverlay();
                    });
                }

                this.Loader.hide();
            });
        },

        /**
         * Override window open to show the loader immediately.
         */
        open: function () {
            this.parent();

            this.Loader.show();
        },

        close: function () {
            if (this.$KeyboardBound) {
                document.removeEventListener('keydown', this.$NativeKeyDownHandler, true);
                this.$KeyboardBound = false;
            }

            this.parent();
        },

        /**
         * Handles a newly created brick.
         * Falls back to the historical default behaviour when no callback is configured.
         *
         * @param {Number} brickId
         * @param {Object} [data]
         * @returns {Promise}
         */
        handleCreatedBrick: function (brickId, data) {
            const callback = this.getAttribute('onBrickCreated');
            const payload = {
                brickId: brickId,
                project: this.options.project,
                lang: this.options.lang,
                data: data || {}
            };

            if (typeof callback === 'function') {
                return Promise.resolve(callback(payload)).then(() => {
                    this.close();
                    return payload;
                });
            }

            this.editBrick(brickId);
            this.close();

            return Promise.resolve(payload);
        },

        /**
         * Opens the brick panel
         *
         * @param {Number} brickId
         */
        editBrick: function (brickId) {
            require([
                'package/quiqqer/bricks/bin/BrickEdit',
                'utils/Panels'
            ], function (BrickEdit, PanelUtils) {
                PanelUtils.openPanelInTasks(
                    new BrickEdit({
                        '#id': 'brick-edit-' + brickId,
                        id: brickId,
                        projectName: this.options.project,
                        projectLang: this.options.lang
                    })
                );
            }.bind(this));
        }
    });
});
