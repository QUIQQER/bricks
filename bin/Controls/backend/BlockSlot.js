define('package/quiqqer/bricks/bin/Controls/backend/BlockSlot', [

    'qui/QUI',
    'qui/controls/Control',
    'qui/controls/elements/ColorPicker',
    'qui/controls/windows/Confirm',
    'Locale',
    'utils/Controls',
    'package/quiqqer/bricks/bin/Controls/backend/BrickSelectWindow',

    'css!package/quiqqer/bricks/bin/Controls/backend/BlockSlot.css'

], function (QUI, QUIControl, QUIColorPicker, QUIConfirm, QUILocale, ControlUtils, BrickSelectWindow) {
    "use strict";

    const lg = 'quiqqer/bricks';
    const localePrefix = 'blockSlot.';
    const MODE_EDITOR = 'editor';
    const MODE_BRICK = 'brick';
    const MODE_IMAGE = 'image';
    const MODE_SUB_LAYOUT = 'subLayout';
    const INTERACTION_CONTENT = 'content';
    const INTERACTION_LAYOUT = 'layout';
    const DEFAULT_ALLOWED_MODES = [MODE_EDITOR, MODE_BRICK, MODE_IMAGE];
    const AVAILABLE_MODES = [MODE_EDITOR, MODE_BRICK, MODE_IMAGE, MODE_SUB_LAYOUT];
    const DEFAULT_SETTINGS_VISIBILITY = {
        contentPaddingPreset: true,
        verticalAlign: true,
        customMinHeight: true,
        customCssClasses: true,
        background: true,
        backgroundColor: true,
        textColor: true,
        link: true,
        image: true
    };
    const IMAGE_FIT_AUTO = 'auto';
    const IMAGE_FIT_COVER = 'cover';
    const IMAGE_FIT_CONTAIN = 'contain';
    const BACKGROUND_POSITION_LEFT_TOP = 'left top';
    const BACKGROUND_POSITION_TOP = 'center top';
    const BACKGROUND_POSITION_RIGHT_TOP = 'right top';
    const BACKGROUND_POSITION_LEFT = 'left center';
    const BACKGROUND_POSITION_CENTER = 'center center';
    const BACKGROUND_POSITION_RIGHT = 'right center';
    const BACKGROUND_POSITION_LEFT_BOTTOM = 'left bottom';
    const BACKGROUND_POSITION_BOTTOM = 'center bottom';
    const BACKGROUND_POSITION_RIGHT_BOTTOM = 'right bottom';
    const VERTICAL_ALIGN_TOP = 'top';
    const VERTICAL_ALIGN_CENTER = 'center';
    const VERTICAL_ALIGN_BOTTOM = 'bottom';
    const VERTICAL_ALIGN_STRETCH = 'stretch';
    const VERTICAL_ALIGN_STICKY = 'sticky';
    const LINK_TARGET_SELF = '_self';
    const LINK_TARGET_BLANK = '_blank';
    const LINK_REL_OPTIONS = [
        '',
        'nofollow',
        'noopener',
        'noreferrer',
        'noopener noreferrer',
        'nofollow noopener noreferrer'
    ];
    const LINK_TARGET_OPTIONS = [
        '',
        LINK_TARGET_SELF,
        LINK_TARGET_BLANK
    ];
    const TILE_MIN_HEIGHT_NONE = 'none';
    const TILE_MIN_HEIGHT_COMPACT = 'compact';
    const TILE_MIN_HEIGHT_STANDARD = 'standard';
    const TILE_MIN_HEIGHT_LARGE = 'large';
    const TILE_MIN_HEIGHT_EXTRA_LARGE = 'extraLarge';
    const TILE_MIN_HEIGHT_MANUAL = 'manual';
    const DEFAULT_TILE_MIN_HEIGHT_PRESET = TILE_MIN_HEIGHT_STANDARD;
    const TILE_MIN_HEIGHT_PRESETS = {
        none: '0px',
        compact: '120px',
        standard: '200px',
        large: '280px',
        extraLarge: '360px',
        manual: null
    };
    const CONTENT_PADDING_PRESETS = ['none', 'small', 'normal', 'large', 'extraLarge'];
    const DEFAULT_CONTENT_PADDING_PRESET = 'normal';
    const GRID_GAP_PRESETS = ['none', 'small', 'normal', 'large', 'extraLarge'];
    const DEFAULT_GRID_GAP_PRESET = 'normal';

    return new Class({

        Extends: QUIControl,
        Type: 'package/quiqqer/bricks/bin/Controls/backend/BlockSlot',

        Binds: [
            '$onChange'
        ],

        options: {
            area: null,
            helperContainer: null,
            layoutControl: null,
            slotId: '',
            index: 0,
            interactionMode: INTERACTION_CONTENT,
            allowedModes: DEFAULT_ALLOWED_MODES,
            fixedMode: '',
            allowModeSwitch: true,
            settingsVisibility: null,
            selected: false,
            allowRemoveSlot: false
        },

        initialize: function (options) {
            this.parent(options);

            this.$area = this.getAttribute('area') || {};
            this.$helperContainer = this.getAttribute('helperContainer') || null;
            this.$layoutControl = this.getAttribute('layoutControl') || null;
            this.$slotId = this.getAttribute('slotId') || '';
            this.$index = this.getAttribute('index') || 0;
            this.$Project = null;
            this.$allowedModes = this.$normalizeAllowedModes(this.getAttribute('allowedModes'));
            this.$fixedMode = this.$normalizeFixedMode(this.getAttribute('fixedMode'));
            this.$allowModeSwitch = this.getAttribute('allowModeSwitch') !== false;
            this.$settingsVisibility = this.$normalizeSettingsVisibility(
                this.getAttribute('settingsVisibility')
            );
            this.$interactionMode = this.$normalizeInteractionMode(
                this.getAttribute('interactionMode')
            );
            this.$selected = this.getAttribute('selected') === true;
            this.$allowRemoveSlot = this.getAttribute('allowRemoveSlot') === true;

            this.$ensureAreaMode();
        },

        create: function () {
            this.$Elm = new Element('section', {
                'class': 'quiqqer-bricks-blockSlot-card'
            });

            this.$render();

            return this.$Elm;
        },

        setProject: function (Project) {
            this.$Project = this.$normalizeProject(Project);
            this.$applyProjectToControls(this.$Elm);
        },

        setArea: function (area, slotId, index) {
            this.$area = area || {};
            this.$slotId = slotId || this.$slotId;
            this.$index = typeof index === 'number' ? index : this.$index;
            this.$ensureAreaMode();
            this.$render();
        },

        setInteractionMode: function (mode) {
            this.$interactionMode = this.$normalizeInteractionMode(mode);
            this.$render();
        },

        setSelected: function (selected) {
            this.$selected = selected === true;

            if (!this.$Elm) {
                return;
            }

            this.$Elm.toggleClass('is-selected', this.$selected);
        },

        getSlotId: function () {
            return this.$slotId;
        },

        $render: function () {
            if (!this.$Elm) {
                return;
            }

            const area = this.$area;
            const activeMode = this.$getActiveMode(area);
            const interactionMode = this.$interactionMode;

            this.$Elm.empty();
            this.$Elm.removeEvents('click');
            this.$Elm.removeClass('is-layoutMode');
            this.$Elm.removeClass('is-contentMode');
            this.$Elm.removeClass('is-selected');
            this.$Elm.addClass(
                interactionMode === INTERACTION_LAYOUT
                    ? 'is-layoutMode'
                    : 'is-contentMode'
            );

            if (this.$selected) {
                this.$Elm.addClass('is-selected');
            }

            const Header = new Element('header', {
                'class': 'quiqqer-bricks-blockSlot-cardHeader'
            }).inject(this.$Elm);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardTitle',
                text: area.title || ''
            }).inject(Header);

            if (interactionMode === INTERACTION_LAYOUT) {
                new Element('span', {
                    'class': 'quiqqer-bricks-blockSlot-cardSlotId',
                    text: this.$getLocale('slot.label', {
                        id: this.$slotId || ('slot-' + (this.$index + 1))
                    })
                }).inject(Header);
            }

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-cardMode',
                text: interactionMode === INTERACTION_LAYOUT
                    ? this.$getLocale('interaction.layout')
                    : this.$getModeLabel(activeMode)
            }).inject(Header);

            if (interactionMode === INTERACTION_LAYOUT) {
                this.$renderLayoutMode(area, activeMode);
                return;
            }

            this.$renderContentMode(area, activeMode);
        },

        $renderContentMode: function (area, activeMode) {
            const PreviewButton = new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-blockSlot-preview',
                events: {
                    click: this.$openQuickEdit.bind(this)
                }
            }).inject(this.$Elm);

            this.$fillPreview(PreviewButton, area, activeMode);

            const Footer = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardFooter'
            }).inject(this.$Elm);

            const Actions = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardActions'
            }).inject(Footer);

            const PrimaryActions = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardActionGroup'
            }).inject(Actions);

            const settingsLabel = this.$getLocale('settings.button');

            new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-blockSlot-cardAction',
                html: '<span class="fa fa-cog"></span><span>' + settingsLabel + '</span>',
                title: settingsLabel,
                'aria-label': settingsLabel,
                events: {
                    click: this.$openSettingsPopup.bind(this)
                }
            }).inject(PrimaryActions);

            if (activeMode === MODE_BRICK && area.brickId) {
                const editLabel = this.$getLocale('edit.button');

                new Element('button', {
                    type: 'button',
                    'class': 'quiqqer-bricks-blockSlot-cardAction',
                    html: '<span class="fa fa-pencil"></span><span>' + editLabel + '</span>',
                    title: this.$getLocale('edit.title'),
                    'aria-label': this.$getLocale('edit.title'),
                    events: {
                        click: this.$openBrickEditWindow.bind(this)
                    }
                }).inject(PrimaryActions);
            }

            if (this.$canRemoveAreaContent(area)) {
                const removeLabel = this.$getRemoveButtonLabel(activeMode);

                new Element('button', {
                    type: 'button',
                    'class': 'quiqqer-bricks-blockSlot-cardAction '
                        + 'quiqqer-bricks-blockSlot-cardAction--danger',
                    html: '<span class="fa fa-trash"></span><span>' + removeLabel + '</span>',
                    title: removeLabel,
                    'aria-label': removeLabel,
                    events: {
                        click: this.$confirmRemoveAreaContent.bind(this)
                    }
                }).inject(Actions);
            }

            Actions.addClass(
                'quiqqer-bricks-blockSlot-cardActions--count-'
                + Actions.getElements('.quiqqer-bricks-blockSlot-cardAction').length
            );
        },

        $renderLayoutMode: function (area, activeMode) {
            this.$Elm.addEvent('click', function () {
                this.fireEvent('select', [this, this.$slotId]);
            }.bind(this));

            const Preview = new Element('button', {
                type: 'button',
                'class': 'quiqqer-bricks-blockSlot-layoutPreview'
            }).inject(this.$Elm);

            const Label = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-layoutPreviewLabel'
            }).inject(Preview);

            const labelText = area.title || '';
            const labelMatch = labelText.match(/^(.+?)\s+(\d+)\s*$/);

            if (labelMatch) {
                new Element('span', {
                    'class': 'quiqqer-bricks-blockSlot-layoutPreviewLabelText',
                    text: labelMatch[1]
                }).inject(Label);

                Label.appendText(' ');

                new Element('span', {
                    'class': 'quiqqer-bricks-blockSlot-layoutPreviewLabelNumber',
                    text: labelMatch[2]
                }).inject(Label);
            } else {
                Label.set('text', labelText);
            }

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-layoutPreviewType',
                text: this.$getModeLabel(activeMode)
            }).inject(Preview);

            const Footer = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardFooter'
            }).inject(this.$Elm);

            const Actions = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-cardActions'
            }).inject(Footer);

            if (this.$allowRemoveSlot) {
                new Element('button', {
                    type: 'button',
                    'class': 'quiqqer-bricks-blockSlot-cardAction '
                        + 'quiqqer-bricks-blockSlot-cardAction--danger',
                    html: '<span class="fa fa-trash"></span><span>' +
                        this.$getLocale('removeSlot.button') + '</span>',
                    title: this.$getLocale('removeSlot.button'),
                    events: {
                        click: function (event) {
                            event.stop();
                            this.$confirmRemoveSlot();
                        }.bind(this)
                    }
                }).inject(Actions);
            }
        },

        $onChange: function () {
            this.$ensureAreaMode();
            this.$render();
            this.fireEvent('change', [this, this.$area, this.$slotId]);
        },

        $fillPreview: function (PreviewButton, area, mode) {
            PreviewButton.empty();
            PreviewButton.set('data-mode', mode);
            PreviewButton.set('title', this.$getLocale('quickEdit.title', {
                mode: this.$getModeLabel(mode)
            }));
            this.$applyPreviewStyles(PreviewButton, area);

            switch (mode) {
                case MODE_BRICK:
                    this.$fillBrickPreview(PreviewButton, area);
                    break;

                case MODE_IMAGE:
                    this.$fillImagePreview(PreviewButton, area);
                    break;

                case MODE_SUB_LAYOUT:
                    this.$fillSubLayoutPreview(PreviewButton);
                    break;

                case MODE_EDITOR:
                default:
                    this.$fillEditorPreview(PreviewButton, area);
            }

            const PreviewMeta = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewMeta'
            }).inject(PreviewButton);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewHint',
                text: this.$getQuickEditLabel(mode)
            }).inject(PreviewMeta);
        },

        $applyPreviewStyles: function (PreviewButton, area) {
            const backgroundImage = area.backgroundEnabled && area.backgroundImage
                ? 'url("' + area.backgroundImage.replace(/"/g, '\\"') + '")'
                : '';
            const overlay = this.$getPreviewOverlay(area);
            const styles = {
                backgroundColor: '',
                backgroundImage: '',
                backgroundPosition: '',
                backgroundRepeat: '',
                backgroundSize: '',
                color: area.textColor || ''
            };

            if (area.backgroundColorEnabled && area.backgroundColor) {
                styles.backgroundColor = area.backgroundColor;
            }

            if (backgroundImage) {
                styles.backgroundImage = overlay
                    ? overlay + ', ' + backgroundImage
                    : backgroundImage;
                styles.backgroundPosition = area.backgroundImagePosition || BACKGROUND_POSITION_CENTER;
                styles.backgroundRepeat = 'no-repeat';
                styles.backgroundSize = area.backgroundImageFit || IMAGE_FIT_COVER;
            }

            PreviewButton.setStyles(styles);
        },

        $getPreviewOverlay: function (area) {
            const color = this.$getPreviewOverlayColor(area);

            if (!color) {
                return '';
            }

            return 'linear-gradient(' + color + ', ' + color + ')';
        },

        $getPreviewOverlayColor: function (area) {
            const color = area.backgroundOverlayColor || '';

            if (!color || !area.backgroundOverlayEnabled) {
                return '';
            }

            const opacity = Math.max(0, Math.min(100, parseInt(area.backgroundOverlayOpacity, 10) || 0));

            if (opacity >= 100) {
                return color;
            }

            const rgba = this.$hexToRgba(color, opacity / 100);

            return rgba || color;
        },

        $hexToRgba: function (color, alpha) {
            const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');

            if (!match) {
                return null;
            }

            let hex = match[1];

            if (hex.length === 3) {
                hex = hex.split('').map(function (part) {
                    return part + part;
                }).join('');
            }

            return 'rgba(' + parseInt(hex.slice(0, 2), 16) + ', '
                + parseInt(hex.slice(2, 4), 16) + ', '
                + parseInt(hex.slice(4, 6), 16) + ', '
                + alpha + ')';
        },

        $fillEditorPreview: function (PreviewButton, area) {
            if (!area.content || !area.content.trim()) {
                this.$createPlaceholder(
                    PreviewButton,
                    'fa fa-align-left',
                    this.$getLocale('editor.empty')
                );
                return;
            }

            const PreviewContent = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewContent '
                    + this.$getPreviewVerticalAlignClass(area)
            }).inject(PreviewButton);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewHtml',
                html: area.content
            }).inject(PreviewContent);
        },

        $getPreviewVerticalAlignClass: function (area) {
            switch (area.verticalAlign) {
                case VERTICAL_ALIGN_STICKY:
                case VERTICAL_ALIGN_TOP:
                    return 'quiqqer-bricks-blockSlot-previewContent--alignTop';

                case VERTICAL_ALIGN_BOTTOM:
                    return 'quiqqer-bricks-blockSlot-previewContent--alignBottom';

                case VERTICAL_ALIGN_STRETCH:
                    return 'quiqqer-bricks-blockSlot-previewContent--alignStretch';

                case VERTICAL_ALIGN_CENTER:
                default:
                    return 'quiqqer-bricks-blockSlot-previewContent--alignCenter';
            }
        },

        $fillBrickPreview: function (PreviewButton, area) {
            if (!area.brickId && !area.brickTitle) {
                this.$createPlaceholder(
                    PreviewButton,
                    'fa fa-cubes',
                    this.$getLocale('brick.empty')
                );
                return;
            }

            const Wrap = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewBrick'
            }).inject(PreviewButton);

            const Content = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewBrickCard'
            }).inject(Wrap);

            new Element('span', {
                'class': 'fa fa-cubes quiqqer-bricks-blockSlot-previewIcon'
            }).inject(Content);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewBrickTitle',
                text: area.brickTitle || this.$getLocale('brick.untitled')
            }).inject(Content);

            if (area.brickType) {
                new Element('div', {
                    'class': 'quiqqer-bricks-blockSlot-previewBrickType',
                    text: area.brickType
                }).inject(Content);
            }
        },

        $fillImagePreview: function (PreviewButton, area) {
            if (!area.image) {
                this.$createPlaceholder(
                    PreviewButton,
                    'fa fa-picture-o',
                    this.$getLocale('image.empty')
                );
                return;
            }

            const wrapStyles = {};

            if (area.imageWidth) {
                wrapStyles.maxWidth = this.$normalizeCssSizeValue(area.imageWidth);
            }

            if (area.imageHeight) {
                wrapStyles.maxHeight = this.$normalizeCssSizeValue(area.imageHeight);
            }

            const Wrap = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewImageWrap',
                styles: wrapStyles
            }).inject(PreviewButton);

            const Image = new Element('img', {
                'class': 'quiqqer-bricks-blockSlot-previewImage',
                src: area.image,
                alt: area.title || '',
                styles: area.imagePosition ? {
                    objectPosition: area.imagePosition
                } : {}
            }).inject(Wrap);

            if (area.imageFit === IMAGE_FIT_COVER) {
                Image.addClass('quiqqer-bricks-blockSlot-previewImage--cover');
            } else if (area.imageFit === IMAGE_FIT_CONTAIN) {
                Image.addClass('quiqqer-bricks-blockSlot-previewImage--contain');
            } else {
                Image.addClass('quiqqer-bricks-blockSlot-previewImage--auto');
            }
        },

        $fillSubLayoutPreview: function (PreviewButton) {
            this.$createPlaceholder(
                PreviewButton,
                'fa fa-columns',
                this.$getLocale('subLayout.title')
            );
        },

        $createPlaceholder: function (Parent, iconClass, text) {
            const Placeholder = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-previewPlaceholder'
            }).inject(Parent);

            new Element('span', {
                'class': iconClass + ' quiqqer-bricks-blockSlot-previewPlaceholderIcon'
            }).inject(Placeholder);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-previewPlaceholderText',
                text: text
            }).inject(Placeholder);
        },

        $openQuickEdit: function () {
            if (this.$interactionMode === INTERACTION_LAYOUT) {
                return;
            }

            switch (this.$getActiveMode(this.$area)) {
                case MODE_BRICK:
                    this.$openBrickSelect();
                    break;

                case MODE_IMAGE:
                    this.$openImageSelect();
                    break;

                case MODE_SUB_LAYOUT:
                    this.fireEvent('editSubLayout', [this, this.$area, this.$slotId]);
                    break;

                case MODE_EDITOR:
                default:
                    this.$openEditor();
            }
        },

        $openEditor: function () {
            if (!this.$helperContainer) {
                return;
            }

            const Holder = new Element('div').inject(this.$helperContainer);
            const Input = new Element('input', {
                type: 'hidden',
                'data-qui': 'controls/editors/Input',
                value: this.$area.content || ''
            }).inject(Holder);

            QUI.parse(Holder).then(function () {
                const Control = QUI.Controls.getById(Input.get('data-quiid'));

                if (!Control) {
                    Holder.destroy();
                    return;
                }

                const Project = this.$getEffectiveProject();

                if (Project && 'setProject' in Control) {
                    Control.setProject(Project);
                }

                Input.addEvent('change', function () {
                    this.$area.content = Input.value || '';
                    Holder.destroy();
                    this.$onChange();
                }.bind(this));

                Control.open();
            }.bind(this));
        },

        $openBrickSelect: function () {
            new BrickSelectWindow({
                project: this.$getProjectName(),
                lang: this.$getProjectLang(),
                autoclose: true,
                events: {
                    submit: function (Win, value) {
                        if (!value || !value.length) {
                            return;
                        }

                        const selected = value[0];

                        this.$area.brickId = selected.id ? parseInt(selected.id, 10) || 0 : 0;
                        this.$area.brickTitle = selected.title || selected.name || '';
                        this.$area.brickType = selected.type || '';

                        this.$onChange();
                    }.bind(this)
                }
            }).open();
        },

        $openBrickEditWindow: function () {
            const brickId = this.$area.brickId;

            if (!brickId) {
                return;
            }

            let projectName = this.$getProjectName();
            let projectLang = this.$getProjectLang();

            if ((!projectName || !projectLang) && typeof QUIQQER_PROJECT !== 'undefined') {
                projectName = projectName || QUIQQER_PROJECT.name;
                projectLang = projectLang || QUIQQER_PROJECT.lang;
            }

            require([
                'package/quiqqer/bricks/bin/Controls/backend/BrickEditWindow'
            ], function (BrickEditWindow) {
                new BrickEditWindow({
                    brickId: brickId,
                    projectName: projectName,
                    projectLang: projectLang
                }).open();
            });
        },

        $openImageSelect: function () {
            if (!this.$helperContainer) {
                return;
            }

            const Holder = new Element('div').inject(this.$helperContainer);
            const Input = new Element('input', {
                type: 'text',
                'data-qui': 'controls/projects/project/media/Input',
                'data-qui-options-selectable_types': 'image',
                value: this.$area.image || ''
            }).inject(Holder);

            QUI.parse(Holder).then(function () {
                const Control = QUI.Controls.getById(Input.get('data-quiid'));

                if (!Control) {
                    Holder.destroy();
                    return;
                }

                const Project = this.$getEffectiveProject();

                if (Project && 'setProject' in Control) {
                    Control.setProject(Project);
                }

                if ('addEvent' in Control) {
                    Control.addEvent('change', function (ControlInstance, value) {
                        this.$area.image = value || '';
                        Holder.destroy();
                        this.$onChange();
                    }.bind(this));
                }

                if (Control.$MediaButton && 'click' in Control.$MediaButton) {
                    Control.$MediaButton.click();
                    return;
                }

                Holder.destroy();
            }.bind(this));
        },

        $openSettingsPopup: function () {
            if (this.$interactionMode === INTERACTION_LAYOUT) {
                return;
            }

            const area = this.$area;
            const activeMode = this.$getActiveMode(area);

            new QUIConfirm({
                icon: 'fa fa-cog',
                title: this.$getLocale('settings.popup.title', {
                    title: area.title
                }),
                maxWidth: 800,
                maxHeight: 850,
                events: {
                    onOpen: function (Win) {
                        const Content = Win.getContent();

                        Content.set('html', '');
                        Content.addClass('quiqqer-bricks-blockSlot-popup');

                        const Form = new Element('div', {
                            'class': 'quiqqer-bricks-blockSlot-popupForm'
                        }).inject(Content);

                        const LeftCol = new Element('div', {
                            'class': 'quiqqer-bricks-blockSlot-popupForm-col quiqqer-bricks-blockSlot-popupForm-col--left'
                        }).inject(Form);

                        const RightCol = new Element('div', {
                            'class': 'quiqqer-bricks-blockSlot-popupForm-col quiqqer-bricks-blockSlot-popupForm-col--right'
                        }).inject(Form);

                        const ModeField = this.$createPopupModeField(LeftCol, activeMode);

                        if (this.$isSettingVisible('contentPaddingPreset')) {
                            this.$createPopupSelectField(
                                LeftCol,
                                this.$getLocale('contentPaddingPreset'),
                                this.$getContentPaddingPresetOptions(),
                                this.$normalizeContentPaddingPreset(area.contentPaddingPreset),
                                'data-name',
                                'contentPaddingPreset'
                            );
                        }

                        let VerticalAlignField = null;
                        let StickyOffsetField = null;

                        if (this.$isSettingVisible('verticalAlign')) {
                            VerticalAlignField = this.$createPopupSelectField(
                                LeftCol,
                                this.$getLocale('verticalAlign'),
                                [
                                    {
                                        value: VERTICAL_ALIGN_TOP,
                                        text: this.$getLocale('verticalAlign.top')
                                    },
                                    {
                                        value: VERTICAL_ALIGN_CENTER,
                                        text: this.$getLocale('verticalAlign.center')
                                    },
                                    {
                                        value: VERTICAL_ALIGN_BOTTOM,
                                        text: this.$getLocale('verticalAlign.bottom')
                                    },
                                    {
                                        value: VERTICAL_ALIGN_STRETCH,
                                        text: this.$getLocale('verticalAlign.stretch')
                                    },
                                    {
                                        value: VERTICAL_ALIGN_STICKY,
                                        text: this.$getLocale('verticalAlign.sticky')
                                    }
                                ],
                                area.verticalAlign,
                                'data-name',
                                'verticalAlign'
                            );

                            StickyOffsetField = this.$createPopupInputField(LeftCol, {
                                label: this.$getLocale('stickyOffset'),
                                type: 'text',
                                value: area.stickyOffset || '',
                                name: 'stickyOffset'
                            });

                            new Element('div', {
                                'class': 'quiqqer-bricks-blockSlot-popupHint',
                                text: this.$getLocale('stickyOffset.help')
                            }).inject(StickyOffsetField);
                        }

                        let CustomMinHeightSettings = null;

                        if (this.$isSettingVisible('customMinHeight')) {
                            CustomMinHeightSettings = this.$createPopupCustomMinHeightSettings(LeftCol, area);
                        }

                        if (this.$isSettingVisible('customCssClasses')) {
                            this.$createPopupCustomCssSettings(LeftCol, area);
                        }

                        let BackgroundOptions = null;
                        let BackgroundEnabledField = null;
                        let OverlayOptions = null;
                        let OverlayEnabledField = null;

                        if (this.$isSettingVisible('background')) {
                            const Background = this.$createPopupBackgroundSettings(RightCol, area);
                            BackgroundOptions = Background.options;
                            BackgroundEnabledField = Background.enabledField;
                            OverlayOptions = Background.overlayOptions;
                            OverlayEnabledField = Background.overlayEnabledField;
                        }

                        let BackgroundColorOptions = null;
                        let BackgroundColorEnabledField = null;

                        if (this.$isSettingVisible('backgroundColor')) {
                            const BgColor = this.$createPopupBackgroundColorSettings(RightCol, area);
                            BackgroundColorOptions = BgColor.options;
                            BackgroundColorEnabledField = BgColor.enabledField;
                        }

                        let TextColorOptions = null;
                        let TextColorEnabledField = null;

                        if (this.$isSettingVisible('textColor')) {
                            const TextColor = this.$createPopupTextColorSettings(RightCol, area);
                            TextColorOptions = TextColor.options;
                            TextColorEnabledField = TextColor.enabledField;
                        }

                        let LinkOptions = null;
                        let LinkEnabledField = null;

                        if (this.$isSettingVisible('link')) {
                            const Link = this.$createPopupLinkSettings(LeftCol, area);
                            LinkOptions = Link.options;
                            LinkEnabledField = Link.enabledField;
                        }

                        let ImageSettings = null;

                        if (this.$isSettingVisible('image')) {
                            ImageSettings = this.$createPopupImageSettings(LeftCol, area);
                        }

                        const SubLayoutSettings = this.$createPopupSubLayoutSettings(LeftCol, area);

                        const toggleImageSettings = function () {
                            if (!ImageSettings) {
                                return;
                            }

                            const mode = ModeField ? ModeField.value : activeMode;

                            ImageSettings.section.setStyle('display', mode === MODE_IMAGE ? '' : 'none');
                        };

                        const toggleSubLayoutSettings = function () {
                            const mode = ModeField ? ModeField.value : activeMode;

                            SubLayoutSettings.section.setStyle('display', mode === MODE_SUB_LAYOUT ? '' : 'none');
                        };

                        const toggleImageOptions = function () {
                            if (!ImageSettings) {
                                return;
                            }

                            ImageSettings.options.setStyle(
                                'display',
                                ImageSettings.fitField.value === IMAGE_FIT_AUTO ? 'none' : ''
                            );
                        };

                        // sticky only works in editor mode (only that mode
                        // renders a .__contentInner to stick); offer + reveal
                        // the offset field accordingly
                        const toggleVerticalAlignSticky = function () {
                            if (!VerticalAlignField) {
                                return;
                            }

                            const modeIsEditor = (ModeField ? ModeField.value : activeMode) === MODE_EDITOR;
                            const StickyOption = VerticalAlignField.getElement(
                                'option[value="' + VERTICAL_ALIGN_STICKY + '"]'
                            );

                            if (StickyOption) {
                                StickyOption.disabled = !modeIsEditor;
                                StickyOption.setStyle('display', modeIsEditor ? '' : 'none');
                            }

                            if (!modeIsEditor && VerticalAlignField.value === VERTICAL_ALIGN_STICKY) {
                                VerticalAlignField.value = VERTICAL_ALIGN_CENTER;
                            }

                            if (StickyOffsetField) {
                                StickyOffsetField.setStyle(
                                    'display',
                                    modeIsEditor && VerticalAlignField.value === VERTICAL_ALIGN_STICKY
                                        ? ''
                                        : 'none'
                                );
                            }
                        };

                        const toggleCustomMinHeightSettings = function () {
                            if (!CustomMinHeightSettings) {
                                return;
                            }

                            CustomMinHeightSettings.options.setStyle(
                                'display',
                                CustomMinHeightSettings.enabledField.checked ? '' : 'none'
                            );

                            CustomMinHeightSettings.manualField.setStyle(
                                'display',
                                CustomMinHeightSettings.enabledField.checked
                                    && CustomMinHeightSettings.presetField.value === TILE_MIN_HEIGHT_MANUAL
                                    ? ''
                                    : 'none'
                            );
                        };

                        const toggleBackgroundSettings = function () {
                            if (!BackgroundOptions || !BackgroundEnabledField) {
                                return;
                            }

                            BackgroundOptions.setStyle(
                                'display',
                                BackgroundEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleOverlaySettings = function () {
                            if (!OverlayOptions || !OverlayEnabledField) {
                                return;
                            }

                            OverlayOptions.setStyle(
                                'display',
                                OverlayEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleBackgroundColorSettings = function () {
                            if (!BackgroundColorOptions || !BackgroundColorEnabledField) {
                                return;
                            }

                            BackgroundColorOptions.setStyle(
                                'display',
                                BackgroundColorEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleTextColorSettings = function () {
                            if (!TextColorOptions || !TextColorEnabledField) {
                                return;
                            }

                            TextColorOptions.setStyle(
                                'display',
                                TextColorEnabledField.checked ? '' : 'none'
                            );
                        };

                        const toggleLinkSettings = function () {
                            if (!LinkOptions || !LinkEnabledField) {
                                return;
                            }

                            LinkOptions.setStyle(
                                'display',
                                LinkEnabledField.checked ? '' : 'none'
                            );
                        };

                        if (ModeField) {
                            ModeField.addEvent('change', toggleImageSettings);
                            ModeField.addEvent('change', toggleSubLayoutSettings);
                            ModeField.addEvent('change', toggleVerticalAlignSticky);
                        }

                        if (VerticalAlignField) {
                            VerticalAlignField.addEvent('change', toggleVerticalAlignSticky);
                        }

                        if (ImageSettings) {
                            ImageSettings.fitField.addEvent('change', toggleImageOptions);
                        }

                        if (CustomMinHeightSettings) {
                            CustomMinHeightSettings.enabledField.addEvent(
                                'change',
                                toggleCustomMinHeightSettings
                            );
                            CustomMinHeightSettings.presetField.addEvent(
                                'change',
                                toggleCustomMinHeightSettings
                            );
                        }

                        if (BackgroundEnabledField) {
                            BackgroundEnabledField.addEvent('change', toggleBackgroundSettings);
                        }

                        if (OverlayEnabledField) {
                            OverlayEnabledField.addEvent('change', toggleOverlaySettings);
                        }

                        if (BackgroundColorEnabledField) {
                            BackgroundColorEnabledField.addEvent('change', toggleBackgroundColorSettings);
                        }

                        if (TextColorEnabledField) {
                            TextColorEnabledField.addEvent('change', toggleTextColorSettings);
                        }

                        if (LinkEnabledField) {
                            LinkEnabledField.addEvent('change', toggleLinkSettings);
                        }

                        toggleImageSettings();
                        toggleSubLayoutSettings();
                        toggleVerticalAlignSticky();
                        toggleImageOptions();
                        toggleCustomMinHeightSettings();
                        toggleBackgroundSettings();
                        toggleOverlaySettings();
                        toggleBackgroundColorSettings();
                        toggleTextColorSettings();
                        toggleLinkSettings();

                        Promise.all([
                            QUI.parse(Content),
                            ControlUtils.parse(Content)
                        ]).then(function () {
                            this.$applyProjectToControls(Content);
                        }.bind(this));
                    }.bind(this),

                    onSubmit: function (Win) {
                        const Content = Win.getContent();
                        const modeField = Content.getElement('select[data-name="mode"]');
                        const contentPaddingPresetField = Content.getElement('select[data-name="contentPaddingPreset"]');
                        const verticalAlignField = Content.getElement('select[data-name="verticalAlign"]');
                        const stickyOffsetField = Content.getElement('input[data-name="stickyOffset"]');
                        const customMinHeightEnabledField = Content.getElement(
                            'input[data-name="customMinHeightEnabled"]'
                        );
                        const customMinHeightPresetField = Content.getElement(
                            'select[data-name="customMinHeightPreset"]'
                        );
                        const customMinHeightValueField = Content.getElement(
                            'input[data-name="customMinHeightValue"]'
                        );
                        const customCssClassesField = Content.getElement(
                            'input[data-name="customCssClasses"]'
                        );
                        const imageFitField = Content.getElement('select[data-name="imageFit"]');
                        const imageWidthField = Content.getElement('input[data-name="imageWidth"]');
                        const imageHeightField = Content.getElement('input[data-name="imageHeight"]');
                        const imagePositionField = Content.getElement('select[data-name="imagePosition"]');
                        const backgroundEnabledField = Content.getElement('input[data-name="backgroundEnabled"]');
                        const backgroundImageField = Content.getElement('input[data-name="backgroundImage"]');
                        const backgroundImageFitField = Content.getElement('select[data-name="backgroundImageFit"]');
                        const backgroundImagePositionField = Content.getElement(
                            'select[data-name="backgroundImagePosition"]'
                        );
                        const backgroundOverlayEnabledField = Content.getElement(
                            'input[data-name="backgroundOverlayEnabled"]'
                        );
                        const backgroundOverlayColorField = Content.getElement(
                            'input[data-name="backgroundOverlayColor"]'
                        );
                        const backgroundOverlayOpacityField = Content.getElement(
                            'input[data-name="backgroundOverlayOpacity"]'
                        );
                        const backgroundColorEnabledField = Content.getElement(
                            'input[data-name="backgroundColorEnabled"]'
                        );
                        const backgroundColorField = Content.getElement('input[data-name="backgroundColor"]');
                        const textColorEnabledField = Content.getElement('input[data-name="textColorEnabled"]');
                        const textColorField = Content.getElement('input[data-name="textColor"]');
                        const linkEnabledField = Content.getElement('input[data-name="linkEnabled"]');
                        const linkHrefField = Content.getElement('input[data-name="linkHref"]');
                        const linkRelField = Content.getElement('select[data-name="linkRel"]');
                        const linkTargetField = Content.getElement('select[data-name="linkTarget"]');
                        const linkTitleField = Content.getElement('input[data-name="linkTitle"]');
                        const subLayoutAreaBackgroundEnabledField = Content.getElement(
                            'input[data-name="subLayoutAreaBackgroundEnabled"]'
                        );
                        const subLayoutGridGapPresetField = Content.getElement(
                            'select[data-name="subLayoutGridGapPreset"]'
                        );
                        const subLayoutTileMinHeightPresetField = Content.getElement(
                            'select[data-name="subLayoutTileMinHeightPreset"]'
                        );
                        const subLayoutTileMinHeightValueField = Content.getElement(
                            'input[data-name="subLayoutTileMinHeightValue"]'
                        );
                        const backgroundOverlayOpacity = backgroundOverlayOpacityField
                            ? parseInt(backgroundOverlayOpacityField.value, 10)
                            : area.backgroundOverlayOpacity;

                        area.mode = this.$normalizeMode(modeField ? modeField.value : area.mode);

                        if (this.$isSettingVisible('contentPaddingPreset')) {
                            area.contentPaddingPreset = this.$normalizeContentPaddingPreset(
                                contentPaddingPresetField ? contentPaddingPresetField.value : null
                            );
                        }

                        if (this.$isSettingVisible('verticalAlign')) {
                            area.verticalAlign = verticalAlignField
                                ? verticalAlignField.value
                                : VERTICAL_ALIGN_CENTER;
                            area.stickyOffset = stickyOffsetField
                                ? stickyOffsetField.value.trim()
                                : '';
                        }

                        if (this.$isSettingVisible('customMinHeight')) {
                            area.customMinHeightEnabled = !!(
                                customMinHeightEnabledField && customMinHeightEnabledField.checked
                            );
                            area.customMinHeightPreset = this.$normalizeTileMinHeightPreset(
                                customMinHeightPresetField
                                    ? customMinHeightPresetField.value
                                    : area.customMinHeightPreset
                            );
                            area.customMinHeightValue = customMinHeightValueField
                                ? customMinHeightValueField.value.trim()
                                : '';
                        }

                        if (this.$isSettingVisible('customCssClasses')) {
                            area.customCssClasses = this.$normalizeCustomCssClasses(
                                customCssClassesField
                                    ? customCssClassesField.value
                                    : area.customCssClasses
                            );
                        }

                        if (this.$isSettingVisible('image')) {
                            area.imageFit = imageFitField ? imageFitField.value : IMAGE_FIT_AUTO;
                            area.imageWidth = imageWidthField ? imageWidthField.value.trim() : '';
                            area.imageHeight = imageHeightField ? imageHeightField.value.trim() : '';
                            area.imagePosition = imagePositionField
                                ? imagePositionField.value
                                : BACKGROUND_POSITION_CENTER;
                        }

                        if (this.$isSettingVisible('background')) {
                            area.backgroundEnabled = !!(backgroundEnabledField && backgroundEnabledField.checked);
                            area.backgroundImage = backgroundImageField ? backgroundImageField.value || '' : '';
                            area.backgroundImageFit = backgroundImageFitField
                                ? backgroundImageFitField.value
                                : IMAGE_FIT_COVER;
                            area.backgroundImagePosition = backgroundImagePositionField
                                ? backgroundImagePositionField.value
                                : BACKGROUND_POSITION_CENTER;
                            area.backgroundOverlayEnabled = !!(
                                backgroundOverlayEnabledField && backgroundOverlayEnabledField.checked
                            );
                            area.backgroundOverlayColor = backgroundOverlayColorField
                                ? backgroundOverlayColorField.value.trim()
                                : '';
                            area.backgroundOverlayOpacity = isNaN(backgroundOverlayOpacity)
                                ? 100
                                : Math.max(0, Math.min(100, backgroundOverlayOpacity));
                        }

                        if (this.$isSettingVisible('backgroundColor')) {
                            area.backgroundColorEnabled = !!(
                                backgroundColorEnabledField && backgroundColorEnabledField.checked
                            );
                            area.backgroundColor = backgroundColorField
                                ? backgroundColorField.value.trim()
                                : '';
                        }

                        if (this.$isSettingVisible('textColor')) {
                            area.textColor = textColorEnabledField && textColorEnabledField.checked && textColorField
                                ? textColorField.value.trim()
                                : '';
                        }

                        if (this.$isSettingVisible('link')) {
                            area.link = this.$normalizeLink(
                                linkEnabledField && linkEnabledField.checked
                                    ? {
                                        href: linkHrefField ? linkHrefField.value : '',
                                        rel: linkRelField ? linkRelField.value : '',
                                        target: linkTargetField ? linkTargetField.value : '',
                                        title: linkTitleField ? linkTitleField.value : ''
                                    }
                                    : null
                            );
                        }

                        area.subLayoutAreaBackgroundEnabled = !!(
                            subLayoutAreaBackgroundEnabledField
                            && subLayoutAreaBackgroundEnabledField.checked
                        );
                        area.subLayoutGridGapPreset = this.$normalizeGridGapPreset(
                            subLayoutGridGapPresetField
                                ? subLayoutGridGapPresetField.value
                                : area.subLayoutGridGapPreset
                        );
                        area.subLayoutTileMinHeightPreset = this.$normalizeTileMinHeightPreset(
                            subLayoutTileMinHeightPresetField
                                ? subLayoutTileMinHeightPresetField.value
                                : area.subLayoutTileMinHeightPreset
                        );
                        area.subLayoutTileMinHeightValue = subLayoutTileMinHeightValueField
                            ? subLayoutTileMinHeightValueField.value.trim()
                            : '';

                        this.$onChange();
                    }.bind(this)
                }
            }).open();
        },

        $createPopupSelectField: function (Parent, label, options, value, attrName, attrValue) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: label
            }).inject(Field);

            const Select = new Element('select', {
                'class': 'quiqqer-bricks-blockSlot-popupSelect'
            }).inject(Field);

            Select.set(attrName || 'data-name', attrValue || 'mode');

            options.forEach(function (entry) {
                new Element('option', {
                    value: entry.value,
                    text: entry.text,
                    selected: value === entry.value
                }).inject(Select);
            });

            return Select;
        },

        $createPopupModeField: function (Parent, activeMode) {
            if (!this.$shouldShowModeField()) {
                return null;
            }

            return this.$createPopupSelectField(
                Parent,
                this.$getLocale('mode'),
                this.$getModeOptions(),
                activeMode,
                'data-name',
                'mode'
            );
        },

        $createPopupBackgroundSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('background.section')
            );

            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('background.enabled'),
                area.backgroundEnabled,
                'backgroundEnabled'
            );

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupMediaField(Options, {
                label: this.$getLocale('background.image'),
                value: area.backgroundImage,
                name: 'backgroundImage'
            });

            this.$createPopupSelectField(
                Options,
                this.$getLocale('background.fit'),
                [
                    {
                        value: IMAGE_FIT_COVER,
                        text: this.$getLocale('background.fit.cover')
                    },
                    {
                        value: IMAGE_FIT_CONTAIN,
                        text: this.$getLocale('background.fit.contain')
                    },
                    {
                        value: IMAGE_FIT_AUTO,
                        text: this.$getLocale('background.fit.auto')
                    }
                ],
                area.backgroundImageFit,
                'data-name',
                'backgroundImageFit'
            );

            this.$createPopupSelectField(
                Options,
                this.$getLocale('background.position'),
                this.$getPositionOptions('background.position'),
                area.backgroundImagePosition,
                'data-name',
                'backgroundImagePosition'
            );

            const OverlayEnabledField = this.$createPopupCheckboxField(
                Options,
                this.$getLocale('backgroundOverlay.enabled'),
                area.backgroundOverlayEnabled,
                'backgroundOverlayEnabled'
            );

            const OverlayOptions = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Options);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('backgroundOverlay.description')
            }).inject(OverlayOptions);

            this.$createPopupColorField(OverlayOptions, {
                label: this.$getLocale('backgroundOverlay.color'),
                value: area.backgroundOverlayColor,
                name: 'backgroundOverlayColor'
            });

            this.$createPopupRangeField(OverlayOptions, {
                label: this.$getLocale('backgroundOverlay.opacity'),
                value: area.backgroundOverlayOpacity,
                name: 'backgroundOverlayOpacity',
                min: 0,
                max: 100,
                step: 1
            });

            return {
                enabledField: EnabledField,
                options: Options,
                overlayEnabledField: OverlayEnabledField,
                overlayOptions: OverlayOptions
            };
        },

        $createPopupBackgroundColorSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('backgroundColor.section')
            );

            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('backgroundColor.enabled'),
                area.backgroundColorEnabled,
                'backgroundColorEnabled'
            );

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupColorField(Options, {
                label: this.$getLocale('backgroundColor.color'),
                value: area.backgroundColor,
                name: 'backgroundColor'
            });

            return {
                enabledField: EnabledField,
                options: Options
            };
        },

        $createPopupTextColorSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('textColor.section')
            );

            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('textColor.enabled'),
                !!area.textColor,
                'textColorEnabled'
            );

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupColorField(Options, {
                label: this.$getLocale('backgroundColor.color'),
                value: area.textColor,
                name: 'textColor'
            });

            return {
                enabledField: EnabledField,
                options: Options
            };
        },

        $createPopupLinkSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('link.section')
            );
            const Link = this.$normalizeLink(area.link);
            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('link.enabled'),
                !!Link,
                'linkEnabled'
            );
            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            this.$createPopupProjectSiteField(Options, {
                label: this.$getLocale('link.href'),
                value: Link ? Link.href : '',
                name: 'linkHref'
            });

            this.$createPopupSelectField(
                Options,
                this.$getLocale('link.rel'),
                [
                    {
                        value: '',
                        text: this.$getLocale('link.rel.none')
                    },
                    {
                        value: 'nofollow',
                        text: this.$getLocale('link.rel.nofollow')
                    },
                    {
                        value: 'noopener',
                        text: this.$getLocale('link.rel.noopener')
                    },
                    {
                        value: 'noreferrer',
                        text: this.$getLocale('link.rel.noreferrer')
                    },
                    {
                        value: 'noopener noreferrer',
                        text: this.$getLocale('link.rel.noopenerNoreferrer')
                    },
                    {
                        value: 'nofollow noopener noreferrer',
                        text: this.$getLocale('link.rel.nofollowNoopenerNoreferrer')
                    }
                ],
                Link ? Link.rel : '',
                'data-name',
                'linkRel'
            );

            this.$createPopupSelectField(
                Options,
                this.$getLocale('link.target'),
                [
                    {
                        value: '',
                        text: this.$getLocale('link.target.none')
                    },
                    {
                        value: LINK_TARGET_SELF,
                        text: this.$getLocale('link.target.self')
                    },
                    {
                        value: LINK_TARGET_BLANK,
                        text: this.$getLocale('link.target.blank')
                    }
                ],
                Link ? Link.target : '',
                'data-name',
                'linkTarget'
            );

            this.$createPopupInputField(Options, {
                label: this.$getLocale('link.title'),
                type: 'text',
                value: Link ? Link.title : '',
                name: 'linkTitle'
            });

            return {
                enabledField: EnabledField,
                options: Options
            };
        },

        $createPopupImageSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('image.section')
            );

            const FitField = this.$createPopupSelectField(
                Section,
                this.$getLocale('image.fit'),
                [
                    {
                        value: IMAGE_FIT_AUTO,
                        text: this.$getLocale('image.fit.auto')
                    },
                    {
                        value: IMAGE_FIT_COVER,
                        text: this.$getLocale('image.fit.cover')
                    },
                    {
                        value: IMAGE_FIT_CONTAIN,
                        text: this.$getLocale('image.fit.contain')
                    }
                ],
                area.imageFit,
                'data-name',
                'imageFit'
            );

            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);

            const WidthField = this.$createPopupInputField(Options, {
                label: this.$getLocale('image.width'),
                type: 'text',
                value: area.imageWidth,
                name: 'imageWidth'
            });

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('image.width.help')
            }).inject(WidthField);

            const HeightField = this.$createPopupInputField(Options, {
                label: this.$getLocale('image.height'),
                type: 'text',
                value: area.imageHeight,
                name: 'imageHeight'
            });

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('image.height.help')
            }).inject(HeightField);

            this.$createPopupSelectField(
                Options,
                this.$getLocale('image.position'),
                this.$getPositionOptions('image.position'),
                area.imagePosition || BACKGROUND_POSITION_CENTER,
                'data-name',
                'imagePosition'
            );

            return {
                section: Section,
                fitField: FitField,
                options: Options
            };
        },

        $createPopupSubLayoutSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('subLayout.section')
            );

            this.$createPopupCheckboxField(
                Section,
                QUILocale.get(lg, 'brick.multiLayout.areaBackgroundEnabled'),
                area.subLayoutAreaBackgroundEnabled !== false,
                'subLayoutAreaBackgroundEnabled'
            );

            this.$createPopupSelectField(
                Section,
                QUILocale.get(lg, 'brick.multiLayout.gridGap'),
                this.$getGridGapOptions(),
                this.$normalizeGridGapPreset(area.subLayoutGridGapPreset),
                'data-name',
                'subLayoutGridGapPreset'
            );

            const TileMinHeightField = this.$createPopupSelectField(
                Section,
                this.$getLocale('subLayout.tileMinHeight'),
                this.$getTileMinHeightOptions(),
                this.$normalizeTileMinHeightPreset(area.subLayoutTileMinHeightPreset),
                'data-name',
                'subLayoutTileMinHeightPreset'
            );
            const TileMinHeightValueField = this.$createPopupInputField(Section, {
                label: this.$getLocale('subLayout.tileMinHeight.value'),
                type: 'text',
                value: area.subLayoutTileMinHeightValue || '',
                name: 'subLayoutTileMinHeightValue'
            });

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('subLayout.tileMinHeight.value.help')
            }).inject(TileMinHeightValueField);

            const toggleTileMinHeightValue = function () {
                TileMinHeightValueField.setStyle(
                    'display',
                    TileMinHeightField.value === TILE_MIN_HEIGHT_MANUAL ? '' : 'none'
                );
            };

            TileMinHeightField.addEvent('change', toggleTileMinHeightValue);
            toggleTileMinHeightValue();

            return {
                section: Section
            };
        },

        $getPositionOptions: function (localePrefix) {
            const self = this;
            const entries = [
                {value: BACKGROUND_POSITION_LEFT_TOP, key: 'leftTop'},
                {value: BACKGROUND_POSITION_TOP, key: 'centerTop'},
                {value: BACKGROUND_POSITION_RIGHT_TOP, key: 'rightTop'},
                {value: BACKGROUND_POSITION_LEFT, key: 'leftCenter'},
                {value: BACKGROUND_POSITION_CENTER, key: 'center'},
                {value: BACKGROUND_POSITION_RIGHT, key: 'rightCenter'},
                {value: BACKGROUND_POSITION_LEFT_BOTTOM, key: 'leftBottom'},
                {value: BACKGROUND_POSITION_BOTTOM, key: 'centerBottom'},
                {value: BACKGROUND_POSITION_RIGHT_BOTTOM, key: 'rightBottom'}
            ];

            return entries.map(function (entry) {
                return {
                    value: entry.value,
                    text: self.$getLocale(localePrefix + '.' + entry.key)
                };
            });
        },

        $createPopupCustomMinHeightSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('customMinHeight.section')
            );
            const EnabledField = this.$createPopupCheckboxField(
                Section,
                this.$getLocale('customMinHeight.enabled'),
                !!area.customMinHeightEnabled,
                'customMinHeightEnabled'
            );
            const Options = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionBody'
            }).inject(Section);
            const PresetField = this.$createPopupSelectField(
                Options,
                this.$getLocale('customMinHeight.select'),
                this.$getTileMinHeightOptions(),
                this.$normalizeTileMinHeightPreset(area.customMinHeightPreset),
                'data-name',
                'customMinHeightPreset'
            );
            const ManualField = this.$createPopupInputField(Options, {
                label: this.$getLocale('customMinHeight.value'),
                type: 'text',
                value: area.customMinHeightValue || '',
                name: 'customMinHeightValue'
            });

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('customMinHeight.value.help')
            }).inject(ManualField);

            return {
                enabledField: EnabledField,
                options: Options,
                presetField: PresetField,
                manualField: ManualField
            };
        },

        $createPopupCustomCssSettings: function (Parent, area) {
            const Section = this.$createPopupSection(
                Parent,
                this.$getLocale('customCss.section')
            );

            const Field = this.$createPopupInputField(Section, {
                label: this.$getLocale('customCss.classes'),
                type: 'text',
                value: this.$normalizeCustomCssClasses(area.customCssClasses),
                name: 'customCssClasses'
            });

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupHint',
                text: this.$getLocale('customCss.help')
            }).inject(Field);

            return {
                section: Section
            };
        },

        $createPopupSection: function (Parent, title) {
            const Section = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSection'
            }).inject(Parent);

            new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupSectionTitle',
                text: title
            }).inject(Section);

            return Section;
        },

        $createPopupCheckboxField: function (Parent, label, checked, name) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupCheckbox'
            }).inject(Parent);

            const Input = new Element('input', {
                type: 'checkbox'
            }).inject(Field);

            Input.set('data-name', name);

            if (checked) {
                Input.checked = true;
            }

            new Element('span', {
                text: label
            }).inject(Field);

            return Input;
        },

        $createPopupInputField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: options.type || 'text',
                'class': 'quiqqer-bricks-blockSlot-popupInput',
                value: options.value !== undefined ? options.value : ''
            }).inject(Field);

            Input.set('data-name', options.name || 'input');

            if (options.min !== undefined) {
                Input.set('min', options.min);
            }

            if (options.step) {
                Input.set('step', options.step);
            }

            if (options.max !== undefined) {
                Input.set('max', options.max);
            }

            return Field;
        },

        $createPopupColorField: function (Parent, options) {
            const Field = this.$createPopupInputField(Parent, {
                label: options.label,
                type: 'color',
                value: options.value,
                name: options.name
            });

            const Input = Field.getElement('input[data-name="' + (options.name || '') + '"]');

            if (Input) {
                new QUIColorPicker().imports(Input);
            }

            return Field;
        },

        $createPopupRangeField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupField '
                    + 'quiqqer-bricks-blockSlot-popupField--range'
            }).inject(Parent);

            const Header = new Element('div', {
                'class': 'quiqqer-bricks-blockSlot-popupFieldHeader'
            }).inject(Field);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Header);

            const Value = new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupRangeValue'
            }).inject(Header);

            const Input = new Element('input', {
                type: 'range',
                'class': 'quiqqer-bricks-blockSlot-popupInput',
                value: options.value !== undefined ? options.value : ''
            }).inject(Field);

            Input.set('data-name', options.name || 'range');

            if (options.min !== undefined) {
                Input.set('min', options.min);
            }

            if (options.step) {
                Input.set('step', options.step);
            }

            if (options.max !== undefined) {
                Input.set('max', options.max);
            }

            const updateValue = function () {
                Value.set('text', Input.value);
            };

            Input.addEvent('input', updateValue);
            Input.addEvent('change', updateValue);
            updateValue();

            return Field;
        },

        $createPopupMediaField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: 'text',
                'class': 'quiqqer-bricks-blockSlot-popupInput',
                'data-qui': 'controls/projects/project/media/Input',
                'data-qui-options-selectable_types': 'image',
                value: options.value || ''
            }).inject(Field);

            Input.set('data-name', options.name || 'backgroundImage');

            return Field;
        },

        $createPopupProjectSiteField: function (Parent, options) {
            const Field = new Element('label', {
                'class': 'quiqqer-bricks-blockSlot-popupField'
            }).inject(Parent);

            new Element('span', {
                'class': 'quiqqer-bricks-blockSlot-popupLabel',
                text: options.label
            }).inject(Field);

            const Input = new Element('input', {
                type: 'text',
                'class': 'quiqqer-bricks-blockSlot-popupInput project-site',
                'data-external': 1,
                'data-qui-options-media': '1',
                name: options.name || 'linkHref',
                value: options.value || '',
                styles: {
                    display: 'flex'
                }
            }).inject(Field);

            Input.set('data-name', options.name || 'linkHref');

            return Field;
        },

        $normalizeLink: function (link) {
            if (typeOf(link) !== 'object') {
                return null;
            }

            const href = link.href ? link.href.toString().trim() : '';

            if (!href) {
                return null;
            }

            const rel = LINK_REL_OPTIONS.indexOf(link.rel) !== -1 ? link.rel : '';
            const target = LINK_TARGET_OPTIONS.indexOf(link.target) !== -1 ? link.target : '';

            return {
                href: href,
                rel: rel,
                target: target,
                title: link.title ? link.title.toString().trim() : ''
            };
        },

        $normalizeCustomCssClasses: function (value) {
            if (value === null || value === undefined) {
                return '';
            }

            return value.toString().split(',').map(function (entry) {
                return entry.trim();
            }).filter(function (entry) {
                return entry !== '';
            }).join(', ');
        },

        $normalizeCssSizeValue: function (value) {
            if (value === null || value === undefined) {
                return '';
            }

            value = value.toString().trim();

            if (value === '') {
                return '';
            }

            if (/^-?\d+(?:\.\d+)?$/.test(value)) {
                return value + 'px';
            }

            return value;
        },

        $normalizeTileMinHeightPreset: function (preset) {
            return Object.prototype.hasOwnProperty.call(TILE_MIN_HEIGHT_PRESETS, preset)
                ? preset
                : DEFAULT_TILE_MIN_HEIGHT_PRESET;
        },

        $getTileMinHeightOptions: function () {
            return [
                {
                    value: TILE_MIN_HEIGHT_NONE,
                    text: this.$getLocale('customMinHeight.option.none')
                },
                {
                    value: TILE_MIN_HEIGHT_COMPACT,
                    text: this.$getLocale('customMinHeight.option.compact')
                },
                {
                    value: TILE_MIN_HEIGHT_STANDARD,
                    text: this.$getLocale('customMinHeight.option.standard')
                },
                {
                    value: TILE_MIN_HEIGHT_LARGE,
                    text: this.$getLocale('customMinHeight.option.large')
                },
                {
                    value: TILE_MIN_HEIGHT_EXTRA_LARGE,
                    text: this.$getLocale('customMinHeight.option.extraLarge')
                },
                {
                    value: TILE_MIN_HEIGHT_MANUAL,
                    text: this.$getLocale('customMinHeight.option.manual')
                }
            ];
        },

        $normalizeContentPaddingPreset: function (preset) {
            return CONTENT_PADDING_PRESETS.indexOf(preset) !== -1
                ? preset
                : DEFAULT_CONTENT_PADDING_PRESET;
        },

        $normalizeGridGapPreset: function (preset) {
            return GRID_GAP_PRESETS.indexOf(preset) !== -1
                ? preset
                : DEFAULT_GRID_GAP_PRESET;
        },

        $getGridGapOptions: function () {
            return GRID_GAP_PRESETS.map(function (preset) {
                return {
                    value: preset,
                    text: QUILocale.get(lg, 'brick.multiLayout.gridGap.option.' + preset)
                };
            });
        },

        $getContentPaddingPresetOptions: function () {
            const self = this;

            return CONTENT_PADDING_PRESETS.map(function (preset) {
                return {
                    value: preset,
                    text: self.$getLocale('contentPaddingPreset.option.' + preset)
                };
            });
        },

        $canRemoveAreaContent: function (area) {
            switch (this.$getActiveMode(area)) {
                case MODE_BRICK:
                    return !!(area.brickId || area.brickTitle);

                case MODE_IMAGE:
                    return !!area.image;

                default:
                    return false;
            }
        },

        $removeAreaContent: function () {
            switch (this.$getActiveMode(this.$area)) {
                case MODE_BRICK:
                    this.$area.brickId = 0;
                    this.$area.brickTitle = '';
                    this.$area.brickType = '';
                    break;

                case MODE_IMAGE:
                    this.$area.image = '';
                    break;
            }

            this.$onChange();
        },

        $confirmRemoveAreaContent: function () {
            new QUIConfirm({
                icon: 'fa fa-times',
                title: this.$getLocale('remove.popup.title', {
                    title: this.$area.title
                }),
                information: this.$getLocale('remove.popup.information'),
                text: this.$getLocale('remove.popup.text', {
                    mode: this.$getModeLabel(this.$getActiveMode(this.$area))
                }),
                events: {
                    onSubmit: function () {
                        this.$removeAreaContent();
                    }.bind(this)
                }
            }).open();
        },

        $confirmRemoveSlot: function () {
            new QUIConfirm({
                icon: 'fa fa-trash',
                title: this.$getLocale('removeSlot.popup.title', {
                    title: this.$area.title || this.$slotId
                }),
                information: this.$getLocale('removeSlot.popup.information'),
                text: this.$getLocale('removeSlot.popup.text'),
                events: {
                    onSubmit: function () {
                        this.fireEvent('removeSlot', [this, this.$slotId]);
                    }.bind(this)
                }
            }).open();
        },

        $getModeLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return this.$getLocale('mode.brick');

                case MODE_IMAGE:
                    return this.$getLocale('mode.image');

                case MODE_SUB_LAYOUT:
                    return this.$getLocale('mode.subLayout');

                case MODE_EDITOR:
                default:
                    return this.$getLocale('mode.editor');
            }
        },

        $getRemoveButtonLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return this.$getLocale('remove.button.brick');

                case MODE_IMAGE:
                    return this.$getLocale('remove.button.image');

                default:
                    return this.$getLocale('remove.button');
            }
        },

        $getQuickEditLabel: function (mode) {
            switch (mode) {
                case MODE_BRICK:
                    return this.$getLocale('quickEdit.brick');

                case MODE_IMAGE:
                    return this.$getLocale('quickEdit.image');

                case MODE_SUB_LAYOUT:
                    return this.$getLocale('quickEdit.subLayout');

                case MODE_EDITOR:
                default:
                    return this.$getLocale('quickEdit.editor');
            }
        },

        $applyProjectToControls: function (Elm) {
            const Project = this.$getEffectiveProject();

            if (!Elm || !Project) {
                return;
            }

            const controls = QUI.Controls.getControlsInElement(Elm);

            controls.each(function (Control) {
                if (Control === this) {
                    return;
                }

                if ('setProject' in Control) {
                    Control.setProject(Project);
                }
            }.bind(this));
        },

        $getEffectiveProject: function () {
            if (this.$Project && typeof this.$Project.getName === 'function') {
                return this.$Project;
            }

            if (this.$layoutControl && typeof this.$layoutControl.getProject === 'function') {
                const ContextProject = this.$layoutControl.getProject();

                if (ContextProject && typeof ContextProject.getName === 'function') {
                    return ContextProject;
                }
            }

            return null;
        },

        $getProjectName: function () {
            const Project = this.$getEffectiveProject();

            return Project ? Project.getName() : '';
        },

        $getProjectLang: function () {
            const Project = this.$getEffectiveProject();

            return Project && typeof Project.getLang === 'function' ? Project.getLang() : '';
        },

        $getLocale: function (name, data) {
            return QUILocale.get(lg, localePrefix + name, data);
        },

        $normalizeAllowedModes: function (allowedModes) {
            if (typeOf(allowedModes) !== 'array') {
                return DEFAULT_ALLOWED_MODES.slice();
            }

            const modes = [];

            allowedModes.forEach(function (mode) {
                if (AVAILABLE_MODES.indexOf(mode) === -1 || modes.indexOf(mode) !== -1) {
                    return;
                }

                modes.push(mode);
            });

            return modes.length ? modes : DEFAULT_ALLOWED_MODES.slice();
        },

        $normalizeSettingsVisibility: function (settingsVisibility) {
            const visibility = Object.append({}, DEFAULT_SETTINGS_VISIBILITY);

            if (typeOf(settingsVisibility) !== 'object') {
                return visibility;
            }

            Object.keys(DEFAULT_SETTINGS_VISIBILITY).forEach(function (key) {
                if (key in settingsVisibility) {
                    visibility[key] = settingsVisibility[key] !== false;
                }
            });

            return visibility;
        },

        $normalizeMode: function (mode) {
            if (this.$fixedMode) {
                return this.$fixedMode;
            }

            return this.$allowedModes.indexOf(mode) !== -1
                ? mode
                : this.$allowedModes[0];
        },

        $normalizeFixedMode: function (mode) {
            return this.$allowedModes.indexOf(mode) !== -1 ? mode : '';
        },

        $normalizeInteractionMode: function (mode) {
            return mode === INTERACTION_LAYOUT
                ? INTERACTION_LAYOUT
                : INTERACTION_CONTENT;
        },

        $isSettingVisible: function (name) {
            return this.$settingsVisibility[name] !== false;
        },

        $getActiveMode: function (area) {
            area = typeOf(area) === 'object' ? area : {};

            return this.$normalizeMode(area.mode);
        },

        $ensureAreaMode: function () {
            this.$area.mode = this.$getActiveMode(this.$area);
        },

        $shouldShowModeField: function () {
            return !this.$fixedMode && this.$allowModeSwitch && this.$allowedModes.length > 1;
        },

        $getModeOptions: function () {
            return this.$allowedModes.map(function (mode) {
                return {
                    value: mode,
                    text: this.$getModeLabel(mode)
                };
            }.bind(this));
        },

        $normalizeProject: function (Project) {
            if (Project && typeof Project.getName === 'function') {
                return Project;
            }

            return null;
        }
    });
});
